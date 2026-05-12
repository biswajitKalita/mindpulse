"""
MindPulse — Utility Functions
Shared helpers used across routes and the analyzer model.
"""

import re
import math
from datetime import datetime
from typing import List, Dict


# ── Text Utilities ────────────────────────────────

def clean_text(text: str) -> str:
    """Basic cleanup: strip, normalize whitespace."""
    return re.sub(r"\s+", " ", text.strip())


def word_count(text: str) -> int:
    """Count meaningful words (length > 2)."""
    return len([w for w in text.split() if len(w) > 2])


def estimated_read_time(text: str) -> int:
    """Returns estimated read time in seconds (avg 200 wpm)."""
    return max(1, math.ceil(word_count(text) / 200 * 60))


def truncate(text: str, max_chars: int = 500) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


# ── Score Utilities ───────────────────────────────

def score_to_label(score: int) -> str:
    """Convert numeric score to human-readable label."""
    if score >= 80:
        return "Thriving"
    if score >= 65:
        return "Doing Well"
    if score >= 50:
        return "Balanced"
    if score >= 35:
        return "Struggling"
    return "Needs Support"


def score_to_color(score: int) -> str:
    """Return a hex color representing the score."""
    if score >= 75:
        return "#34d399"   # green
    if score >= 55:
        return "#fbbf24"   # yellow
    if score >= 35:
        return "#f97316"   # orange
    return "#f87171"       # red


def risk_to_emoji(risk: str) -> str:
    return {"low": "✅", "moderate": "⚠️", "high": "🔴", "critical": "🆘"}.get(risk, "❓")


# ── Date Utilities ────────────────────────────────

def utc_now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def format_date(iso: str) -> str:
    """Format ISO string to 'Apr 11, 2026'"""
    try:
        d = datetime.fromisoformat(iso.replace("Z", ""))
        return d.strftime("%b %d, %Y")
    except Exception:
        return iso


# ── Emotion Utilities ─────────────────────────────

def top_emotions(emotions: Dict[str, float], n: int = 3) -> List[str]:
    """Return names of top N emotions by intensity."""
    sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
    return [e for e, v in sorted_emotions if v > 0.05][:n]


def emotion_summary(emotions: Dict[str, float]) -> str:
    """One-line natural language summary of detected emotions."""
    tops = top_emotions(emotions, 2)
    if not tops:
        return "No strong emotions detected."
    if len(tops) == 1:
        return f"Primary emotion: {tops[0].capitalize()}."
    return f"Mix of {tops[0]} and {tops[1]} detected."
