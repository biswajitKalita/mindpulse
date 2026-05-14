"""
MindPulse Analysis Model v2.0
==============================
Hybrid NLP engine with advanced text understanding.

Upgrade pipeline over v1:
  1. Negation handling  Ã¢ÂÂ "not anxious" cancels anxiety detection
  2. Intensity modifiers Ã¢ÂÂ "very", "extremely", "slightly" scale weights
  3. Sentence-level analysis Ã¢ÂÂ per-sentence emotion aggregation
  4. Improvement signals  Ã¢ÂÂ "getting better", "doing okay now" Ã¢ÂÂ boost score
  5. Support network detection Ã¢ÂÂ mentions of friends/family Ã¢ÂÂ resilience boost
  6. Balanced multi-factor scoring with confidence score
  7. Dynamic, personalized insight generation
  8. Expanded crisis detection (30 phrases)
"""

import re
import warnings
from typing import Dict, List, Tuple
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import joblib

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import os as _os
_BASE = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_MODELS = _os.path.join(_BASE, "mindpulse", "Models")

try:
    final_model = joblib.load(_os.path.join(_MODELS, 'final_model.pkl'))
    final_vectorizer = joblib.load(_os.path.join(_MODELS, 'final_vectorizer.pkl'))

    suicide_model = joblib.load(_os.path.join(_MODELS, 'suicide_model.pkl'))
    suicide_vectorizer = joblib.load(_os.path.join(_MODELS, 'suicide_vectorizer.pkl'))

    isear_model = joblib.load(_os.path.join(_MODELS, 'isear_model.pkl'))
    isear_vectorizer = joblib.load(_os.path.join(_MODELS, 'isear_vectorizer.pkl'))
    ML_ENABLED = True
except Exception as e:
    print(f"MindPulse NLP Models Failed to Load: {e}")
    ML_ENABLED = False


# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  EMOTION LEXICONS  word Ã¢ÂÂ base weight (0.0 Ã¢ÂÂ 1.0)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
EMOTION_LEXICONS: Dict[str, Dict[str, float]] = {
    "anxiety": {
        "anxious": 0.85, "anxiety": 0.90, "worried": 0.80, "worry": 0.75,
        "nervous": 0.70, "panic": 0.90, "panicking": 0.92, "fear": 0.75,
        "scared": 0.70, "dread": 0.80, "overthinking": 0.78, "stress": 0.65,
        "stressed": 0.72, "tense": 0.65, "restless": 0.62, "uneasy": 0.65,
        "apprehensive": 0.75, "phobia": 0.80, "hyperventilating": 0.90,
        "on edge": 0.72, "can't sleep": 0.68, "racing thoughts": 0.80,
        "heart racing": 0.75, "sweating": 0.55, "shaking": 0.65,
        "catastrophizing": 0.80, "spiraling": 0.78,
    },
    "sadness": {
        "sad": 0.80, "sadness": 0.85, "depressed": 0.92, "depression": 0.92,
        "unhappy": 0.75, "cry": 0.70, "crying": 0.75, "tears": 0.66,
        "hopeless": 0.92, "empty": 0.82, "numb": 0.82, "grief": 0.87,
        "lonely": 0.78, "alone": 0.60, "isolated": 0.78, "miserable": 0.86,
        "heartbroken": 0.87, "devastated": 0.92, "broken": 0.72,
        "worthless": 0.92, "failure": 0.72, "lost": 0.58, "melancholy": 0.75,
        "gloomy": 0.70, "despondent": 0.85, "dejected": 0.80,
        "down": 0.55, "low mood": 0.80, "feel bad": 0.60,
    },
    "anger": {
        "angry": 0.82, "anger": 0.85, "furious": 0.92, "frustrated": 0.72,
        "frustration": 0.76, "annoyed": 0.62, "rage": 0.92, "hatred": 0.86,
        "irritated": 0.66, "resentment": 0.76, "bitter": 0.66, "mad": 0.72,
        "hostile": 0.82, "aggressive": 0.76, "outraged": 0.86,
        "fed up": 0.72, "fed up with": 0.74, "sick of": 0.68,
        "can't stand": 0.70, "hate this": 0.74,
    },
    "joy": {
        "happy": 0.82, "happiness": 0.86, "joyful": 0.86, "joy": 0.82,
        "wonderful": 0.82, "amazing": 0.78, "great": 0.62, "fantastic": 0.82,
        "love": 0.72, "grateful": 0.82, "gratitude": 0.86, "blessed": 0.82,
        "excited": 0.78, "thrilled": 0.82, "delighted": 0.82, "cheerful": 0.78,
        "content": 0.66, "satisfied": 0.66, "proud": 0.72, "accomplished": 0.78,
        "ecstatic": 0.90, "overjoyed": 0.88, "elated": 0.85, "peaceful": 0.72,
        "calm": 0.62, "relaxed": 0.65, "at peace": 0.72, "good day": 0.65,
    },
    "hope": {
        "hopeful": 0.87, "hope": 0.78, "optimistic": 0.82, "optimism": 0.82,
        "better": 0.55, "improve": 0.62, "improving": 0.68, "progress": 0.68,
        "trying": 0.56, "effort": 0.56, "working on": 0.62,
        "looking forward": 0.72, "motivated": 0.78, "determined": 0.78,
        "confident": 0.72, "believe": 0.62, "recovery": 0.72,
        "healing": 0.72, "positive": 0.62, "getting better": 0.80,
        "things will": 0.65, "stronger": 0.68, "resilient": 0.75,
        "won't give up": 0.82, "keeping going": 0.72, "moving forward": 0.72,
    },
    "exhaustion": {
        "tired": 0.76, "exhausted": 0.86, "exhaustion": 0.86, "drained": 0.82,
        "overwhelmed": 0.82, "burnt out": 0.92, "burnout": 0.92, "fatigue": 0.82,
        "fatigued": 0.82, "worn out": 0.82, "overworked": 0.78, "sleepy": 0.56,
        "sluggish": 0.66, "no energy": 0.82, "can't cope": 0.86,
        "running on empty": 0.85, "too much": 0.56, "can't anymore": 0.85,
        "giving up": 0.80, "done with": 0.65, "dead inside": 0.88,
        "nothing left": 0.85, "collapse": 0.80,
    },
}

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  NEGATION WORDS  (reverse emotion polarity)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
NEGATIONS = {
    "not", "no", "never", "neither", "nor", "don't", "doesn't", "didn't",
    "isn't", "aren't", "wasn't", "weren't", "won't", "wouldn't", "can't",
    "couldn't", "shouldn't", "hadn't", "haven't", "hasn't", "barely",
    "hardly", "scarcely", "without", "lack", "lacking", "nothing",
}

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  INTENSITY MODIFIERS  (scale emotion weight up/down)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
INTENSIFIERS = {
    "very": 1.35, "extremely": 1.60, "incredibly": 1.55, "absolutely": 1.50,
    "totally": 1.40, "completely": 1.45, "terribly": 1.50, "so": 1.25,
    "really": 1.25, "deeply": 1.35, "profoundly": 1.45, "overwhelmingly": 1.55,
}
DIMINISHERS = {
    "slightly": 0.55, "a little": 0.60, "a bit": 0.60, "somewhat": 0.65,
    "kind of": 0.65, "sort of": 0.65, "fairly": 0.75, "rather": 0.80,
    "almost": 0.75, "little": 0.60, "mildly": 0.65,
}

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  IMPROVEMENT SIGNALS  (things getting better)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
IMPROVEMENT_SIGNALS = [
    "getting better", "feeling better", "improving", "on the mend",
    "turning around", "things are looking up", "more hopeful",
    "doing better than", "slowly recovering", "making progress",
    "step in the right direction", "not as bad", "less anxious",
    "less stressed", "starting to feel", "beginning to feel",
]

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  SUPPORT NETWORK SIGNALS  (resilience boost)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
SUPPORT_SIGNALS = [
    "talked to", "spoke with", "reached out", "my friend", "my family",
    "my partner", "my therapist", "support", "therapy", "counseling",
    "someone helped", "helped me", "not alone", "together",
]

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  CRISIS KEYWORDS  (30 high-risk phrases)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
CRISIS_KEYWORDS = [
    "suicidal", "suicide", "kill myself", "want to die", "end my life",
    "self harm", "self-harm", "cutting myself", "hurt myself", "no reason to live",
    "better off dead", "give up on life", "not worth living", "ending it all",
    "ending it all", "overdose", "can't go on", "don't want to be here",
    "wish i was dead", "wish i were dead", "rather be dead", "take my life",
    "end it all", "end the pain", "no point living", "no will to live",
    "disappear forever", "never wake up", "sleep forever", "can't do this anymore",
]

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  MOOD WEIGHTS  (selected by user in Step 1)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
MOOD_WEIGHTS = {
    "excellent": 22,
    "good":      14,
    "okay":       0,
    "low":       -14,
    "struggling":-24,
}


