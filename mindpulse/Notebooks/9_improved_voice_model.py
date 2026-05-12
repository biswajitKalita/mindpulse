"""
MindPulse — Improved Voice Emotion Model v2.0 (CNN-BiLSTM Hybrid)
===================================================================
Improvements over v1 (plain CNN on Mel spectrograms):

1. RICHER AUDIO FEATURES
   - Mel spectrogram (64 bands)         ← same as v1
   - MFCC (40 coefficients + delta + delta-delta)
   - Spectral contrast (7 bands)
   - Chroma STFT (12 bins)
   → Multi-branch input gives the model both timbral + tonal info

2. CNN-BiLSTM ARCHITECTURE
   - CNN extracts local spectro-temporal patterns
   - BiLSTM captures long-range temporal dynamics (prosody, intonation)
   - Self-attention head over LSTM outputs (focus on key moments)
   → Significantly better than pure CNN for speech emotion

3. IMPROVED AUGMENTATION
   - SpecAugment (time + freq masking)   ← same as v1
   - Gaussian noise                      ← same as v1
   - Time stretching simulation (roll frames)
   - Amplitude jitter

4. BETTER TRAINING
   - Cosine annealing LR scheduler with warm restarts
   - Label smoothing 0.15
   - Mixup augmentation (α=0.2)
   - Gradient clipping

5. TEST-TIME AUGMENTATION (TTA)
   - Average predictions over 5 augmented versions at inference

Expected accuracy: 88–94% (up from 85–92%)

Run from: C:/Users/ashik/OneDrive/Desktop/mindpulse_backend
  python mindpulse/Notebooks/9_improved_voice_model.py
"""

import os, warnings, threading
import numpy as np
import joblib
import librosa
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder
from collections import Counter

warnings.filterwarnings("ignore")
torch.manual_seed(42)
np.random.seed(42)

DATASET_PATH = "mindpulse/Data/Voice_data"
MODELS_PATH  = "mindpulse/Models"
os.makedirs(MODELS_PATH, exist_ok=True)

# Audio settings
SR        = 22050
DURATION  = 4
N_MELS    = 64
N_MFCC    = 40
HOP       = 512
N_FFT     = 2048
FIXED_LEN = int(SR * DURATION / HOP) + 1  # ~173 frames
TIMEOUT_S = 15

FOLDER_MAP = {
    "angry":   "anger",
    "Disgust": "sadness",
    "Fear":    "anxiety",
    "Sad":     "sadness",
    "happy":   "joy",
    "neutral": "calm",
    "surprise":"joy",
}
CLASSES   = sorted(set(FOLDER_MAP.values()))
N_CLASSES = len(CLASSES)
label_enc = LabelEncoder().fit(CLASSES)

print("=" * 65)
print("  MindPulse — Voice CNN-BiLSTM v2.0 (Multi-Feature)")
print("=" * 65)


# =============================================================================
# MULTI-FEATURE EXTRACTION
# =============================================================================
def _extract_all_features(path):
    y, sr = librosa.load(path, sr=SR, duration=DURATION, mono=True)
    target = SR * DURATION
    if len(y) < SR * 0.3:
        return None
    y = np.pad(y, (0, max(0, target - len(y))))[:target]

    def pad_or_crop(arr):
        if arr.shape[1] < FIXED_LEN:
            return np.pad(arr, ((0,0),(0, FIXED_LEN - arr.shape[1])))
        return arr[:, :FIXED_LEN]

    # 1. Mel spectrogram
    mel = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=N_FFT,
                                          hop_length=HOP, n_mels=N_MELS, fmax=8000)
    mel_db = librosa.power_to_db(mel, ref=np.max).astype(np.float32)
    mel_db = pad_or_crop(mel_db)  # (64, T)

    # 2. MFCC + delta + delta-delta (40 coeffs × 3 = 120 rows)
    mfcc    = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP)
    d_mfcc  = librosa.feature.delta(mfcc)
    dd_mfcc = librosa.feature.delta(mfcc, order=2)
    mfcc_all = np.vstack([mfcc, d_mfcc, dd_mfcc]).astype(np.float32)  # (120, T)
    mfcc_all = pad_or_crop(mfcc_all)

    # 3. Spectral contrast (7 bands)
    contrast = librosa.feature.spectral_contrast(y=y, sr=SR, n_fft=N_FFT, hop_length=HOP)
    contrast = contrast.astype(np.float32)
    contrast = pad_or_crop(contrast)  # (7, T)

    # 4. Chroma STFT (12 bins)
    chroma = librosa.feature.chroma_stft(y=y, sr=SR, n_fft=N_FFT, hop_length=HOP)
    chroma = chroma.astype(np.float32)
    chroma = pad_or_crop(chroma)  # (12, T)

    # Stack all: (64+120+7+12, T) = (203, T)
    combined = np.vstack([mel_db, mfcc_all, contrast, chroma])
    return combined  # (203, FIXED_LEN)


