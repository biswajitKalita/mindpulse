"""
MindPulse Voice Emotion Analyzer v5.1
=======================================
Priority order:
  1. ONNX runtime  (scipy mel extraction -- no librosa/numba needed)
  2. PyTorch CNN   (local dev only -- OOM on Render free tier)
  3. sklearn pkl   (fallback -- always works on Render)
"""
import warnings
import io
import os as _os

import numpy as np

warnings.filterwarnings("ignore")

# -- Deployment version (used in health endpoint to confirm new code is live) -
VOICE_MODEL_VERSION = "v5.5-sklearn172"

# -- Model paths --------------------------------------------------------------
_BASE           = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_MODELS         = _os.path.join(_BASE, "mindpulse", "Models")
MODEL_ONNX      = _os.path.join(_MODELS, "voice_cnn_model.onnx")
MODEL_META_JSON = _os.path.join(_MODELS, "voice_cnn_meta.json")
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
# MODEL LOADER
# =============================================================================

def _load_voice_models():
    import json as _json

    # -- 1. ONNX ---------------------------------------------------------------
    try:
        import onnxruntime as ort
        if not _os.path.exists(MODEL_ONNX):
            raise FileNotFoundError(f"ONNX file missing: {MODEL_ONNX}")
        if not _os.path.exists(MODEL_META_JSON):
            raise FileNotFoundError(f"Meta JSON missing: {MODEL_META_JSON}")
        sess = ort.InferenceSession(MODEL_ONNX, providers=["CPUExecutionProvider"])
        with open(MODEL_META_JSON) as f:
            meta = _json.load(f)
        print(f"[Voice] ONNX loaded | classes: {meta['classes']}")
        return sess, meta, True, True, False, True, None, None
    except Exception as e:
        print(f"[Voice] ONNX unavailable: {e}")

    # -- 2. PyTorch ------------------------------------------------------------
    try:
        import torch
        import torch.nn as nn

        class _CB(nn.Module):
            def __init__(self, ic, oc, pool=(2, 2)):
                super().__init__()
                self.net = nn.Sequential(
                    nn.Conv2d(ic, oc, 3, padding=1, bias=False),
                    nn.BatchNorm2d(oc), nn.ELU(),
                    nn.Conv2d(oc, oc, 3, padding=1, bias=False),
                    nn.BatchNorm2d(oc), nn.ELU(),
                    nn.MaxPool2d(pool), nn.Dropout2d(0.2),
                )
                self.skip = nn.Sequential(
                    nn.Conv2d(ic, oc, 1, bias=False), nn.MaxPool2d(pool)
                )
            def forward(self, x):
                return self.net(x) + self.skip(x)

        class _CNN(nn.Module):
            def __init__(self, n=5):
                super().__init__()
                self.enc = nn.Sequential(
                    _CB(1, 32), _CB(32, 64), _CB(64, 128), _CB(128, 256),
                    nn.AdaptiveAvgPool2d((1, 1)),
                )
                self.head = nn.Sequential(
                    nn.Flatten(),
                    nn.Linear(256, 256), nn.ELU(), nn.Dropout(0.4),
                    nn.Linear(256, n),
                )
            def forward(self, x):
                return self.head(self.enc(x))

        ckpt = torch.load(MODEL_PT, map_location="cpu", weights_only=False)
        m = _CNN(n=len(ckpt["classes"]))
        m.load_state_dict(ckpt["model_state"])
        m.eval()
        print(f"[Voice] PyTorch loaded | classes: {ckpt['classes']}")
        return m, ckpt, True, False, False, True, None, None
    except Exception as e:
        print(f"[Voice] PyTorch unavailable: {e}")

    # -- 3. sklearn fallback ---------------------------------------------------
    try:
        import joblib
        sk_m = joblib.load(FALLBACK_MODEL)
        sk_s = joblib.load(FALLBACK_SCALER)
        print("[Voice] sklearn fallback loaded")
        return None, None, False, False, True, True, sk_m, sk_s
    except Exception as e:
        print(f"[Voice] sklearn also failed: {e}")

    print("[Voice] ALL models failed -- rule-based fallback active")
    return None, None, False, False, False, False, None, None


(cnn_model, cnn_meta,
 CNN_ENABLED, ONNX_ENABLED,
 SKLEARN_ENABLED, VOICE_ML_ENABLED,
 sk_model, sk_scaler) = _load_voice_models()


# =============================================================================
# AUDIO UTILITIES  (scipy + soundfile only -- no librosa/numba)
# =============================================================================

def _mel_filterbank(sr, n_fft, n_mels, fmax):
    def hz2mel(hz): return 2595.0 * np.log10(1.0 + hz / 700.0)
    def mel2hz(m):  return 700.0 * (10.0 ** (m / 2595.0) - 1.0)
    mel_pts = np.linspace(hz2mel(0.0), hz2mel(fmax), n_mels + 2)
    hz_pts  = mel2hz(mel_pts)
    n_bins  = n_fft // 2 + 1
    freqs   = np.linspace(0.0, sr / 2.0, n_bins)
    fb = np.zeros((n_mels, n_bins), dtype=np.float32)
    for i in range(n_mels):
        lo, mid, hi = hz_pts[i], hz_pts[i + 1], hz_pts[i + 2]
        fb[i] = np.maximum(0.0, np.minimum(
            (freqs - lo) / (mid - lo + 1e-10),
            (hi - freqs)  / (hi - mid + 1e-10),
        ))
    return fb