# ===================================================================
#  TAG RISK WEIGHTS
# ===================================================================
HIGH_RISK_TAGS   = {"Relationships": -4, "Finance": -3, "Health": -3, "Sleep": -4}
POSITIVE_TAGS    = {"Exercise": +3, "Self-care": +3, "Social": +2}

# ===================================================================
#  VITALS SCORING WEIGHTS  (v2.1 - Micro-Assessment upgrade)
#
#  Input contract: stress / sleep / energy as integers 0-10.
#  Both old slider clients AND the new multi-question micro-
#  assessment produce the same 0-10 scale, so backward compat
#  is fully automatic with zero API schema changes.
#
#  Why slightly higher multipliers in v2.1?
#    The micro-assessment uses 3 behavioural questions per
#    dimension, producing more reliable values than a single
#    raw slider drag. Higher multipliers reward that improved
#    precision without breaking score continuity for users.
#
#  v2.0 (slider):   stress=2.0  sleep=1.6  energy=1.2  => vitals +/-24
#  v2.1 (assessed): stress=2.3  sleep=1.9  energy=1.5  => vitals +/-28
#  Net increase: ~+17% in vitals range.
#
#  Sentiment range reduced 30->28 to rebalance total so
#  existing users do not see a sudden jump in their scores.
# ===================================================================
VITALS_WEIGHTS = {
    # (neutral_centre, multiplier)
    # stress  -> higher = more stressed  = LOWER  wellness score
    # sleep   -> higher = better sleep   = HIGHER wellness score
    # energy  -> higher = more energetic = HIGHER wellness score
    "stress": (5, 2.3),   # v2.0: 2.0  (+15%)
    "sleep" : (5, 1.9),   # v2.0: 1.6  (+19%)
    "energy": (5, 1.5),   # v2.0: 1.2  (+25%)
}

# Sentiment contribution range (+/-28).
# Slightly reduced from +/-30 to rebalance vs upweighted vitals block.
SENTIMENT_RANGE = 28

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  DYNAMIC INSIGHTS  (generated at analysis time)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
INSIGHTS_TEMPLATES = {
    "critical": [
        "Your words carry a deep kind of pain right now, and it takes real courage "
        "to put it into words. Please know you're not alone Ã¢ÂÂ reaching out to someone "
        "you trust, or a mental health professional, can make a real difference today.",
        "What you've shared reflects significant distress. You don't have to carry this "
        "alone. Please consider contacting a trusted person or mental health helpline immediately.",
    ],
    "high": [
        "There's a noticeable weight in what you've shared Ã¢ÂÂ your feelings are completely valid. "
        "You're clearly carrying more than usual. Even one small step, like taking a slow breath "
        "or texting someone you trust, can begin to shift things. You deserve support.",
        "Your reflection shows real strain. Be gentle with yourself today. "
        "Small acts of self-care Ã¢ÂÂ rest, hydration, human connection Ã¢ÂÂ have more impact than they seem.",
    ],
    "moderate": [
        "You're navigating real challenges, but there's also resilience in your reflection. "
        "Acknowledging how you feel honestly is already meaningful. Focus on one small thing "
        "you can do for yourself today, and be patient with your progress.",
        "You seem to be in a mixed place Ã¢ÂÂ some difficulties, but you're still reflecting and engaging. "
        "That self-awareness is a strength. Lean into it by setting one gentle intention for today.",
    ],
    "good": [
        "You appear to be in a fairly stable place. There may be minor stressors, "
        "but your overall tone reflects balance and groundedness. "
        "Keep nurturing what's working Ã¢ÂÂ consistency builds resilience.",
        "Your check-in reflects reasonable equilibrium. Stay mindful of the small things "
        "that keep you grounded, and continue showing up for yourself.",
    ],
    "low": [
        "You're doing genuinely well! Your reflection shows a positive and grounded mindset. "
        "Keep nurturing the habits, routines, and relationships that are lifting you Ã¢ÂÂ "
        "this foundation is worth protecting and sharing.",
        "What a strong check-in! Your words reflect wellbeing and self-awareness. "
        "Celebrate this Ã¢ÂÂ and consider how you can help someone else today.",
    ],
}

# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  SUGGESTIONS  (expanded, evidence-based)
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
SUGGESTIONS: Dict[str, List[str]] = {
    "anxiety": [
        "Try box breathing: inhale 4s Ã¢ÂÂ hold 4s Ã¢ÂÂ exhale 4s Ã¢ÂÂ hold 4s. Repeat 4 times",
        "Write down your top 3 worries, then write one realistic counter-thought for each",
        "Limit caffeine and screen time for the next 2 hours Ã¢ÂÂ both heighten anxiety",
        "Ground yourself: name 5 things you can see, 4 you can touch, 3 you can hear",
    ],
    "sadness": [
        "Reach out to one person you trust today Ã¢ÂÂ even a short text matters",
        "Step outside for 10 minutes. Sunlight and movement genuinely shift mood",
        "Listen to music that matches your mood first, then gradually shifts lighter",
        "Write 3 things Ã¢ÂÂ however small Ã¢ÂÂ that you can appreciate right now",
    ],
    "anger": [
        "Take a 10-minute walk before responding to whatever triggered this",
        "Journal the trigger without filtering Ã¢ÂÂ get it all out, then re-read calmly",
        "Try progressive muscle relaxation: tense each muscle group for 5s, then release",
        "Ask yourself: 'Will this matter in 5 years?' Ã¢ÂÂ it reframes urgency",
    ],
    "exhaustion": [
        "Protect your sleep tonight Ã¢ÂÂ set a hard 'screens off' time 1 hour before bed",
        "Identify one task you can legitimately drop or delegate today",
        "A 20-minute power nap (set an alarm) can restore alertness without grogginess",
        "Drink a full glass of water now Ã¢ÂÂ dehydration amplifies fatigue significantly",
    ],
    "joy": [
        "Document specifically what made today good Ã¢ÂÂ anchor this feeling in memory",
        "Share your positive energy with someone who needs it Ã¢ÂÂ it multiplies",
        "Plan one small thing to look forward to tomorrow to carry the momentum",
        "Reflect: what habit or decision contributed to this good day? Do more of it",
    ],
    "hope": [
        "Convert your optimism into one concrete action you can take today",
        "Set one micro-goal for the next 24 hours and tell someone about it",
        "Write a short note to your future self about what you're working toward",
        "Share your progress with one supportive person Ã¢ÂÂ accountability accelerates growth",
    ],
    "general_low": [
        "Consider scheduling a session with a mental health professional this week",
        "Use MindPulse's Resources section for guided breathing and crisis support",
        "Talk to a trusted friend or family member Ã¢ÂÂ sharing reduces emotional load by up to 40%",
    ],
    "general_mid": [
        "Try a 5-minute body scan meditation Ã¢ÂÂ close your eyes and notice each body part",
        "Hydrate, take regular breaks, and step away from screens periodically today",
        "Write down one thing you're grateful for right now Ã¢ÂÂ specificity makes it more effective",
    ],
    "general_hi": [
        "Celebrate your wins today, no matter how small they seem",
        "Maintain the routines and relationships that are working for you",
        "Consider helping someone else today Ã¢ÂÂ acts of kindness boost your own wellbeing",
    ],
}


# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
#  MAIN ANALYZER CLASS
# Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

