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

def _load_voice_models():
    """
    Load voice model in priority order:
      1. ONNX runtime  (30 MB  — works on Render free tier)
      2. PyTorch       (400 MB — local dev only, OOM on Render)
      3. sklearn pkl   (fallback)
    Returns (cnn_model, cnn_meta, CNN_ENABLED, ONNX_ENABLED, SKLEARN_ENABLED, VOICE_ML_ENABLED, sk_model, sk_scaler)
    """
    import json as _json

    # ── 1. Try ONNX ──────────────────────────────────────────────────────────
    try:
        import onnxruntime as ort
        if not _os.path.exists(MODEL_ONNX):
            raise FileNotFoundError(f"ONNX not found: {MODEL_ONNX}")
        if not _os.path.exists(MODEL_META_JSON):
            raise FileNotFoundError(f"Meta JSON not found: {MODEL_META_JSON}")
        session = ort.InferenceSession(MODEL_ONNX, providers=["CPUExecutionProvider"])
        with open(MODEL_META_JSON) as f:
            meta = _json.load(f)
        print(f"[OK] Voice CNN (ONNX) loaded | classes: {meta['classes']}")
        return session, meta, True, True, False, True, None, None
    except Exception as e:
        print(f"[INFO] ONNX unavailable ({e}), trying PyTorch...")

    # ── 2. Try PyTorch ───────────────────────────────────────────────────────
    try:
        import torch
        import torch.nn as nn

        class ConvBlock(nn.Module):
            def __init__(self, in_c, out_c, pool=(2, 2)):
                super().__init__()
                self.net = nn.Sequential(
                    nn.Conv2d(in_c, out_c, 3, padding=1, bias=False),
                    nn.BatchNorm2d(out_c), nn.ELU(),
                    nn.Conv2d(out_c, out_c, 3, padding=1, bias=False),
                    nn.BatchNorm2d(out_c), nn.ELU(),
                    nn.MaxPool2d(pool), nn.Dropout2d(0.2),
                )
                self.skip = nn.Sequential(
                    nn.Conv2d(in_c, out_c, 1, bias=False), nn.MaxPool2d(pool)
                )
            def forward(self, x):
                return self.net(x) + self.skip(x)

        class EmotionCNN(nn.Module):
            def __init__(self, n_classes=5):
                super().__init__()
                self.enc = nn.Sequential(
                    ConvBlock(1, 32), ConvBlock(32, 64),
                    ConvBlock(64, 128), ConvBlock(128, 256),
                    nn.AdaptiveAvgPool2d((1, 1)),
                )
                self.head = nn.Sequential(
                    nn.Flatten(),
                    nn.Linear(256, 256), nn.ELU(), nn.Dropout(0.4),
                    nn.Linear(256, n_classes),
                )
            def forward(self, x):
                return self.head(self.enc(x))

        ckpt = torch.load(MODEL_PT, map_location="cpu", weights_only=False)
        model = EmotionCNN(n_classes=len(ckpt["classes"]))
        model.load_state_dict(ckpt["model_state"])
        model.eval()
        print(f"[OK] Voice CNN (PyTorch) loaded | classes: {ckpt['classes']}")
        return model, ckpt, True, False, False, True, None, None
    except Exception as e:
        print(f"[WARN] PyTorch not loaded: {e}, trying sklearn...")

    # ── 3. Try sklearn fallback ───────────────────────────────────────────────
    try:
        import joblib
        sk_m = joblib.load(FALLBACK_MODEL)
        sk_s = joblib.load(FALLBACK_SCALER)
        print("[OK] Fallback sklearn model loaded")
        return None, None, False, False, True, True, sk_m, sk_s
    except Exception as e:
        print(f"[WARN] Sklearn fallback also failed: {e}")

    return None, None, False, False, False, False, None, None


(cnn_model, cnn_meta,
 CNN_ENABLED, ONNX_ENABLED,
 SKLEARN_ENABLED, VOICE_ML_ENABLED,
 sk_model, sk_scaler) = _load_voice_models()


# =============================================================================
# AUDIO HELPERS  (scipy + soundfile only — no librosa, no numba)
# =============================================================================

def _mel_filterbank(sr: int, n_fft: int, n_mels: int, fmax: float) -> "np.ndarray":
    """Build mel filterbank matching librosa's convention (HTK scale)."""
    def hz2mel(hz): return 2595.0 * np.log10(1.0 + hz / 700.0)
    def mel2hz(mel): return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)
    mel_lo, mel_hi = hz2mel(0.0), hz2mel(fmax)
    mel_pts = np.linspace(mel_lo, mel_hi, n_mels + 2)
    hz_pts  = mel2hz(mel_pts)
    n_bins  = n_fft // 2 + 1
    freqs   = np.linspace(0.0, sr / 2.0, n_bins)
    fb = np.zeros((n_mels, n_bins), dtype=np.float32)
    for i in range(n_mels):
        lo, mid, hi = hz_pts[i], hz_pts[i + 1], hz_pts[i + 2]
        fb[i] = np.maximum(0.0, np.minimum(
            (freqs - lo)  / (mid - lo  + 1e-10),
            (hi   - freqs) / (hi  - mid + 1e-10),
        ))
    return fb


