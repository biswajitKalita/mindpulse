"""
MindPulse — Unit Tests for the Analysis Model
Run with:  python -m pytest tests/ -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.analyzer import MindPulseAnalyzer

analyzer = MindPulseAnalyzer()


# ─── Helper ──────────────────────────────────────
def analyze(text, mood="okay", stress=5, sleep=5, energy=5, tags=None):
    return analyzer.analyze(text, mood, stress, sleep, energy, tags or [])


# ─── Score range ─────────────────────────────────
def test_score_in_range():
    r = analyze("I feel okay today, nothing special.")
    assert 0 <= r["score"] <= 100, "Score must be 0–100"


def test_excellent_mood_boosts_score():
    r = analyze("I feel okay.", mood="excellent")
    assert r["score"] > 55, "Excellent mood should produce above-average score"


def test_struggling_mood_lowers_score():
    r = analyze("I feel okay.", mood="struggling")
    assert r["score"] < 45, "Struggling mood should produce below-average score"


# ─── Emotion detection ───────────────────────────
def test_anxiety_detected():
    r = analyze("I am so anxious and worried about everything.")
    assert r["emotions"]["anxiety"] > 0.3, "Anxiety should be detected"


def test_joy_detected():
    r = analyze("I am so happy and grateful for today, feeling wonderful!")
    assert r["emotions"]["joy"] > 0.3, "Joy should be detected"


def test_sadness_detected():
    r = analyze("I feel so sad, hopeless and empty inside.")
    assert r["emotions"]["sadness"] > 0.3, "Sadness should be detected"


def test_exhaustion_detected():
    r = analyze("I am completely exhausted and burnt out from work.")
    assert r["emotions"]["exhaustion"] > 0.3, "Exhaustion should be detected"


# ─── Sentiment ───────────────────────────────────
def test_positive_sentiment():
    r = analyze("Everything is amazing and I love my life today!")
    assert r["sentiment_label"] == "positive"


def test_negative_sentiment():
    r = analyze("I hate everything and feel terrible and awful.")
    assert r["sentiment_label"] == "negative"


# ─── Crisis detection ─────────────────────────────
def test_crisis_flag_triggers():
    r = analyze("I want to kill myself and end my life.")
    assert r["crisis_flag"] is True, "Crisis flag must trigger on crisis text"
    assert r["score"] <= 25, "Crisis should cap score at 25"


def test_no_crisis_flag_normal_text():
    r = analyze("I had a tough day at work but I'm managing.")
    assert r["crisis_flag"] is False


# ─── Text depth ──────────────────────────────────
def test_short_text_is_shallow():
    r = analyze("Bad day.")
    assert r["text_depth"] == "shallow"


def test_long_text_is_reflective_or_deep():
    long = ("Today was a challenging day. " * 8).strip()
    r = analyze(long)
    assert r["text_depth"] in ("reflective", "deep")


# ─── Vitals impact ───────────────────────────────
def test_high_stress_lowers_score():
    low_stress  = analyze("I feel okay.", stress=2)["score"]
    high_stress = analyze("I feel okay.", stress=9)["score"]
    assert high_stress < low_stress, "Higher stress should lower the score"


def test_good_sleep_raises_score():
    bad_sleep  = analyze("I feel okay.", sleep=2)["score"]
    good_sleep = analyze("I feel okay.", sleep=9)["score"]
    assert good_sleep > bad_sleep, "Better sleep should increase the score"


# ─── Suggestions ─────────────────────────────────
def test_suggestions_returned():
    r = analyze("Feeling anxious and worried about work.")
    assert len(r["suggestions"]) == 3, "Always return exactly 3 suggestions"


# ─── Risk levels ─────────────────────────────────
def test_risk_levels_consistent():
    high  = analyze("I am happy, energized and grateful!", mood="excellent", stress=1, sleep=9, energy=9)
    low   = analyze("I am devastated, hopeless and exhausted.", mood="struggling", stress=9, sleep=1, energy=1)
    assert high["score"] > low["score"]
    assert high["risk_level"] in ("low", "moderate")
    assert low["risk_level"]  in ("high", "critical")


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f"  ✅ {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ {t.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  💥 {t.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed out of {passed+failed} tests")