def extract_features(path):
    result = [None]
    def _run():
        try:
            result[0] = _extract_all_features(path)
        except Exception:
            pass
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=TIMEOUT_S)
    return result[0]


N_FEATURES = N_MELS + N_MFCC * 3 + 7 + 12  # 203


# =============================================================================
# LOAD + CACHE ALL FEATURES
# =============================================================================
print("\n[1/6] Extracting multi-features (Mel + MFCC + Contrast + Chroma)...")
print("      (This takes ~20-30 min on CPU — one-time computation)")

all_feats, all_labels = [], []
skipped = 0

for folder in sorted(os.listdir(DATASET_PATH)):
    fp = os.path.join(DATASET_PATH, folder)
    if not os.path.isdir(fp): continue
    label = FOLDER_MAP.get(folder)
    if not label: continue
    enc = label_enc.transform([label])[0]
    files = [f for f in os.listdir(fp) if f.lower().endswith(".wav")]
    print(f"   {folder:12s} -> {label:10s} | {len(files)} files")
    for i, f in enumerate(files):
        feat = extract_features(os.path.join(fp, f))
        if feat is not None:
            all_feats.append(feat)
            all_labels.append(enc)
        else:
            skipped += 1
        if (i+1) % 300 == 0:
            print(f"      ... {i+1}/{len(files)} ({len(all_feats)} loaded)")

X = np.stack(all_feats)   # (N, 203, T)
y = np.array(all_labels)
print(f"\n   Loaded: {len(X)} | Skipped: {skipped}")
print(f"   Feature shape: {X.shape}")

# Global normalisation
X_mean = X.mean(axis=(0,2), keepdims=True)
X_std  = X.std(axis=(0,2), keepdims=True) + 1e-6
X = (X - X_mean) / X_std

print("\n   Label distribution:")
for u, c in zip(*np.unique(y, return_counts=True)):
    print(f"     {CLASSES[u]:10s}: {c:5d} ({c/len(y)*100:.1f}%)")


# =============================================================================
# SPLIT
# =============================================================================
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)
X_tr, X_va, y_tr, y_va = train_test_split(X_tr, y_tr, test_size=0.12, random_state=42, stratify=y_tr)
print(f"\n   Train:{len(X_tr)} | Val:{len(X_va)} | Test:{len(X_te)}")


# =============================================================================
# DATASET WITH AUGMENTATION
# =============================================================================
class MultiFeatureDataset(Dataset):
    def __init__(self, X, y, augment=False):
        self.X = torch.FloatTensor(X).unsqueeze(1)   # (N,1,F,T)
        self.y = torch.LongTensor(y)
        self.augment = augment

    def __len__(self): return len(self.y)

    def __getitem__(self, idx):
        x = self.X[idx].clone()
        if self.augment:
            T = x.shape[-1]
            F = x.shape[-2]

            # SpecAugment — time masking
            t0 = np.random.randint(0, max(1, T-30))
            x[:, :, t0:t0+np.random.randint(5, 25)] = 0

            # SpecAugment — freq masking
            f0 = np.random.randint(0, max(1, F-20))
            x[:, f0:f0+np.random.randint(5, 20), :] = 0

            # Time roll (simulate speed variation)
            if np.random.rand() < 0.4:
                shift = np.random.randint(-20, 20)
                x = torch.roll(x, shifts=shift, dims=-1)

            # Amplitude jitter
            x *= (0.85 + np.random.rand() * 0.30)

            # Gaussian noise
            if np.random.rand() < 0.4:
                x += torch.randn_like(x) * 0.04

        return x, self.y[idx]


# Weighted sampler for class balance
cnt = Counter(y_tr.tolist())
w   = [1.0/cnt[int(yi)] for yi in y_tr]
sampler = WeightedRandomSampler(w, num_samples=len(w), replacement=True)

BATCH = 48
tr_dl = DataLoader(MultiFeatureDataset(X_tr, y_tr, augment=True),
                   batch_size=BATCH, sampler=sampler, num_workers=0)
va_dl = DataLoader(MultiFeatureDataset(X_va, y_va, augment=False),
                   batch_size=BATCH, shuffle=False, num_workers=0)
te_dl = DataLoader(MultiFeatureDataset(X_te, y_te, augment=False),
                   batch_size=BATCH, shuffle=False, num_workers=0)


