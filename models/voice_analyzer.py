"""
MindPulse Voice Emotion Analyzer v4 (CNN on Mel Spectrograms)
==============================================================
Uses the deep CNN model trained on mel spectrograms.
Detects emotion purely from HOW the user speaks — tone, rhythm,
pitch, energy — NOT from the words.
"""
import warnings, io
import numpy as np

warnings.filterwarnings("ignore")

import os as _os
_BASE = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_MODELS = _os.path.join(_BASE, "mindpulse", "Models")

MODEL_PT        = _os.path.join(_MODELS, "voice_cnn_model.pt")
MODEL_ONNX      = _os.path.join(_MODELS, "voice_cnn_model.onnx")
MODEL_META_JSON = _os.path.join(_MODELS, "voice_cnn_meta.json")
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

# ── Priority 1: ONNX runtime (lightweight, works on Render free tier) ────────
CNN_ENABLED  = False
cnn_model    = None   # will hold ort.InferenceSession or torch module
cnn_meta     = None   # dict with x_mean, x_std, classes, etc.
ONNX_ENABLED = False

try:
    import json as _json
    import onnxruntime as ort
    if not _os.path.exists(MODEL_ONNX):
        raise FileNotFoundError(f"ONNX file not found: {MODEL_ONNX}")
    if not _os.path.exists(MODEL_META_JSON):
        raise FileNotFoundError(f"Meta JSON not found: {MODEL_META_JSON}")
    _ort_session = ort.InferenceSession(MODEL_ONNX, providers=["CPUExecutionProvider"])
    with open(MODEL_META_JSON) as _f:
        cnn_meta = _json.load(_f)
    cnn_model    = _ort_session
    CNN_ENABLED  = True
    ONNX_ENABLED = True
    print(f"[OK] Voice CNN (ONNX) loaded | classes: {cnn_meta['classes']}")
except Exception as _onnx_err:
    print(f"[INFO] ONNX not available ({_onnx_err}), trying PyTorch...")

    # ── Priority 2: PyTorch (works locally, OOM on Render free tier) ──────────
    if not CNN_ENABLED:
        try:
            import torch
            import torch.nn as nn

            class ConvBlock(nn.Module):
                """Must match training script v4.1 exactly (uses enc/head naming)."""
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
                def __init__(self, n_classes=5):
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
                        nn.Linear(256, n_classes)
                    )
                def forward(self, x): return self.head(self.enc(x))

            checkpoint = torch.load(MODEL_PT, map_location="cpu", weights_only=False)
            n_cls = len(checkpoint["classes"])
            _pt_model = EmotionCNN(n_classes=n_cls)
            _pt_model.load_state_dict(checkpoint["model_state"])
            _pt_model.eval()
            cnn_model   = _pt_model
            cnn_meta    = checkpoint
            CNN_ENABLED = True
            print(f"[OK] Voice CNN v4.1 (PyTorch) loaded | classes: {checkpoint['classes']}")
        except Exception as e:
            print(f"[WARN] PyTorch CNN not loaded: {e} — trying sklearn fallback")

# ── Priority 3: sklearn fallback ─────────────────────────────────────────────
SKLEARN_ENABLED = False
VOICE_ML_ENABLED = CNN_ENABLED
sk_model = sk_scaler = None
if not CNN_ENABLED:
    try:
        import joblib
        sk_model   = joblib.load(FALLBACK_MODEL)
        sk_scaler  = joblib.load(FALLBACK_SCALER)
        SKLEARN_ENABLED  = True
        VOICE_ML_ENABLED = True
        print("[OK] Fallback sklearn model loaded")
    except Exception as e:
        print(f"[WARN] Fallback also failed: {e}")



