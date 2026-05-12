"""
MindPulse — Voice Emotion Training v4.1 (CNN + Pre-Cached Mel Spectrograms)
=============================================================================
Key optimization: Pre-compute ALL mel spectrograms once into RAM, then
train fast from memory. Eliminates repeated librosa I/O per epoch.

Expected training time on CPU: ~60-90 minutes total
Expected accuracy: 85-92%
"""

import os, warnings, threading
import numpy as np
import joblib
import librosa
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
from collections import Counter

warnings.filterwarnings("ignore")
torch.manual_seed(42)
np.random.seed(42)

DATASET_PATH = "mindpulse/Data/Voice_data"
MODELS_PATH  = "mindpulse/Models"
os.makedirs(MODELS_PATH, exist_ok=True)

SR        = 22050
DURATION  = 4
N_MELS    = 64        # reduced from 128 — faster, still good quality
HOP       = 512
N_FFT     = 2048
FIXED_LEN = int(SR * DURATION / HOP) + 1   # ~173 frames

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

TIMEOUT_S = 15   # skip files taking longer than 15s


# =============================================================================
# EXTRACT MEL (with timeout)
# =============================================================================
def _mel_core(path):
    y, sr = librosa.load(path, sr=SR, duration=DURATION, mono=True)
    target = SR * DURATION
    if len(y) < SR * 0.3:
        return None
    y = np.pad(y, (0, max(0, target - len(y))))[:target]
    mel    = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=N_FFT,
                                             hop_length=HOP, n_mels=N_MELS, fmax=8000)
    mel_db = librosa.power_to_db(mel, ref=np.max).astype(np.float32)
    if mel_db.shape[1] < FIXED_LEN:
        mel_db = np.pad(mel_db, ((0,0),(0, FIXED_LEN - mel_db.shape[1])))
    else:
        mel_db = mel_db[:, :FIXED_LEN]
    return mel_db   # (N_MELS, FIXED_LEN)


def extract_mel(path):
    result = [None]
    def _run():
        try:
            result[0] = _mel_core(path)
        except Exception:
            pass
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=TIMEOUT_S)
    return result[0]


# =============================================================================
# PRE-COMPUTE ALL SPECTROGRAMS  (once, into RAM)
# =============================================================================
print("="*64)
print("  MindPulse — Voice CNN v4.1 (Pre-Cached Mel + Deep CNN)")
print("="*64)
print("\n[1/5] Pre-computing mel spectrograms (one-time, ~15 min)...")

all_mels, all_labels = [], []
skipped = 0

for folder in sorted(os.listdir(DATASET_PATH)):
    fp = os.path.join(DATASET_PATH, folder)
    if not os.path.isdir(fp): continue
    label = FOLDER_MAP.get(folder)
    if not label: continue
    enc_label = label_enc.transform([label])[0]
    files = [f for f in os.listdir(fp) if f.lower().endswith(".wav")]
    print(f"   {folder:12s} -> {label:10s} | {len(files)} files", flush=True)
    for i, f in enumerate(files):
        mel = extract_mel(os.path.join(fp, f))
        if mel is not None:
            all_mels.append(mel)
            all_labels.append(enc_label)
        else:
            skipped += 1
        if (i+1) % 300 == 0:
            print(f"      ... {i+1}/{len(files)} ({len(all_mels)} loaded)", flush=True)

print(f"\n   Loaded: {len(all_mels)} | Skipped: {skipped}", flush=True)

# Stack into arrays
X = np.stack(all_mels, axis=0)   # (N, N_MELS, FIXED_LEN)
y = np.array(all_labels)

# Normalize globally
X_mean = X.mean()
X_std  = X.std() + 1e-6
X = (X - X_mean) / X_std
print(f"   Spectrogram shape: {X.shape}  mean={X_mean:.2f}  std={X_std:.2f}")

print("   Label distribution:")
unique, counts = np.unique(y, return_counts=True)
for u, c in zip(unique, counts):
    print(f"     {CLASSES[u]:10s}: {c:5d} ({c/len(y)*100:.1f}%)")


# =============================================================================
# SPLIT
# =============================================================================
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.15,
                                            random_state=42, stratify=y)
X_tr, X_va, y_tr, y_va = train_test_split(X_tr, y_tr, test_size=0.12,
                                            random_state=42, stratify=y_tr)
print(f"\n   Train:{len(X_tr)} | Val:{len(X_va)} | Test:{len(X_te)}")


# =============================================================================
# DATASET  (in-memory, augmentation on tensor)
# =============================================================================
class CachedDataset(Dataset):
    def __init__(self, X, y, augment=False):
        self.X = torch.FloatTensor(X).unsqueeze(1)   # (N,1,F,T)
        self.y = torch.LongTensor(y)
        self.augment = augment

    def __len__(self): return len(self.y)

    def __getitem__(self, idx):
        x = self.X[idx].clone()
        if self.augment:
            # Time masking (SpecAugment)
            t = x.shape[-1]
            t0 = np.random.randint(0, max(1, t-20))
            x[:, :, t0:t0+np.random.randint(5,20)] = 0
            # Freq masking
            f = x.shape[-2]
            f0 = np.random.randint(0, max(1, f-10))
            x[:, f0:f0+np.random.randint(3,10), :] = 0
            # Gaussian noise
            if np.random.rand() < 0.3:
                x += torch.randn_like(x) * 0.05
        return x, self.y[idx]


# Weighted sampler
cnt = Counter(y_tr.tolist())
w   = [1.0/cnt[int(yi)] for yi in y_tr]
sampler = WeightedRandomSampler(w, num_samples=len(w), replacement=True)