# =============================================================================
# CNN-BiLSTM WITH SELF-ATTENTION MODEL
# =============================================================================
class ConvBlock(nn.Module):
    """Residual CNN block."""
    def __init__(self, in_c, out_c, pool=(2,2)):
        super().__init__()
        self.net  = nn.Sequential(
            nn.Conv2d(in_c, out_c, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_c), nn.GELU(),
            nn.Conv2d(out_c, out_c, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_c), nn.GELU(),
            nn.MaxPool2d(pool),
            nn.Dropout2d(0.15),
        )
        self.skip = nn.Sequential(
            nn.Conv2d(in_c, out_c, 1, bias=False),
            nn.MaxPool2d(pool),
        )
    def forward(self, x): return self.net(x) + self.skip(x)


class SelfAttention(nn.Module):
    """Temporal self-attention over LSTM outputs."""
    def __init__(self, hidden_size):
        super().__init__()
        self.attn = nn.Linear(hidden_size * 2, 1)

    def forward(self, lstm_out):  # (B, T, hidden*2)
        scores  = self.attn(lstm_out).squeeze(-1)   # (B, T)
        weights = F.softmax(scores, dim=-1)          # (B, T)
        context = (lstm_out * weights.unsqueeze(-1)).sum(dim=1)  # (B, hidden*2)
        return context


class EmotionCNNBiLSTM(nn.Module):
    def __init__(self, n_features=N_FEATURES, n_cls=N_CLASSES):
        super().__init__()
        # CNN feature extractor
        self.cnn = nn.Sequential(
            ConvBlock(1,   32, (2,2)),
            ConvBlock(32,  64, (2,2)),
            ConvBlock(64, 128, (2,2)),
            ConvBlock(128,256, (2,2)),
        )
        # Compute CNN output size dynamically
        dummy = torch.zeros(1, 1, n_features, FIXED_LEN)
        with torch.no_grad():
            out = self.cnn(dummy)  # (1, 256, F', T')
        self.cnn_freq = out.shape[2]
        self.cnn_time = out.shape[3]
        lstm_input = 256 * self.cnn_freq   # flatten freq dimension

        # BiLSTM over time
        self.bilstm = nn.LSTM(
            input_size=lstm_input,
            hidden_size=256,
            num_layers=2,
            bidirectional=True,
            dropout=0.3,
            batch_first=True,
        )
        # Self-attention
        self.attention = SelfAttention(256)

        # Classifier head
        self.head = nn.Sequential(
            nn.Linear(512, 256),
            nn.GELU(),
            nn.Dropout(0.4),
            nn.Linear(256, 128),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(128, n_cls),
        )

    def forward(self, x):
        # x: (B,1,F,T)
        cnn_out = self.cnn(x)             # (B,256,F',T')
        B, C, F, T = cnn_out.shape
        # Reshape for LSTM: (B, T, C*F)
        seq = cnn_out.permute(0,3,1,2).reshape(B, T, C*F)
        lstm_out, _ = self.bilstm(seq)    # (B, T, 512)
        context = self.attention(lstm_out) # (B, 512)
        return self.head(context)


# =============================================================================
# MIXUP AUGMENTATION
# =============================================================================
def mixup_batch(x, y, alpha=0.2, n_classes=N_CLASSES):
    """Returns mixed inputs, mixed one-hot targets."""
    lam = np.random.beta(alpha, alpha) if alpha > 0 else 1.0
    idx = torch.randperm(x.size(0))
    x_mix = lam * x + (1 - lam) * x[idx]
    y_a = F.one_hot(y, n_classes).float()
    y_b = F.one_hot(y[idx], n_classes).float()
    y_mix = lam * y_a + (1 - lam) * y_b
    return x_mix, y_mix


# =============================================================================
# TRAINING
# =============================================================================
device = torch.device("cpu")
print(f"\n[2/6] Training CNN-BiLSTM on {device}")

model = EmotionCNNBiLSTM().to(device)
params = sum(p.numel() for p in model.parameters())
print(f"   Parameters: {params:,}")

cw = torch.FloatTensor([1.0/cnt.get(i,1) for i in range(N_CLASSES)])
cw = cw / cw.sum() * N_CLASSES

criterion_hard = nn.CrossEntropyLoss(weight=cw.to(device), label_smoothing=0.15)
criterion_soft = nn.KLDivLoss(reduction="batchmean")

optimizer = optim.AdamW(model.parameters(), lr=3e-4, weight_decay=2e-4)

EPOCHS  = 60
sched   = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=20, T_mult=2)

best_val, best_ep, no_imp = 0.0, 0, 0
PATIENCE = 12
ckpt = f"{MODELS_PATH}/voice_cnn_bilstm_best.pt"

print(f"\n   {'Ep':>3} | {'TrLoss':>7} | {'TrAcc':>6} | {'VaAcc':>6} | {'LR':>8}")
print("   " + "-"*42)

