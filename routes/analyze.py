from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.checkin import CheckInRequest, AnalysisResponse, EmotionBreakdown
from models.analyzer import MindPulseAnalyzer
from models.voice_analyzer import predict_voice_emotion, VOICE_ML_ENABLED

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


# ─── Health Check ───────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    from models.analyzer import ML_ENABLED
    return {
        "status":      "ok",
        "text_model":  "MindPulse Tri-Model Ensemble v2.0 (ML)" if ML_ENABLED else "MindPulse Rule-Based v2.0 (fallback)",
        "voice_model": "voice_emotion_model.pkl" if VOICE_ML_ENABLED else "rule-based fallback",
        "ml_enabled":  ML_ENABLED,
    }