BATCH = 64
tr_dl = DataLoader(CachedDataset(X_tr, y_tr, augment=True),
                   batch_size=BATCH, sampler=sampler, num_workers=0)
va_dl = DataLoader(CachedDataset(X_va, y_va, augment=False),
                   batch_size=BATCH, shuffle=False, num_workers=0)
te_dl = DataLoader(CachedDataset(X_te, y_te, augment=False),
                   batch_size=BATCH, shuffle=False, num_workers=0)


# =============================================================================
# MODEL  (efficient CNN for CPU)
# =============================================================================
class ConvBlock(nn.Module):
    def __init__(self, in_c, out_c, pool=(2,2)):
        super().__init__()
        self.net  = nn.Sequential(
            nn.Conv2d(in_c, out_c, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_c), nn.ELU(),
            nn.Conv2d(out_c, out_c, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_c), nn.ELU(),
            nn.MaxPool2d(pool), nn.Dropout2d(0.2),
        )
        self.skip = nn.Sequential(nn.Conv2d(in_c, out_c, 1, bias=False),
                                   nn.MaxPool2d(pool))
    def forward(self, x):
        return self.net(x) + self.skip(x)


class EmotionCNN(nn.Module):
    def __init__(self, n_cls=N_CLASSES):
        super().__init__()
        self.enc = nn.Sequential(
            ConvBlock(1,  32, (2,2)),
            ConvBlock(32, 64, (2,2)),
            ConvBlock(64,128, (2,2)),
            ConvBlock(128,256,(2,2)),
            nn.AdaptiveAvgPool2d((1,1)),
        )
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256), nn.ELU(), nn.Dropout(0.4),
            nn.Linear(256, n_cls)
        )
    def forward(self, x): return self.head(self.enc(x))


# =============================================================================
# TRAIN
# =============================================================================
device = torch.device("cpu")
print(f"\n[2/5] Training CNN on {device}")

model = EmotionCNN().to(device)
print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")

# Class-weighted loss
cw = torch.FloatTensor([1.0/cnt.get(i,1) for i in range(N_CLASSES)])
cw = cw / cw.sum() * N_CLASSES
criterion = nn.CrossEntropyLoss(weight=cw.to(device), label_smoothing=0.1)
optimizer = optim.AdamW(model.parameters(), lr=5e-4, weight_decay=1e-4)

EPOCHS  = 50
sched   = optim.lr_scheduler.OneCycleLR(
    optimizer, max_lr=5e-4,
    steps_per_epoch=len(tr_dl), epochs=EPOCHS, pct_start=0.15)

best_val = 0.0
best_ep  = 0
patience = 10
no_imp   = 0
ckpt_path = f"{MODELS_PATH}/voice_cnn_best.pt"

print(f"   {'Ep':>3} | {'TrLoss':>7} | {'TrAcc':>6} | {'VaAcc':>6}")
print("   " + "-"*32)

for ep in range(1, EPOCHS+1):
    model.train()
    tl, tc, tt = 0, 0, 0
    for xb, yb in tr_dl:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()
        out  = model(xb)
        loss = criterion(out, yb)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        sched.step()
        tl += loss.item() * xb.size(0)
        tc += (out.argmax(1)==yb).sum().item()
        tt += xb.size(0)

    model.eval()
    vc, vt = 0, 0
    with torch.no_grad():
        for xb, yb in va_dl:
            xb, yb = xb.to(device), yb.to(device)
            vc += (model(xb).argmax(1)==yb).sum().item()
            vt += xb.size(0)

    tr_acc = tc/tt
    va_acc = vc/vt
    print(f"   {ep:3d} | {tl/tt:7.4f} | {tr_acc*100:5.1f}% | {va_acc*100:5.1f}%", flush=True)

    if va_acc > best_val:
        best_val = va_acc
        best_ep  = ep
        no_imp   = 0
        torch.save(model.state_dict(), ckpt_path)
    else:
        no_imp += 1
        if no_imp >= patience:
            print(f"\n   Early stop @ ep{ep} — best was ep{best_ep}: {best_val*100:.1f}%")
            break


# =============================================================================
# TEST
# =============================================================================
print(f"\n[3/5] Test evaluation (best model from epoch {best_ep})...")
model.load_state_dict(torch.load(ckpt_path, weights_only=True))
model.eval()
preds, trues = [], []
with torch.no_grad():
    for xb, yb in te_dl:
        preds.extend(model(xb.to(device)).argmax(1).cpu().numpy())
        trues.extend(yb.numpy())

test_acc = np.mean(np.array(preds)==np.array(trues))
print(f"\n   *** TEST ACCURACY: {test_acc*100:.1f}% ***")
print(classification_report(trues, preds, target_names=CLASSES))
print(confusion_matrix(trues, preds))


# =============================================================================
# SAVE
# =============================================================================
print("\n[4/5] Saving...")
torch.save({
    "model_state": model.state_dict(),
    "classes":     CLASSES,
    "label_enc":   label_enc,
    "n_mels":      N_MELS,
    "hop":         HOP,
    "n_fft":       N_FFT,
    "sr":          SR,
    "duration":    DURATION,
    "fixed_len":   FIXED_LEN,
    "x_mean":      float(X_mean),
    "x_std":       float(X_std),
    "version":     "v4_cnn",
}, f"{MODELS_PATH}/voice_cnn_model.pt")

joblib.dump({"version":"v4_cnn","n_features":0},
            f"{MODELS_PATH}/voice_meta.pkl")

print(f"\n=== COMPLETE ===")
print(f"   Test Accuracy : {test_acc*100:.1f}%")
print(f"   Best Val Acc  : {best_val*100:.1f}% (epoch {best_ep})")
print(f"   Restart: python -m uvicorn main:app --reload --port 8000")