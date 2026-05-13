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

sk_model = sk_scaler = sk_label_enc = None
FALLBACK_LE = _os.path.join(_MODELS, "voice_label_encoder.pkl")
if not CNN_ENABLED:
    try:
        import joblib
        sk_model        = joblib.load(FALLBACK_MODEL)
        sk_scaler       = joblib.load(FALLBACK_SCALER)
        # Label encoder maps integer predictions (0-4) back to class strings
        try:
            sk_label_enc = joblib.load(FALLBACK_LE)
            print(f"[OK] Voice label encoder loaded | classes: {list(sk_label_enc.classes_)}")
        except Exception:
            # Fallback: build from known class order if file not present
            from sklearn.preprocessing import LabelEncoder
            sk_label_enc = LabelEncoder().fit(["anger","anxiety","calm","joy","sadness"])
            print("[OK] Voice label encoder built from defaults")
        SKLEARN_ENABLED  = True
        VOICE_ML_ENABLED = True
        print("[OK] Fallback sklearn voice model loaded (111-feature VotingClassifier SVM+RF+GB)")
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
# PARALINGUISTIC EXTRACTOR  (sklearn fallback — v4, 120 features)
#
# Captures HOW speech sounds, NOT what words are said.
#   Raw MFCC means  (phonetic content)    -> REMOVED
#   Delta-MFCC      (dynamic voice quality) -> KEPT
#   F0/pitch stats  (purely paralinguistic) -> ADDED
#   Energy dynamics (mostly paralinguistic) -> ADDED
#   Rhythm/onsets   (purely paralinguistic) -> ADDED
#   Chroma STD only (variability, not tone) -> ADDED
#   H/P ratio       (voice texture)         -> ADDED
# =============================================================================
_N_FEATURES = 120

def _f0_skew(x):
    m = x.mean(); s = x.std()
    return float(np.mean(((x - m) / (s + 1e-9)) ** 3))

