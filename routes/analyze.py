from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.checkin import CheckInRequest, AnalysisResponse, EmotionBreakdown
from models.analyzer import MindPulseAnalyzer
from models.voice_analyzer import (
    predict_voice_emotion, VOICE_ML_ENABLED,
    CNN_ENABLED, ONNX_ENABLED, SKLEARN_ENABLED,
    VOICE_MODEL_VERSION,
)

router = APIRouter()
analyzer = MindPulseAnalyzer()


# ─── Text Analysis Endpoint ─────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_checkin(payload: CheckInRequest):
    """
    Main text analysis endpoint.
    Accepts combined journal + voice transcript text, runs the Tri-Model
    ML ensemble (final_model + suicide_model + isear_model).
    """
    result = analyzer.analyze(
        text=payload.text,
        mood=payload.mood,
        stress=payload.stress,
        sleep=payload.sleep,
        energy=payload.energy,
        tags=payload.tags or [],
    )
    return AnalysisResponse(
        score=result["score"],
        risk_level=result["risk_level"],
        confidence=result["confidence"],
        emotions=EmotionBreakdown(**result["emotions"]),
        dominant_emotion=result["dominant_emotion"],
        sentiment_label=result["sentiment_label"],
        sentiment_score=result["sentiment_score"],
        text_depth=result["text_depth"],
        insights=result["insights"],
        suggestions=result["suggestions"],
        crisis_flag=result["crisis_flag"],
        word_count=result["word_count"],
    )


# ─── Voice Emotion Analysis Endpoint ────────────────────────────────────────

@router.post("/voice-analyze")
async def analyze_voice(audio: UploadFile = File(...)):
    """
    Accepts a raw audio file (webm/wav/mp3) recorded in the browser.
    Runs the trained voice_emotion_model.pkl to detect emotion.
    Returns: { voice_emotion, voice_confidence, risk_offset, ml_enabled }
    """
    if not audio.content_type or not any(
        audio.content_type.startswith(t)
        for t in ("audio/", "video/webm", "application/octet-stream")
    ):
        raise HTTPException(status_code=400, detail="File must be an audio type.")

    audio_bytes = await audio.read()
    if len(audio_bytes) < 1024:
        raise HTTPException(status_code=400, detail="Audio too short or empty.")

    result = predict_voice_emotion(audio_bytes)
    return result


# ─── Health Check ────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    from models.analyzer import ML_ENABLED
    if ONNX_ENABLED:
        voice_label = f"voice_cnn_model.onnx (ONNX · {VOICE_MODEL_VERSION})"
    elif CNN_ENABLED:
        voice_label = f"voice_cnn_model.pt (PyTorch · {VOICE_MODEL_VERSION})"
    elif SKLEARN_ENABLED:
        voice_label = f"voice_emotion_model.pkl (sklearn · {VOICE_MODEL_VERSION})"
    else:
        voice_label = f"rule-based fallback · {VOICE_MODEL_VERSION}"
    return {
        "status":         "ok",
        "deploy_version": VOICE_MODEL_VERSION,
        "text_model":     "MindPulse Tri-Model Ensemble v2.0 (ML)" if ML_ENABLED else "MindPulse Rule-Based v2.0 (fallback)",
        "voice_model":    voice_label,
        "ml_enabled":     ML_ENABLED,
    }


# ─── Voice Debug (temporary diagnosis endpoint) ──────────────────────────────

def _pkg_version(name: str) -> str:
    try:
        import importlib.metadata
        return importlib.metadata.version(name)
    except Exception:
        return "NOT INSTALLED"


@router.get("/voice-debug")
async def voice_debug():
    """Returns exact paths, file existence, and load errors — for diagnosis."""
    import os, sys
    from models import voice_analyzer as va

    sk_error = "already loaded OK"
    if not va.SKLEARN_ENABLED:
        try:
            import joblib
            joblib.load(va.FALLBACK_MODEL)
            sk_error = "retry OK"
        except Exception as e:
            sk_error = str(e)

    onnx_error = "already loaded OK"
    if not va.ONNX_ENABLED:
        try:
            import onnxruntime as ort
            ort.InferenceSession(va.MODEL_ONNX, providers=["CPUExecutionProvider"])
            onnx_error = "retry OK"
        except Exception as e:
            onnx_error = str(e)

    return {
        "cwd":    os.getcwd(),
        "python": sys.version,
        "_BASE":  va._BASE,
        "_MODELS": va._MODELS,
        "files": {
            "voice_emotion_model.pkl": os.path.exists(va.FALLBACK_MODEL),
            "voice_scaler.pkl":        os.path.exists(va.FALLBACK_SCALER),
            "voice_cnn_model.onnx":    os.path.exists(va.MODEL_ONNX),
            "voice_cnn_meta.json":     os.path.exists(va.MODEL_META_JSON),
        },
        "flags": {
            "CNN_ENABLED":     va.CNN_ENABLED,
            "ONNX_ENABLED":    va.ONNX_ENABLED,
            "SKLEARN_ENABLED": va.SKLEARN_ENABLED,
        },
        "errors": {
            "onnx":   onnx_error,
            "sklearn": sk_error,
        },
        "packages": {
            "onnxruntime": _pkg_version("onnxruntime"),
            "scipy":       _pkg_version("scipy"),
            "soundfile":   _pkg_version("soundfile"),
            "joblib":      _pkg_version("joblib"),
            "scikit-learn": _pkg_version("scikit-learn"),
        },
    }


# ─── MongoDB Write Test ───────────────────────────────────────────────────────

@router.get("/db-test")
async def db_test():
    """Tests MongoDB read + write + shows registered emails for diagnosis."""
    from database.db import MONGO_ENABLED, _mongo_users
    import uuid
    from datetime import datetime

    result = {
        "mongo_enabled": MONGO_ENABLED,
        "write_test": None,
        "read_test": None,
        "delete_test": None,
        "registered_emails": [],
        "user_count": None,
        "error": None,
    }

    if not MONGO_ENABLED:
        result["error"] = "MONGO_ENABLED is False — check MONGO_URI env var on Render"
        return result

    test_id = f"_test_{uuid.uuid4().hex[:8]}"
    try:
        # 1. Write test
        _mongo_users.insert_one({
            "_id": test_id, "id": test_id, "name": "TEST",
            "email": f"{test_id}@test.com", "joined_at": datetime.utcnow().isoformat(),
        })
        result["write_test"] = "OK"

        # 2. Read test
        doc = _mongo_users.find_one({"_id": test_id})
        result["read_test"] = "OK" if doc else "FAILED — document not found after insert"

        # 3. List all real registered emails
        real_users = list(_mongo_users.find(
            {"name": {"$ne": "TEST"}},
            {"email": 1, "name": 1, "joined_at": 1, "_id": 0}
        ))
        result["registered_emails"] = [
            {"email": u.get("email", ""), "name": u.get("name", ""), "joined": u.get("joined_at", "")}
            for u in real_users
        ]
        result["user_count"] = len(real_users)

        # 4. Cleanup
        _mongo_users.delete_one({"_id": test_id})
        result["delete_test"] = "OK"

    except Exception as e:
        result["error"] = str(e)
        result["write_test"] = "FAILED"

    return result

