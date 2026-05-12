"""
MindPulse — Check-In Routes
POST /api/checkins   → analyze text + persist result to DB
GET  /api/checkins   → fetch user's check-in history (newest first)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from middleware.auth import get_current_user
from models.analyzer import MindPulseAnalyzer
from database.db import save_checkin, get_history

router = APIRouter()
analyzer = MindPulseAnalyzer()


# ── Request / Response Schemas ───────────────────────────────────────────────

class CheckInRequest(BaseModel):
    text:        str
    mood:        str            # excellent | good | okay | low | struggling
    stress:      int            # 1–10
    sleep:       int            # 1–10
    energy:      int            # 1–10
    tags:        List[str] = []
    voice_used:  bool = False


class EmotionBreakdown(BaseModel):
    anxiety:    float
    sadness:    float
    anger:      float
    joy:        float
    hope:       float
    exhaustion: float


class CheckInEntry(BaseModel):
    id:               str
    date:             str           # ISO datetime
    mood:             str
    journalText:      str
    stressLevel:      int
    sleepQuality:     int
    tags:             List[str]
    emotions:         List[str]     # ["Anxious", "Tired"] — for backward compat
    riskScore:        int           # 0–100
    dominantEmotion:  str
    emotionBreakdown: EmotionBreakdown
    insights:         str
    suggestions:      List[str]
    crisisFlag:       bool
    wordCount:        int
    riskLevel:        str           # low | moderate | high | critical


# ── Helper: convert dominant emotion key → display label ─────────────────────
EMOTION_LABELS = {
    "anxiety":    "Anxious",
    "sadness":    "Sad",
    "anger":      "Angry",
    "joy":        "Happy",
    "hope":       "Hopeful",
    "exhaustion": "Exhausted",
    "neutral":    "Neutral",
}

def _emotion_label(key: str) -> str:
    return EMOTION_LABELS.get(key, key.capitalize())


def _top_emotions_list(emotion_dict: dict, dominant: str) -> List[str]:
    """Convert emotion breakdown dict → sorted list of display labels."""
    # Always include dominant first
    labels = []
    dominant_label = _emotion_label(dominant)
    if dominant != "neutral":
        labels.append(dominant_label)
    # Add others with score > 0.1
    for k, v in sorted(emotion_dict.items(), key=lambda x: -x[1]):
        label = _emotion_label(k)
        if v > 0.1 and label not in labels:
            labels.append(label)
    if not labels:
        labels.append("Neutral")
    return labels[:5]


# ── POST /api/checkins — Analyze + Save ─────────────────────────────────────

@router.post("/checkins", response_model=CheckInEntry)
async def submit_checkin(
    body: CheckInRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Runs the full MindPulse Tri-Model ML analysis on the journal text,
    persists the result to SQLite, and returns the full entry to the frontend.
    """
    # 1. Run ML analysis
    result = analyzer.analyze(
        text=body.text,
        mood=body.mood,
        stress=body.stress,
        sleep=body.sleep,
        energy=body.energy,
        tags=body.tags,
    )

    # 2. Save to DB (combined analyze + persist)
    payload = {
        "mood":       body.mood,
        "stress":     body.stress,
        "sleep":      body.sleep,
        "energy":     body.energy,
        "tags":       body.tags,
        "text":       body.text,
        "voice_used": body.voice_used,
    }
    entry_id = save_checkin(user_id, payload, result)

    # 3. Build response in frontend-compatible format
    emotion_dict = result.get("emotions", {})
    dominant     = result.get("dominant_emotion", "neutral")

    return CheckInEntry(
        id              = entry_id,
        date            = __import__("datetime").datetime.utcnow().isoformat(),
        mood            = body.mood,
        journalText     = body.text,
        stressLevel     = body.stress,
        sleepQuality    = body.sleep,
        tags            = body.tags,
        emotions        = _top_emotions_list(emotion_dict, dominant),
        riskScore       = result["score"],
        dominantEmotion = dominant,
        emotionBreakdown= EmotionBreakdown(**emotion_dict),
        insights        = result["insights"],
        suggestions     = result["suggestions"],
        crisisFlag      = result["crisis_flag"],
        wordCount       = result["word_count"],
        riskLevel       = result["risk_level"],
    )


# ── GET /api/checkins — Fetch History ───────────────────────────────────────

@router.get("/checkins", response_model=List[CheckInEntry])
async def get_checkins(
    limit: int = 50,
    user_id: str = Depends(get_current_user),
):
    """
    Returns the user's check-in history from SQLite, newest first.
    Maps DB column names → frontend field names.
    """
    rows = get_history(user_id, limit=limit)
    entries = []
    for r in rows:
        emotion_dict = r.get("emotions", {})
        dominant     = r.get("dominant", "neutral")
        entries.append(CheckInEntry(
            id              = r["id"],
            date            = r["created_at"],
            mood            = r["mood"],
            journalText     = r.get("journal", ""),
            stressLevel     = r.get("stress", 5),
            sleepQuality    = r.get("sleep", 5),
            tags            = r.get("tags", []),
            emotions        = _top_emotions_list(emotion_dict, dominant),
            riskScore       = r.get("score", 0),
            dominantEmotion = dominant,
            emotionBreakdown= EmotionBreakdown(**(emotion_dict if isinstance(emotion_dict, dict) else {"anxiety":0,"sadness":0,"anger":0,"joy":0,"hope":0,"exhaustion":0})),
            insights        = r.get("insights", ""),
            suggestions     = r.get("suggestions", []),
            crisisFlag      = bool(r.get("crisis_flag", 0)),
            wordCount       = r.get("word_count", 0),
            riskLevel       = r.get("risk_level", "moderate"),
        ))
    return entries