def _decode_audio(audio_bytes, sr_target=22050, duration=4):
    try:
        import soundfile as sf
        y, orig_sr = sf.read(io.BytesIO(audio_bytes), always_2d=False)
    except Exception:
        try:
            from scipy.io import wavfile
            orig_sr, y = wavfile.read(io.BytesIO(audio_bytes))
            max_val = float(np.iinfo(y.dtype).max) if np.issubdtype(y.dtype, np.integer) else 1.0
            y = y.astype(np.float32) / max_val
        except Exception:
            return None, None
    if y.ndim > 1:
        y = y.mean(axis=1)
    y = y.astype(np.float32)
    if int(orig_sr) != sr_target:
        try:
            from scipy.signal import resample_poly
            from math import gcd
            g = gcd(sr_target, int(orig_sr))
            y = resample_poly(y, sr_target // g, int(orig_sr) // g).astype(np.float32)
        except Exception:
            return None, None
    target = sr_target * duration
    if len(y) < sr_target * 0.5:
        return None, None
    y = np.pad(y, (0, max(0, target - len(y))))[:target]
    return y, sr_target


def _extract_mel(audio_bytes):
    if cnn_meta is None:
        return None
    SR    = cnn_meta.get("sr",       22050)
    DUR   = cnn_meta.get("duration", 4)
    NMELS = cnn_meta.get("n_mels",   64)
    HOP   = cnn_meta.get("hop",      512)
    NFFT  = cnn_meta.get("n_fft",    2048)
    FIXED = cnn_meta.get("fixed_len", int(SR * DUR / HOP) + 1)
    XMEAN = float(cnn_meta.get("x_mean", -61.02))
    XSTD  = float(cnn_meta.get("x_std",   19.87))

    y, _ = _decode_audio(audio_bytes, SR, DUR)
    if y is None:
        return None

    y_pad = np.pad(y, (NFFT // 2, NFFT // 2), mode="reflect")
    from scipy.signal import stft as _stft
    _, _, Z = _stft(y_pad, fs=SR, nperseg=NFFT, noverlap=NFFT - HOP,
                    window="hann", boundary=None, padded=False)
    power = np.abs(Z) ** 2

    fb     = _mel_filterbank(SR, NFFT, NMELS, 8000.0)
    mel    = fb @ power
    ref    = float(mel.max()) or 1.0
    mel_db = (10.0 * np.log10(np.maximum(mel / ref, 1e-10))).astype(np.float32)

    if mel_db.shape[1] < FIXED:
        mel_db = np.pad(mel_db, ((0, 0), (0, FIXED - mel_db.shape[1])))
    else:
        mel_db = mel_db[:, :FIXED]
    return (mel_db - XMEAN) / (XSTD + 1e-6)


def _softmax(x):
    e = np.exp(x - x.max())
    return e / e.sum()


# =============================================================================
# PREDICT
# =============================================================================

def predict_voice_emotion(audio_bytes):

    if CNN_ENABLED:
        try:
            mel = _extract_mel(audio_bytes)
            if mel is None:
                raise ValueError("Mel extraction failed")
            x_np = mel[np.newaxis, np.newaxis, :, :]

            if ONNX_ENABLED:
                logits = cnn_model.run(["logits"], {"mel_input": x_np})[0]
                proba  = _softmax(logits[0])
            else:
                import torch
                with torch.no_grad():
                    proba = torch.softmax(
                        cnn_model(torch.from_numpy(x_np)), dim=1
                    ).squeeze().numpy()

            idx  = int(np.argmax(proba))
            conf = float(proba[idx])
            classes = cnn_meta["classes"]
            emotion = classes[idx] if conf >= CONFIDENCE_THRESHOLD else "calm"
            return {
                "voice_emotion":    emotion,
                "voice_confidence": round(conf, 3),
                "risk_offset":      VOICE_EMOTION_RISK_OFFSET.get(emotion, 0),
                "ml_enabled":       True,
                "low_confidence":   conf < CONFIDENCE_THRESHOLD,
                "features_used":    f"mel-cnn ({'onnx' if ONNX_ENABLED else 'pytorch'})",
            }
        except Exception as e:
            print(f"[Voice CNN error] {e}")

    if SKLEARN_ENABLED:
        try:
            SR, DUR = 22050, 4
            y, _ = _decode_audio(audio_bytes, SR, DUR)
            if y is None:
                raise ValueError("Audio decode failed")

            pad = 2048 // 2
            from scipy.signal import stft as _stft
            _, _, Z = _stft(np.pad(y, (pad, pad), "reflect"),
                            fs=SR, nperseg=2048, noverlap=2048 - 512,
                            window="hann", boundary=None, padded=False)
            power = np.abs(Z) ** 2

            fb      = _mel_filterbank(SR, 2048, 13, 8000.0)
            mel     = np.maximum(fb @ power, 1e-10)
            log_mel = np.log(mel)

            from scipy.fft import dct
            mfcc  = dct(log_mel, axis=0, norm="ortho")[:13]
            delta = np.diff(mfcc, axis=1, prepend=mfcc[:, :1])
            rms   = np.sqrt(power.mean(axis=0, keepdims=True))
            zcr   = float(np.mean(np.abs(np.diff(np.sign(y))) / 2.0))

            feats  = np.concatenate([
                mfcc.mean(axis=1), mfcc.std(axis=1),
                delta.mean(axis=1),
                rms.mean(axis=1), [zcr],
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
                "features_used":    "sklearn-prosodic (scipy)",
            }
        except Exception as e:
            print(f"[Voice sklearn error] {e}")

    return {
        "voice_emotion":    "calm",
        "voice_confidence": 0.0,
        "risk_offset":      0,
        "ml_enabled":       False,
        "low_confidence":   True,
        "features_used":    "none",
    }