for ep in range(1, EPOCHS+1):
    model.train()
    tl, tc, tt = 0.0, 0, 0

    for xb, yb in tr_dl:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()

        # Mixup with 50% probability
        if np.random.rand() < 0.5:
            xb_mix, yb_mix = mixup_batch(xb, yb)
            out  = F.log_softmax(model(xb_mix), dim=-1)
            loss = criterion_soft(out, yb_mix)
        else:
            out  = model(xb)
            loss = criterion_hard(out, yb)

        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        sched.step(ep - 1 + tt / max(len(tr_dl), 1))

        with torch.no_grad():
            preds = F.log_softmax(model(xb), dim=-1).argmax(1) if xb.requires_grad else out.argmax(1)

        tl += loss.item() * xb.size(0)
        tc += (model(xb).argmax(1) == yb).sum().item()
        tt += xb.size(0)

    model.eval()
    vc, vt = 0, 0
    with torch.no_grad():
        for xb, yb in va_dl:
            xb, yb = xb.to(device), yb.to(device)
            vc += (model(xb).argmax(1) == yb).sum().item()
            vt += xb.size(0)

    tr_acc = tc / tt
    va_acc = vc / vt
    lr_now = optimizer.param_groups[0]["lr"]
    print(f"   {ep:3d} | {tl/tt:7.4f} | {tr_acc*100:5.1f}% | {va_acc*100:5.1f}% | {lr_now:.2e}",
          flush=True)

    if va_acc > best_val:
        best_val = va_acc
        best_ep  = ep
        no_imp   = 0
        torch.save(model.state_dict(), ckpt)
    else:
        no_imp += 1
        if no_imp >= PATIENCE:
            print(f"\n   Early stop @ ep{ep} — best: ep{best_ep} ({best_val*100:.1f}%)")
            break


# =============================================================================
# TEST EVALUATION + TEST-TIME AUGMENTATION (TTA)
# =============================================================================
print(f"\n[3/6] Test evaluation with TTA (5 passes)...")
model.load_state_dict(torch.load(ckpt, weights_only=True))
model.eval()

# TTA: average softmax over 5 augmented versions
TTA_RUNS = 5
all_probs, trues = [], []

for run in range(TTA_RUNS):
    run_probs = []
    run_trues = []
    aug = MultiFeatureDataset(X_te, y_te, augment=(run > 0))
    tta_dl = DataLoader(aug, batch_size=BATCH, shuffle=False, num_workers=0)
    with torch.no_grad():
        for xb, yb in tta_dl:
            prob = F.softmax(model(xb.to(device)), dim=-1).cpu().numpy()
            run_probs.extend(prob)
            if run == 0:
                run_trues.extend(yb.numpy())
    all_probs.append(np.array(run_probs))
    if run == 0:
        trues = run_trues

avg_probs = np.mean(np.stack(all_probs), axis=0)
preds = avg_probs.argmax(axis=1)

test_acc = accuracy_score(trues, preds)
print(f"\n   *** TEST ACCURACY (TTA): {test_acc*100:.1f}% ***")
print(classification_report(trues, preds, target_names=CLASSES))
print(confusion_matrix(trues, preds))


# =============================================================================
# SAVE
# =============================================================================
print("\n[4/6] Saving...")
save_dict = {
    "model_state":    model.state_dict(),
    "classes":        CLASSES,
    "label_enc":      label_enc,
    "n_mels":         N_MELS,
    "n_mfcc":         N_MFCC,
    "n_features":     N_FEATURES,
    "hop":            HOP,
    "n_fft":          N_FFT,
    "sr":             SR,
    "duration":       DURATION,
    "fixed_len":      FIXED_LEN,
    "x_mean":         X_mean.tolist(),
    "x_std":          X_std.tolist(),
    "test_accuracy":  round(test_acc * 100, 1),
    "version":        "v2_cnn_bilstm",
}
torch.save(save_dict, f"{MODELS_PATH}/voice_cnn_bilstm_model.pt")
# Also save as the main voice model (replaces v1)
torch.save(save_dict, f"{MODELS_PATH}/voice_cnn_model.pt")

joblib.dump({"version":"v2_cnn_bilstm","n_features":N_FEATURES},
            f"{MODELS_PATH}/voice_meta.pkl")

print(f"\n=== COMPLETE ===")
print(f"   Test Accuracy (TTA): {test_acc*100:.1f}%")
print(f"   Best Val Accuracy  : {best_val*100:.1f}% (epoch {best_ep})")
print(f"   Model saved        : voice_cnn_model.pt (replaces v1)")
print(f"\n   IMPORTANT: The backend voice_predictor.py needs updating")
print(f"   to use multi-feature extraction (Mel + MFCC + Contrast + Chroma).")
print(f"   See mindpulse/Notebooks/9_backend_update_guide.txt")