class MindPulseAnalyzer:
    """
    MindPulse v2.0 Ã¢ÂÂ Advanced wellness scoring engine.

    Key improvements over v1:
    - Negation detection (3-word lookback window per sentence)
    - Intensity modifier scaling (very/extremely/slightly etc.)
    - Sentence-level emotion aggregation
    - Improvement & support network signal detection
    - Balanced, interpretable scoring formula
    - Confidence score for model certainty
    - Personalized dynamic insights
    """

    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()

    # Ã¢ÂÂÃ¢ÂÂ Tokenise into sentences Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _sentences(self, text: str) -> List[str]:
        return [s.strip() for s in re.split(r'[.!?]+', text.lower()) if s.strip()]

    # Ã¢ÂÂÃ¢ÂÂ Preprocess full text Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _preprocess(self, text: str) -> str:
        return re.sub(r'\s+', ' ', text.lower().strip())

    # Ã¢ÂÂÃ¢ÂÂ VADER sentiment Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _sentiment(self, text: str) -> Tuple[float, str]:
        scores  = self.vader.polarity_scores(text)
        compound = round(scores["compound"], 4)
        label   = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"
        return compound, label

    # Ã¢ÂÂÃ¢ÂÂ Negation window check Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _has_negation(self, words: List[str], idx: int, window: int = 4) -> bool:
        """Check if any of the `window` words before index `idx` is a negation."""
        start = max(0, idx - window)
        return any(w in NEGATIONS for w in words[start:idx])

    # Ã¢ÂÂÃ¢ÂÂ Intensity modifier Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _intensity_multiplier(self, words: List[str], idx: int, window: int = 3) -> float:
        """Look back `window` words for intensifiers or diminishers."""
        start = max(0, idx - window)
        context = " ".join(words[start:idx])
        # Check diminishers first (multi-word like "a little")
        for phrase, mult in DIMINISHERS.items():
            if phrase in context:
                return mult
        # Then single-word intensifiers
        for w in words[start:idx]:
            if w in INTENSIFIERS:
                return INTENSIFIERS[w]
        return 1.0

    # Ã¢ÂÂÃ¢ÂÂ Sentence-level emotion detection Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _detect_emotions(self, text: str) -> Dict[str, float]:
        """
        Analyse each sentence separately with negation + intensity awareness,
        then aggregate weighted scores across the full text.
        """
        totals: Dict[str, float] = {e: 0.0 for e in EMOTION_LEXICONS}
        sentences = self._sentences(text)
        if not sentences:
            sentences = [text]

        for sentence in sentences:
            words = sentence.split()
            for emotion, lexicon in EMOTION_LEXICONS.items():
                # Single-word matches
                for i, word in enumerate(words):
                    if word in lexicon:
                        base  = lexicon[word]
                        mult  = self._intensity_multiplier(words, i)
                        score = base * mult
                        # Negate if preceded by negation word
                        if self._has_negation(words, i):
                            # Negated negative emotion Ã¢ÂÂ reduce score to 0
                            # Negated positive emotion Ã¢ÂÂ reduce score to 0
                            # In both cases we simply skip the contribution
                            continue
                        totals[emotion] += score
                # Multi-word phrase matches
                for phrase, weight in lexicon.items():
                    if " " in phrase and phrase in sentence:
                        # Simple negation check for phrases
                        phrase_idx = sentence.find(phrase)
                        pre = sentence[:phrase_idx].split()
                        if not any(w in NEGATIONS for w in pre[-4:]):
                            totals[emotion] += weight

        # Normalise each to 0Ã¢ÂÂ1  (cap at 1.0)
        for emotion in totals:
            totals[emotion] = min(1.0, round(totals[emotion] / max(len(sentences), 1), 4))
        return totals

    # Ã¢ÂÂÃ¢ÂÂ Vitals normaliser (backward-compat) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    @staticmethod
    def _normalize_vitals(stress, sleep, energy):
        """Clamp vitals to [0, 10] safely.

        Handles:
          - Old slider clients (already 0-10 integers)
          - New micro-assessment clients (also 0-10)
          - Edge cases: None, floats, out-of-range values
        """
        def _clamp(v, default=5):
            try:
                return max(0, min(10, int(v)))
            except (TypeError, ValueError):
                return default
        return _clamp(stress), _clamp(sleep), _clamp(energy)

    # Ã¢ÂÂÃ¢ÂÂ Crisis detection Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _check_crisis(self, text: str) -> bool:
        for phrase in CRISIS_KEYWORDS:
            if phrase in text:
                return True
        return False

    # Ã¢ÂÂÃ¢ÂÂ Improvement signals Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _improvement_bonus(self, text: str) -> int:
        hits = sum(1 for s in IMPROVEMENT_SIGNALS if s in text)
        return min(8, hits * 3)   # max +8 bonus

    # Ã¢ÂÂÃ¢ÂÂ Support network signals Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _support_bonus(self, text: str) -> int:
        hits = sum(1 for s in SUPPORT_SIGNALS if s in text)
        return min(6, hits * 2)   # max +6 bonus

    # Ã¢ÂÂÃ¢ÂÂ Text depth Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _text_depth(self, text: str) -> Tuple[str, int]:
        words = [w for w in text.split() if len(w) > 2]
        n = len(words)
        if n < 10:   return "shallow",    n
        if n < 25:   return "moderate",   n
        if n < 60:   return "reflective", n
        return "deep", n

    # Ã¢ÂÂÃ¢ÂÂ Confidence score (how much text data we had) Ã¢ÂÂ
    def _confidence(self, word_count: int, depth: str) -> float:
        """Returns 0.0Ã¢ÂÂ1.0 confidence in the model output."""
        if word_count < 5:   return 0.40
        if word_count < 15:  return 0.60
        if word_count < 40:  return 0.80
        return 0.95

    # Ã¢ÂÂÃ¢ÂÂ Dominant emotion Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _dominant(self, emotions: Dict[str, float]) -> str:
        top = max(emotions, key=emotions.get)
        return top if emotions[top] > 0.08 else "neutral"

    # Ã¢ÂÂÃ¢ÂÂ Wellness score calculation Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _compute_score(
        self,
        sentiment:  float,
        emotions:   Dict[str, float],
        mood:       str,
        stress:     int,
        sleep:      int,
        energy:     int,
        tags:       List[str],
        crisis:     bool,
        depth:      str,
        text:       str,
        ) -> int:
        # Sanitise inputs -- safe for both old slider and new micro-assessment
        s, sl, e = self._normalize_vitals(stress, sleep, energy)

        # -- Component 1: Sentiment (-28 ... +28) --------------------------
        # v2.1: range reduced 30->28 to rebalance vs upweighted vitals block
        sent_score = round(sentiment * SENTIMENT_RANGE)

        # -- Component 2: Vitals (-28 ... +28)  v2.1 ----------------------
        # stress: 0->+11.5, 10->-11.5  (higher stress = worse wellness)
        # sleep:  0->-9.5,  10->+9.5   (higher sleep  = better wellness)
        # energy: 0->-7.5,  10->+7.5   (higher energy = better wellness)
        sc  = VITALS_WEIGHTS["stress"]
        slc = VITALS_WEIGHTS["sleep"]
        ec  = VITALS_WEIGHTS["energy"]
        vitals = (round((sc[0]  - s)  * sc[1])
                + round((sl - slc[0]) * slc[1])
                + round((e  - ec[0])  * ec[1]))

        # -- Component 3: Mood (-24 ... +22) --------------------------------
        mood_score = MOOD_WEIGHTS.get(mood, 0)

        # -- Component 4: Emotions (-24 ... +14) ----------------------------
        neg_emotion = (emotions["anxiety"]    * 9
                     + emotions["sadness"]    * 9
                     + emotions["anger"]      * 6
                     + emotions["exhaustion"] * 7)
        pos_emotion = (emotions["joy"]  * 9
                     + emotions["hope"] * 5)
        emotion_score = round(pos_emotion - neg_emotion)

        # -- Component 5: Tags (-8 ... +6) ----------------------------------
        tag_score  = sum(HIGH_RISK_TAGS.get(t, 0) for t in tags)
        tag_score += sum(POSITIVE_TAGS.get(t, 0)  for t in tags)

        # -- Component 6: Bonus signals (+0 ... +14) ------------------------
        bonus = self._improvement_bonus(text) + self._support_bonus(text)
        if depth in ("reflective", "deep"):
            bonus += 3

        # -- Final score ----------------------------------------------------
        raw = 50 + sent_score + vitals + mood_score + emotion_score + tag_score + bonus
        if crisis:
            raw = min(raw, 20)   # crisis hard cap
        return max(0, min(100, round(raw)))

    # Ã¢ÂÂÃ¢ÂÂ Risk level Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _risk_level(self, score: int, crisis: bool) -> str:
        if crisis:        return "critical"
        if score >= 78:   return "low"
        if score >= 58:   return "moderate"
        if score >= 36:   return "high"
        return "critical"

    # Ã¢ÂÂÃ¢ÂÂ Dynamic insight Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _insight(self, risk: str, dominant: str, improvement: int, support: int) -> str:
        import random
        base = random.choice(INSIGHTS_TEMPLATES.get(risk, INSIGHTS_TEMPLATES["moderate"]))
        # Append personalised modifier
        if improvement > 0 and risk not in ("critical", "high"):
            base += " It's encouraging to see signs of progress in what you shared."
        if support > 0:
            base += " Reaching out to others shows real self-awareness and strength."
        if dominant == "exhaustion" and risk == "moderate":
            base += " Pay special attention to rest Ã¢ÂÂ exhaustion compounds other difficulties."
        return base

    # Ã¢ÂÂÃ¢ÂÂ Suggestions Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def _get_suggestions(self, dominant: str, risk: str, score: int) -> List[str]:
        if risk == "critical":
            return SUGGESTIONS["general_low"]

        pool = list(SUGGESTIONS.get(dominant, []))

        if score >= 72:
            general = SUGGESTIONS["general_hi"]
        elif score >= 45:
            general = SUGGESTIONS["general_mid"]
        else:
            general = SUGGESTIONS["general_low"]

        # Pick 2 from emotion-specific pool + 1 general
        specific = pool[:2] if len(pool) >= 2 else pool
        combined = specific + [general[0]]
        return combined[:3] if len(combined) >= 3 else (general[:3])

    # Ã¢ÂÂÃ¢ÂÂ PUBLIC ENTRY POINT Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
    def analyze(
        self,
        text:   str,
        mood:   str,
        stress: int,
        sleep:  int,
        energy: int,
        tags:   List[str],
    ) -> dict:
        clean   = self._preprocess(text)
        depth, word_count = self._text_depth(clean)
        improvement_bonus = self._improvement_bonus(clean)
        support_bonus     = self._support_bonus(clean)
        
        # We process basic fallbacks so keys don't break
        emotions = self._detect_emotions(clean)
        
        if ML_ENABLED and clean.strip():
            # Clean text strictly for vectorizers
            ml_text = re.sub(r"[^a-z\s]", "", str(text).lower())
            ml_success = False
            try:
                # 1. SUICIDE / CRISIS detector
                s_vec    = suicide_vectorizer.transform([ml_text])
                s_proba  = suicide_model.predict_proba(s_vec)[0]
                s_classes = list(suicide_model.classes_)
                # Find the POSITIVE 'suicide' class index — must exclude 'non-suicide'.
                # Bug note: 'suicid' in str(c) also matches 'non-suicide' (index 0),
                # so we require the class label to NOT contain 'non' as well.
                suicide_idx = next(
                    (i for i, c in enumerate(s_classes)
                     if 'suicid' in str(c).lower() and 'non' not in str(c).lower()),
                    None
                )
                suicide_confidence = float(s_proba[suicide_idx]) if suicide_idx is not None else 0.0

                # Crisis only when BOTH the ML is confident AND keyword rules confirm.
                # Removed the lone ">= 0.92" shortcut — it bypassed keyword rules and
                # caused false positives on any text where non-suicide prob was high.
                ml_crisis   = suicide_confidence >= 0.75
                rule_crisis = self._check_crisis(clean)
                crisis = ml_crisis and rule_crisis

                # 2. ISEAR EMOTION detector
                i_vec = isear_vectorizer.transform([ml_text])
                isear_pred    = isear_model.predict(i_vec)[0]
                isear_proba   = isear_model.predict_proba(i_vec)[0]
                isear_classes = list(isear_model.classes_)
                isear_conf    = float(isear_proba[isear_classes.index(isear_pred)])

                # Full ISEAR 7-class Ã¢ÂÂ MindPulse UI label mapping
                emotion_mapping = {
                    "fear":    "anxiety",
                    "joy":     "joy",
                    "sadness": "sadness",
                    "anger":   "anger",
                    "disgust": "anger",
                    "guilt":   "sadness",
                    "shame":   "sadness",
                }
                dominant = emotion_mapping.get(str(isear_pred).lower(), "sadness")

                # Boost the matching emotion bucket proportionally to the ISEAR confidence
                if dominant in emotions:
                    emotions[dominant] = min(1.0, emotions[dominant] + isear_conf * 0.8)
                else:
                    emotions[dominant] = isear_conf * 0.8

                # 3. FINAL MODEL RISK detector
                f_vec = final_vectorizer.transform([ml_text])
                probs        = final_model.predict_proba(f_vec)[0]
                classes_list = list(final_model.classes_)

                # Safely find class indices by partial match (handles label variations)
                def _idx(cl, name):
                    for i, c in enumerate(cl):
                        if str(c).lower() == name.lower():
                            return i
                    return None

                hi_idx  = _idx(classes_list, "high")
                lo_idx  = _idx(classes_list, "low")
                mo_idx  = _idx(classes_list, "moderate")
                if hi_idx is None or lo_idx is None or mo_idx is None:
                    raise ValueError(f"Unexpected final_model classes: {classes_list}")

                p_high     = probs[hi_idx]
                p_low      = probs[lo_idx]
                p_moderate = probs[mo_idx]

                # HYBRID SCORE
                vader_compound = self.vader.polarity_scores(text)["compound"]
                ml_score = (p_low * 85) + (p_moderate * 50) + (p_high * 12)

                if vader_compound >= 0.5:
                    vader_wellness = 65 + (vader_compound * 33)
                    score = round(vader_wellness * 0.7 + ml_score * 0.3)
                elif vader_compound <= -0.4:
                    score = round(ml_score * 0.6 + (58 + vader_compound * 22) * 0.4)
                else:
                    vader_wellness = 58 + vader_compound * 18
                    score = round(ml_score * 0.50 + vader_wellness * 0.50)

                # ISEAR emotion fine-tune (ÃÂ±8)
                isear_correction = 0
                if dominant == "joy":                        isear_correction = +8
                elif dominant in ("anxiety", "sadness"):    isear_correction = -8
                elif dominant == "anger":                    isear_correction = -5

                score = round(score + isear_correction)
                score = max(5, min(98, score))

                if crisis:
                    score = min(score, 20)
                    risk  = "critical"
                else:
                    if score >= 70:   risk = "low"
                    elif score >= 45: risk = "moderate"
                    else:             risk = "high"

                sent_score = (score - 50) / 50.0
                sent_label = "negative" if score < 40 else "positive" if score > 60 else "neutral"
                ml_success = True

            except Exception as ml_err:
                print(f"[ML INFERENCE ERROR] {ml_err!r} Ã¢ÂÂ using rule-based fallback")
                ml_success = False

            if not ml_success:
                # ML crashed mid-inference Ã¢ÂÂ fall back to rule-based
                sent_score, sent_label = self._sentiment(clean)
                crisis   = self._check_crisis(clean)
                dominant = self._dominant(emotions)
                score    = self._compute_score(sent_score, emotions, mood, stress, sleep, energy, tags, crisis, depth, clean)
                risk     = self._risk_level(score, crisis)

        else:
            # Complete Rule-based Fallback (ML disabled or empty text)
            sent_score, sent_label = self._sentiment(clean)
            crisis   = self._check_crisis(clean)
            dominant = self._dominant(emotions)
            score    = self._compute_score(sent_score, emotions, mood, stress, sleep, energy, tags, crisis, depth, clean)
            risk     = self._risk_level(score, crisis)

        insight  = self._insight(risk, dominant, improvement_bonus, support_bonus)
        suggestions = self._get_suggestions(dominant, risk, score)
        confidence  = 0.96 if ML_ENABLED else self._confidence(word_count, depth)

        return {
            "score":            score,
            "risk_level":       risk,
            "confidence":       confidence,
            "emotions": {
                "anxiety":    emotions["anxiety"],
                "sadness":    emotions["sadness"],
                "anger":      emotions["anger"],
                "joy":        emotions["joy"],
                "hope":       emotions["hope"],
                "exhaustion": emotions["exhaustion"],
            },
            "dominant_emotion": dominant,
            "sentiment_label":  sent_label if not ML_ENABLED else ("negative" if score < 40 else "positive" if score > 60 else "neutral"),
            "sentiment_score":  sent_score if not ML_ENABLED else (score - 50) / 50.0,
            "text_depth":       depth,
            "insights":         insight,
            "suggestions":      suggestions,
            "crisis_flag":      crisis,
            "word_count":       word_count,
        }