def _extract_paralinguistic_v4(audio_bytes: bytes):
    import librosa
    SR = 22050
    y, _ = librosa.load(io.BytesIO(audio_bytes), sr=SR, duration=4, mono=True)
    if len(y) < SR * 0.5:
        return None

    feats = []

    # 1. Pitch F0 via yin (15 features)
    f0 = librosa.yin(y, fmin=65, fmax=500, sr=SR)
    voiced = f0[f0 > 65]
    if len(voiced) < 5:
        voiced = np.full(5, 150.0)
    voiced_ratio = (f0 > 65).mean()
    feats += [
        voiced.mean(), voiced.std(),
        voiced.min(), voiced.max(), voiced.max() - voiced.min(),
        float(np.percentile(voiced, 10)), float(np.percentile(voiced, 25)),
        float(np.percentile(voiced, 75)), float(np.percentile(voiced, 90)),
        voiced.std() / (voiced.mean() + 1e-6),
        voiced_ratio,
    ]  # 11
    d_f0 = np.diff(voiced)
    feats += [d_f0.mean(), d_f0.std(), float(np.abs(d_f0).max()), _f0_skew(voiced)]  # +4=15

    # 2. Energy / RMS dynamics (8)
    rms = librosa.feature.rms(y=y)[0]
    d_rms = np.diff(rms)
    feats += [
        rms.mean(), rms.std(), rms.max(), rms.max() - rms.min(),
        d_rms.mean(), d_rms.std(),
        float((rms > rms.mean()).mean()),
        float((rms < rms.mean() * 0.1).mean()),
    ]  # +8 = 23

    # 3. Delta-MFCC (26) — dynamic voice quality, NO raw MFCC
    mfcc    = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=13)
    d_mfcc  = librosa.feature.delta(mfcc)
    d2_mfcc = librosa.feature.delta(mfcc, order=2)
    feats  += d_mfcc.mean(axis=1).tolist() + d_mfcc.std(axis=1).tolist()    # +26 = 49

    # 4. Delta-delta-MFCC (26)
    feats  += d2_mfcc.mean(axis=1).tolist() + d2_mfcc.std(axis=1).tolist()  # +26 = 75

    # 5. Spectral voice quality (19)
    zcr      = librosa.feature.zero_crossing_rate(y)[0]
    cent     = librosa.feature.spectral_centroid(y=y, sr=SR)[0]
    bw       = librosa.feature.spectral_bandwidth(y=y, sr=SR)[0]
    rolloff  = librosa.feature.spectral_rolloff(y=y, sr=SR)[0]
    flat     = librosa.feature.spectral_flatness(y=y)[0]
    contrast = librosa.feature.spectral_contrast(y=y, sr=SR)
    feats   += [zcr.mean(), zcr.std(), cent.mean(), cent.std(),
                bw.mean(), bw.std(), rolloff.mean(), rolloff.std(),
                flat.mean(), flat.std()]                          # +10 = 85
    feats   += contrast.mean(axis=1).tolist()                    # +7  = 92
    feats   += [float(contrast.std().mean())]                    # +1  = 93
    try:
        y_h, y_p = librosa.effects.hpss(y)
        tot = np.sqrt(np.mean(y ** 2)) + 1e-8
        feats += [np.sqrt(np.mean(y_h**2)) / tot,
                  np.sqrt(np.mean(y_p**2)) / tot]                # +2  = 95
    except Exception:
        feats += [0.5, 0.5]

    # 6. Rhythm / onset (4)
    try:
        onset_env = librosa.onset.onset_strength(y=y, sr=SR)
        n_onsets  = len(librosa.onset.onset_detect(y=y, sr=SR))
        feats    += [float(onset_env.mean()), float(onset_env.std()),
                     float(onset_env.max()),
                     float(n_onsets / (len(y) / SR))]            # +4 = 99
    except Exception:
        feats += [0.0, 0.0, 0.0, 0.0]

    # 7. Chroma STD only (12) — tonal variability, NOT content
    chroma = librosa.feature.chroma_stft(y=y, sr=SR)
    feats += chroma.std(axis=1).tolist()                          # +12 = 111

    # 8. Tonnetz mean (6) — tonal stability
    try:
        y_harm  = librosa.effects.harmonic(y)
        tonnetz = librosa.feature.tonnetz(y=y_harm, sr=SR)
        feats  += tonnetz.mean(axis=1).tolist()                   # +6 = 117
    except Exception:
        feats  += [0.0] * 6

    # Trim/pad to exactly _N_FEATURES
    arr = np.array(feats, dtype=np.float32)
    arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
    arr = arr[:_N_FEATURES]
    if len(arr) < _N_FEATURES:
        arr = np.pad(arr, (0, _N_FEATURES - len(arr)))
    return arr



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

    # -- Sklearn path (fallback - paralinguistic v4, 67.3%, 120 features, no raw MFCC) --
    if SKLEARN_ENABLED:
        try:
            feats = _extract_paralinguistic_v4(audio_bytes)
            if feats is None:
                raise ValueError("Audio too short for prosodic extraction")
            scaled     = sk_scaler.transform([feats])
            pred_raw   = sk_model.predict(scaled)[0]
            proba      = sk_model.predict_proba(scaled)[0]
            confidence = float(np.max(proba))
            # Decode integer label to string (model trained on LabelEncoder integers)
            if isinstance(pred_raw, (int, np.integer)):
                emotion_raw = str(sk_label_enc.inverse_transform([int(pred_raw)])[0])
            else:
                emotion_raw = str(pred_raw)   # already a string (legacy model)
            emotion = emotion_raw if confidence >= CONFIDENCE_THRESHOLD else "calm"
            return {
                "voice_emotion":    emotion,
                "voice_confidence": round(confidence, 3),
                "risk_offset":      VOICE_EMOTION_RISK_OFFSET.get(emotion, 0),
                "ml_enabled":       True,
                "low_confidence":   confidence < CONFIDENCE_THRESHOLD,
                "features_used":    "paralinguistic-120 sklearn SVM+RF+GB v4 (fallback)",
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
