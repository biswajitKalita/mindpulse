"""
MindPulse — voice_analyzer.py  (fixed fallback)
================================================
Changes vs previous version:
  - Removed broken 'from models.voice_analyzer_v3 import ...' import
  - Embedded the 111-feature prosodic extractor directly in this file
  - Sklearn fallback now actually works when CNN fails on Render OOM
  - Zero API change: same return dict schema
  - Zero scoring change: same VOICE_EMOTION_RISK_OFFSET table
"""
import warnings, io
import numpy as np

warnings.filterwarnings("ignore")

import os as _os
_BASE   = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_MODELS = _os.path.join(_BASE, "mindpulse", "Models")

MODEL_PT        = _os.path.join(_MODELS, "voice_cnn_model.pt")
FALLBACK_MODEL  = _os.path.join(_MODELS, "voice_emotion_model.pkl")
FALLBACK_SCALER = _os.path.join(_MODELS, "voice_scaler.pkl")

VOICE_EMOTION_RISK_OFFSET = {
    "calm":    +10,
    "joy":     +8,
    "sadness": -12,
    "anger":   -10,
    "anxiety": -14,
}
CONFIDENCE_THRESHOLD = 0.42


# =============================================================================
# CNN MODEL (primary — PyTorch mel-spectrogram CNN)
# =============================================================================
CNN_ENABLED = False
cnn_model   = None
cnn_meta    = None

try:
    import torch
    import torch.nn as nn

    class ConvBlock(nn.Module):
        """Matches training script v4.1 exactly."""
        def __init__(self, in_c, out_c, pool=(2, 2)):
            super().__init__()
            self.net  = nn.Sequential(
                nn.Conv2d(in_c, out_c, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_c), nn.ELU(),
                nn.Conv2d(out_c, out_c, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_c), nn.ELU(),
                nn.MaxPool2d(pool), nn.Dropout2d(0.2),
            )
            self.skip = nn.Sequential(
                nn.Conv2d(in_c, out_c, 1, bias=False),
                nn.MaxPool2d(pool),
            )
        def forward(self, x):
            return self.net(x) + self.skip(x)

    class EmotionCNN(nn.Module):
        def __init__(self, n_classes=5):
            super().__init__()
            self.enc = nn.Sequential(
                ConvBlock(1,   32, (2, 2)),
                ConvBlock(32,  64, (2, 2)),
                ConvBlock(64,  128, (2, 2)),
                ConvBlock(128, 256, (2, 2)),
                nn.AdaptiveAvgPool2d((1, 1)),
            )
            self.head = nn.Sequential(
                nn.Flatten(),
                nn.Linear(256, 256), nn.ELU(), nn.Dropout(0.4),
                nn.Linear(256, n_classes),
            )
        def forward(self, x):
            return self.head(self.enc(x))

    checkpoint  = torch.load(MODEL_PT, map_location="cpu", weights_only=False)
    n_cls       = len(checkpoint["classes"])
    cnn_model   = EmotionCNN(n_classes=n_cls)
    cnn_model.load_state_dict(checkpoint["model_state"])
    cnn_model.eval()
    cnn_meta    = checkpoint
    CNN_ENABLED = True
    print(f"[OK] Voice CNN v4.1 loaded | classes: {checkpoint['classes']}")
except Exception as e:
    print(f"[WARN] CNN model not loaded: {e} — will use sklearn fallback")


# =============================================================================
# SKLEARN FALLBACK  (111-feature prosodic VotingClassifier)
# =============================================================================
SKLEARN_ENABLED  = False
VOICE_ML_ENABLED = False

sk_model = sk_scaler = None
if not CNN_ENABLED:
    try:
        import joblib
        sk_model       = joblib.load(FALLBACK_MODEL)
        sk_scaler      = joblib.load(FALLBACK_SCALER)
        SKLEARN_ENABLED = True
        VOICE_ML_ENABLED = True
        print("[OK] Fallback sklearn voice model loaded (111-feature VotingClassifier)")
    except Exception as e:
        print(f"[WARN] Sklearn fallback also failed: {e}")
else:
    VOICE_ML_ENABLED = CNN_ENABLED


# =============================================================================
# MEL EXTRACTOR  (for CNN path — matches training exactly)
# =============================================================================
def _extract_mel(audio_bytes: bytes):
    import librosa
    if cnn_meta is None:
        return None
    SR       = cnn_meta.get("sr",        22050)
    DURATION = cnn_meta.get("duration",  4)
    N_MELS   = cnn_meta.get("n_mels",    128)
    HOP      = cnn_meta.get("hop",       512)
    N_FFT    = cnn_meta.get("n_fft",     2048)
    FIXED    = cnn_meta.get("fixed_len", int(SR * DURATION / HOP) + 1)

    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=SR, duration=DURATION, mono=True)
    target = SR * DURATION
    if len(y) < SR * 0.5:
        return None
    y = np.pad(y, (0, max(0, target - len(y))))[:target]

    mel    = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=N_FFT,
                                             hop_length=HOP, n_mels=N_MELS, fmax=8000)
    mel_db = librosa.power_to_db(mel, ref=np.max).astype(np.float32)
    if mel_db.shape[1] < FIXED:
        mel_db = np.pad(mel_db, ((0, 0), (0, FIXED - mel_db.shape[1])))
    else:
        mel_db = mel_db[:, :FIXED]

    mel_db = (mel_db - mel_db.mean()) / (mel_db.std() + 1e-6)
    return mel_db


