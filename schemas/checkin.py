from pydantic import BaseModel, Field
from typing import Optional, List


class CheckInRequest(BaseModel):
    text: str = Field(..., description="Combined journal text + voice transcript")
    mood: str = Field(..., description="excellent | good | okay | low | struggling")
    stress: int = Field(..., ge=0, le=10, description="Stress level 0-10")
    sleep: int = Field(..., ge=0, le=10, description="Sleep quality 0-10")
    energy: int = Field(..., ge=0, le=10, description="Energy level 0-10")
    tags: Optional[List[str]] = Field(default=[], description="Trigger tags selected")
    voice_used: Optional[bool] = Field(default=False)
    timestamp: Optional[str] = None


class EmotionBreakdown(BaseModel):
    anxiety: float
    sadness: float
    anger: float
    joy: float
    hope: float
    exhaustion: float


class AnalysisResponse(BaseModel):
    score: int = Field(..., description="Wellness score 0–100")
    risk_level: str = Field(..., description="low | moderate | high | critical")
    confidence: float = Field(..., description="Model confidence 0.0–1.0")
    emotions: EmotionBreakdown
    dominant_emotion: str
    sentiment_label: str         # positive | neutral | negative
    sentiment_score: float       # -1.0 to 1.0
    text_depth: str              # shallow | moderate | reflective | deep
    insights: str                # personalised insight paragraph
    suggestions: List[str]       # 3 evidence-based suggestions
    crisis_flag: bool
    word_count: int