# =============================================================================
# MEL SPECTROGRAM EXTRACTOR  (matches training exactly)
# =============================================================================
def _extract_mel(audio_bytes: bytes) -> "np.ndarray | None":
    import librosa
    if cnn_meta is None:
        return None
    SR       = cnn_meta.get("sr",       22050)
    DURATION = cnn_meta.get("duration", 4)
    N_MELS   = cnn_meta.get("n_mels",   64)   # training default was 64, not 128
    HOP      = cnn_meta.get("hop",      512)
    N_FFT    = cnn_meta.get("n_fft",    2048)
    FIXED    = cnn_meta.get("fixed_len", int(SR * DURATION / HOP) + 1)
    # Use GLOBAL normalisation stats saved during training (not per-sample)
    X_MEAN   = float(cnn_meta.get("x_mean", -61.0))
    X_STD    = float(cnn_meta.get("x_std",   16.0))   # typical mel-db std

    try:
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=SR, duration=DURATION, mono=True)
    except Exception:
        # webm/ogg may need audioread — try again without format hint
        try:
            import soundfile as sf
            y, sr = sf.read(io.BytesIO(audio_bytes))
            import librosa.core as lc
            y = lc.resample(y if y.ndim == 1 else y.mean(axis=1), orig_sr=sr, target_sr=SR)
            sr = SR
        except Exception:
            return None

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

    # Normalise with GLOBAL stats (matches training — crucial for correct predictions)
    mel_db = (mel_db - X_MEAN) / (X_STD + 1e-6)
    return mel_db


def _softmax(x: np.ndarray) -> np.ndarray:
    """Numerically stable softmax for numpy arrays."""
    e = np.exp(x - np.max(x))
    return e / e.sum()


# =============================================================================
# PREDICT
# =============================================================================
def predict_voice_emotion(audio_bytes: bytes) -> dict:
    # ── CNN path (ONNX or PyTorch) ────────────────────────────────────────────
    if CNN_ENABLED:
        try:
            mel = _extract_mel(audio_bytes)
            if mel is None:
                raise ValueError("Mel extraction failed")
            x_np = mel[np.newaxis, np.newaxis, :, :]  # (1, 1, F, T)  float32

            if ONNX_ENABLED:
                # ONNX runtime path (Render-friendly, 30 MB)
                logits_np = cnn_model.run(["logits"], {"mel_input": x_np})[0]
                proba = _softmax(logits_np[0])
            else:
                # PyTorch path (local development)
                import torch
                x = torch.from_numpy(x_np)
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
                "features_used":    f"mel-spectrogram CNN v4 ({'ONNX' if ONNX_ENABLED else 'PyTorch'})",
            }
        except Exception as e:
            print(f"[Voice CNN ERROR] {e}")

    # ── Sklearn fallback (inline prosodic features — v3 module removed) ──────
    if SKLEARN_ENABLED:
        try:
            import librosa
            y, sr = librosa.load(io.BytesIO(audio_bytes), sr=22050, duration=4, mono=True)
            if len(y) < sr * 0.5:
                raise ValueError("Audio too short for sklearn fallback")
            mfcc  = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            delta = librosa.feature.delta(mfcc)
            rms   = librosa.feature.rms(y=y)
            zcr   = librosa.feature.zero_crossing_rate(y)
            feats = np.concatenate([
                mfcc.mean(axis=1), mfcc.std(axis=1),
                delta.mean(axis=1),
                rms.mean(axis=1), zcr.mean(axis=1),
            ])
            scaled = sk_scaler.transform([feats])
            pred   = sk_model.predict(scaled)[0]
            proba  = sk_model.predict_proba(scaled)[0]
            conf   = float(np.max(proba))
            return {
                "voice_emotion":    pred,
                "voice_confidence": round(conf, 3),
                "risk_offset":      VOICE_EMOTION_RISK_OFFSET.get(pred, 0),
                "ml_enabled":       True,
                "low_confidence":   conf < CONFIDENCE_THRESHOLD,
                "features_used":    "prosodic sklearn (fallback)",
            }
        except Exception as e:
            print(f"[Voice Fallback ERROR] {e}")


    return {
        "voice_emotion":    "calm",
        "voice_confidence": 0.0,
        "risk_offset":      0,
        "ml_enabled":       False,
        "low_confidence":   True,
        "features_used":    "none",
    }