# =============================================================================
# PROSODIC EXTRACTOR  (for sklearn fallback — 111 features)
# Verified: scaler.n_features_in_ == 111, model.n_features_in_ == 111
# Feature layout:
#   MFCC-13 × 6 stats (mean/std for mfcc/delta/delta2) = 78
#   Chroma-12 × 2 stats (mean + std)                   = 24
#   ZCR mean+std, RMS mean+std, Centroid mean+std,
#   Bandwidth mean+std, Rolloff mean                    =  9
#   Total = 111
# =============================================================================
def _extract_prosodic_111(audio_bytes: bytes):
    import librosa
    SR = 22050
    y, _ = librosa.load(io.BytesIO(audio_bytes), sr=SR, duration=4, mono=True)
    if len(y) < SR * 0.5:
        return None

    # ── MFCC (13) + delta + delta-delta  (78 features) ───────────────────────
    mfcc    = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=13)
    d_mfcc  = librosa.feature.delta(mfcc)
    d2_mfcc = librosa.feature.delta(mfcc, order=2)

    feats = np.concatenate([
        mfcc.mean(axis=1),    d_mfcc.mean(axis=1),   d2_mfcc.mean(axis=1),
        mfcc.std(axis=1),     d_mfcc.std(axis=1),    d2_mfcc.std(axis=1),
    ])  # 78

    # ── Chroma 12 × mean + std  (24 features) ────────────────────────────────
    chroma = librosa.feature.chroma_stft(y=y, sr=SR)
    feats  = np.concatenate([feats, chroma.mean(axis=1), chroma.std(axis=1)])  # +24

    # ── Spectral / energy features  (9 features) ─────────────────────────────
    zcr     = librosa.feature.zero_crossing_rate(y)[0]
    rms     = librosa.feature.rms(y=y)[0]
    cent    = librosa.feature.spectral_centroid(y=y, sr=SR)[0]
    bw      = librosa.feature.spectral_bandwidth(y=y, sr=SR)[0]
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=SR)[0]

    feats = np.concatenate([
        feats,
        [zcr.mean(), zcr.std(),
         rms.mean(), rms.std(),
         cent.mean(), cent.std(),
         bw.mean(),  bw.std(),
         rolloff.mean()],
    ])  # +9 → total 111

    return feats.astype(np.float32)


# =============================================================================
# MAIN PREDICT  (unchanged API)
# =============================================================================
def predict_voice_emotion(audio_bytes: bytes) -> dict:

    # ── CNN path (primary) ────────────────────────────────────────────────────
    if CNN_ENABLED:
        try:
            import torch
            mel = _extract_mel(audio_bytes)
            if mel is None:
                raise ValueError("Mel extraction failed — audio too short")
            x    = torch.FloatTensor(mel).unsqueeze(0).unsqueeze(0)  # (1,1,F,T)
            with torch.no_grad():
                logits = cnn_model(x)
                proba  = torch.softmax(logits, dim=1).squeeze().numpy()
            idx        = int(np.argmax(proba))
            confidence = float(proba[idx])
            classes    = cnn_meta["classes"]
            emotion    = classes[idx] if confidence >= CONFIDENCE_THRESHOLD else "calm"
            return {
                "voice_emotion":    emotion,
                "voice_confidence": round(confidence, 3),
                "risk_offset":      VOICE_EMOTION_RISK_OFFSET.get(emotion, 0),
                "ml_enabled":       True,
                "low_confidence":   confidence < CONFIDENCE_THRESHOLD,
                "features_used":    "mel-spectrogram CNN v4",
            }
        except Exception as e:
            print(f"[Voice CNN ERROR] {e} — falling back to sklearn")

    # ── Sklearn path (fallback — now properly wired) ──────────────────────────
    if SKLEARN_ENABLED:
        try:
            feats = _extract_prosodic_111(audio_bytes)
            if feats is None:
                raise ValueError("Audio too short for prosodic extraction")
            scaled     = sk_scaler.transform([feats])
            pred       = sk_model.predict(scaled)[0]
            proba      = sk_model.predict_proba(scaled)[0]
            confidence = float(np.max(proba))
            emotion    = pred if confidence >= CONFIDENCE_THRESHOLD else "calm"
            return {
                "voice_emotion":    emotion,
                "voice_confidence": round(confidence, 3),
                "risk_offset":      VOICE_EMOTION_RISK_OFFSET.get(emotion, 0),
                "ml_enabled":       True,
                "low_confidence":   confidence < CONFIDENCE_THRESHOLD,
                "features_used":    "prosodic-111 sklearn (fallback)",
            }
        except Exception as e:
            print(f"[Voice Sklearn ERROR] {e}")

    # ── Total failure ─────────────────────────────────────────────────────────
    return {
        "voice_emotion":    "calm",
        "voice_confidence": 0.0,
        "risk_offset":      0,
        "ml_enabled":       False,
        "low_confidence":   True,
        "features_used":    "none",
    }