def _load_audio(audio_bytes: bytes, sr_target: int, duration: int):
    """Decode audio bytes → mono float32 numpy array at sr_target."""
    try:
        import soundfile as sf
        y, orig_sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)
    except Exception:
        # last resort: try scipy.io.wavfile for raw PCM WAV
        try:
            from scipy.io import wavfile
            orig_sr, y = wavfile.read(io.BytesIO(audio_bytes))
            y = y.astype(np.float32) / (np.iinfo(y.dtype).max + 1)
        except Exception:
            return None, None
    if y.ndim > 1:
        y = y.mean(axis=1)
    y = y.astype(np.float32)
    if orig_sr != sr_target:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(int(sr_target), int(orig_sr))
        y = resample_poly(y, sr_target // g, orig_sr // g).astype(np.float32)
    target = sr_target * duration
    if len(y) < sr_target * 0.5:
        return None, None
    y = np.pad(y, (0, max(0, target - len(y))))[:target]
    return y, sr_target


def _extract_mel(audio_bytes: bytes) -> "np.ndarray | None":
    """Compute mel spectrogram matching training pipeline (scipy only)."""
    if cnn_meta is None:
        return None
    SR       = cnn_meta.get("sr",       22050)
    DURATION = cnn_meta.get("duration", 4)
    N_MELS   = cnn_meta.get("n_mels",   64)
    HOP      = cnn_meta.get("hop",      512)
    N_FFT    = cnn_meta.get("n_fft",    2048)
    FIXED    = cnn_meta.get("fixed_len", int(SR * DURATION / HOP) + 1)
    X_MEAN   = float(cnn_meta.get("x_mean", -61.0))
    X_STD    = float(cnn_meta.get("x_std",   19.87))

    y, _ = _load_audio(audio_bytes, SR, DURATION)
    if y is None:
        return None

    # STFT  (matching librosa: center=True → pad by n_fft//2 on both sides)
    pad = N_FFT // 2
    y_padded = np.pad(y, (pad, pad), mode="reflect")
    from scipy.signal import stft as sp_stft
    _, _, Zxx = sp_stft(y_padded, fs=SR, nperseg=N_FFT,
                        noverlap=N_FFT - HOP, window="hann",
                        boundary=None, padded=False)
    power = np.abs(Zxx) ** 2   # (n_fft//2+1, frames)

    # Mel filterbank → mel spectrogram
    fb     = _mel_filterbank(SR, N_FFT, N_MELS, 8000.0)
    mel    = fb @ power          # (n_mels, frames)

    # Power to dB (librosa: ref=np.max)
    ref    = float(mel.max()) if mel.max() > 0 else 1.0
    mel_db = (10.0 * np.log10(np.maximum(mel / ref, 1e-10))).astype(np.float32)

    # Pad / trim to FIXED length
    if mel_db.shape[1] < FIXED:
        mel_db = np.pad(mel_db, ((0, 0), (0, FIXED - mel_db.shape[1])))
    else:
        mel_db = mel_db[:, :FIXED]

    # Global normalisation (crucial — matches training stats)
    mel_db = (mel_db - X_MEAN) / (X_STD + 1e-6)
    return mel_db


def _softmax(x: np.ndarray) -> np.ndarray:
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

    # ── Sklearn fallback (scipy + soundfile only — no librosa) ───────────────
    if SKLEARN_ENABLED:
        try:
            SR, DUR = 22050, 4
            y, _ = _load_audio(audio_bytes, SR, DUR)
            if y is None:
                raise ValueError("Audio decode failed for sklearn fallback")

            # Build power spectrogram via scipy STFT
            pad = 2048 // 2
            from scipy.signal import stft as sp_stft, lfilter
            _, _, Zxx = sp_stft(np.pad(y, (pad, pad), "reflect"),
                                fs=SR, nperseg=2048, noverlap=2048 - 512,
                                window="hann", boundary=None, padded=False)
            power = np.abs(Zxx) ** 2  # (1025, frames)

            # MFCC-like: mel filterbank → log → DCT
            fb  = _mel_filterbank(SR, 2048, 13, 8000.0)  # (13, 1025)
            mel = np.maximum(fb @ power, 1e-10)
            log_mel = np.log(mel)                         # (13, frames)
            from scipy.fft import dct
            mfcc = dct(log_mel, axis=0, norm="ortho")[:13]  # (13, frames)

            # Delta (first-order difference approximation)
            delta = np.diff(mfcc, axis=1, prepend=mfcc[:, :1])

            # RMS energy per frame
            rms = np.sqrt(power.mean(axis=0, keepdims=True))  # (1, frames)

            # Zero-crossing rate
            signs = np.sign(y)
            zcr_val = np.mean(np.abs(np.diff(signs)) / 2.0)

            feats = np.concatenate([
                mfcc.mean(axis=1), mfcc.std(axis=1),  # 26
                delta.mean(axis=1),                    # 13
                rms.mean(axis=1),                      # 1
                [zcr_val],                             # 1  → total 41
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
                "features_used":    "prosodic sklearn (scipy fallback)",
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
