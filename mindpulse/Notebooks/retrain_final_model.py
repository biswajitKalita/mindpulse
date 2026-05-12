"""
MindPulse — Retrain Final Model with Better Labels
=====================================================
Problem:  The original final_model.pkl labels ANY negatively-toned text as
          "high" risk because the training data mixed mild stress content from
          mental-health subreddits with genuinely severe crisis content.

Fix:      Use a VADER + keyword-based re-labelling pipeline to split
          ambiguous "high" entries into "moderate" when the sentiment
          is only mildly negative and no crisis keywords are present.
          Then retrain Logistic Regression on the corrected dataset.

Run from: C:/Users/ashik/OneDrive/Desktop/mindpulse_backend
"""

import re, warnings, os
import numpy as np
import pandas as pd
import joblib

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

warnings.filterwarnings('ignore')

DATA    = "mindpulse/Data"
MODELS  = "mindpulse/Models"
vader   = SentimentIntensityAnalyzer()

# ─── Hard crisis keywords (always → "high") ─────────────────────────────────
CRISIS_KEYWORDS = [
    "want to die", "kill myself", "end my life", "end everything",
    "suicide", "suicidal", "no reason to live", "cant go on", "cant take it anymore",
    "self harm", "self-harm", "cutting myself", "overdose", "jump off",
]

MODERATE_KEYWORDS = [
    "stressed", "anxious", "anxiety", "tired", "overwhelmed", "worried",
    "exam", "deadline", "pressure", "crying", "sad", "burnout", "lonely",
    "nervous", "panic", "fear", "scared", "frustrated", "angry",
]


# ─── Text cleaning ───────────────────────────────────────────────────────────
def clean(t):
    t = str(t).lower()
    t = re.sub(r"[^a-z\s]", "", t)
    return t.strip()


# ─── Smart re-labeller ───────────────────────────────────────────────────────
def smart_label(text: str, original_label: str) -> str:
    """
    Re-labels ambiguous 'high' entries more accurately:
    - Always 'high' if crisis keywords present
    - 'moderate' if original was 'high' but VADER is only mildly negative
      AND moderate-level keywords are present
    - 'low' only if VADER is clearly positive
    - Otherwise keep original_label
    """
    lower = text.lower()
    vader_score = vader.polarity_scores(text)["compound"]

    # Rule 1: Crisis keyword → always high
    if any(kw in lower for kw in CRISIS_KEYWORDS):
        return "high"

    # Rule 2: Clearly positive text → low
    if vader_score >= 0.45:
        return "low"

    # Rule 3: Original "high" + only mildly negative + moderate keywords → moderate
    if original_label == "high" and vader_score >= -0.55:
        if any(kw in lower for kw in MODERATE_KEYWORDS):
            return "moderate"

    # Rule 4: Very strongly negative without crisis phrase → high
    if vader_score < -0.70:
        return "high"

    return original_label


# ─── Original label normaliser (same as original training script) ─────────────
def normalize_risk(r):
    r = str(r).lower()
    high_words    = ["suicide", "depression", "grief", "remorse", "sadness", "fear", "nervousness"]
    moderate_words = ["anger", "annoyance", "disgust", "stress"]
    if any(w in r for w in high_words):   return "high"
    if any(w in r for w in moderate_words): return "moderate"
    if r in ["1", "true", "yes"]:         return "high"
    return "low"


print("=" * 60)
print("MindPulse — Retraining Final Model with Better Labels")
print("=" * 60)


# ─── Load datasets ──────────────────────────────────────────────────────────
print("\n[1/5] Loading datasets...")

emotion = pd.read_csv(f"{DATA}/emotion.csv")
emotion = emotion.rename(columns={"label": "risk"})
emotion = emotion[["text", "risk"]]
# emotion.csv uses numeric label 0 = sadness, 1 = joy, 2 = love, etc.
emotion_map = {0:"high", 1:"low", 2:"low", 3:"moderate", 4:"moderate", 5:"high", 6:"high"}
emotion["risk"] = emotion["risk"].map(emotion_map).fillna("moderate")

suicide = pd.read_csv(f"{DATA}/suicide.csv")
suicide = suicide.rename(columns={"class": "risk"})
suicide = suicide[["text", "risk"]]
suicide["risk"] = suicide["risk"].apply(lambda x: "high" if str(x).lower() == "suicide" else "low")

isear = pd.read_csv(f"{DATA}/isear.csv", header=None)
isear.columns = ["risk", "text"]
isear = isear[["text", "risk"]]
isear["risk"] = isear["risk"].apply(normalize_risk)

reddit = pd.read_csv(f"{DATA}/reddit.csv")
reddit["text"] = reddit["title"].fillna("") + " " + reddit["selftext"].fillna("")
reddit["risk"] = reddit["subreddit"].apply(normalize_risk)
reddit = reddit[["text", "risk"]]

goemotion = pd.read_csv(f"{DATA}/goemotion_processed.csv")
goemotion = goemotion[["text", "risk"]]
goemotion["risk"] = goemotion["risk"].apply(normalize_risk)

data = pd.concat([emotion, suicide, isear, reddit, goemotion], ignore_index=True)
data["text"] = data["text"].fillna("").astype(str)
data = data[data["text"].str.strip().str.len() > 5]   # remove empty rows

print("   Total rows before re-labelling:", len(data))
print("   Original label distribution:")
print(data["risk"].value_counts().to_string())


# ─── Smart re-labelling ──────────────────────────────────────────────────────
print("\n[2/5] Applying smart re-labelling (VADER + keyword rules)...")

# Only re-label a sample to keep training fast (VADER is slow on 500k+ rows)
# For large datasets, apply to at most 200k rows; keep rest as-is
MAX_RELABEL = 200_000
if len(data) > MAX_RELABEL:
    relabel_idx = data.sample(MAX_RELABEL, random_state=42).index
    data.loc[relabel_idx, "risk"] = data.loc[relabel_idx].apply(
        lambda row: smart_label(row["text"], row["risk"]), axis=1
    )
    print("   Re-labelled", MAX_RELABEL, "rows (sampled for speed)")
else:
    data["risk"] = data.apply(lambda row: smart_label(row["text"], row["risk"]), axis=1)
    print("   Re-labelled all rows")

print("   Updated label distribution:")
print(data["risk"].value_counts().to_string())


# ─── Balance classes ─────────────────────────────────────────────────────────
print("\n[3/5] Balancing class distribution...")

low      = data[data["risk"] == "low"]
moderate = data[data["risk"] == "moderate"]
high     = data[data["risk"] == "high"]

# Oversample moderate to at least 50% of the dominant class
target = max(len(low), len(high))
moderate_upsampled = moderate.sample(min(target, max(len(moderate), 30_000)), replace=True, random_state=42)
balanced = pd.concat([low, moderate_upsampled, high], ignore_index=True).sample(frac=1, random_state=42)

print("   Balanced distribution:")
print(balanced["risk"].value_counts().to_string())


# ─── Text cleaning + feature extraction ─────────────────────────────────────
print("\n[4/5] Training Logistic Regression on corrected data...")

balanced["clean"] = balanced["text"].apply(clean)
X = balanced["clean"]
y = balanced["risk"]

vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2), min_df=3)
X_vec = vectorizer.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_vec, y, test_size=0.2, random_state=42, stratify=y)

model = LogisticRegression(max_iter=300, C=1.5, class_weight="balanced", n_jobs=-1, solver="saga")
model.fit(X_train, y_train)

acc = model.score(X_test, y_test)
print("   Test Accuracy:", round(acc * 100, 1), "%")
print("\n   Classification Report:")
print(classification_report(y_test, model.predict(X_test)))


# ─── Save models ────────────────────────────────────────────────────────────
print("[5/5] Saving new models...")
joblib.dump(model,      f"{MODELS}/final_model.pkl")
joblib.dump(vectorizer, f"{MODELS}/final_vectorizer.pkl")

print("\n[DONE] New final_model.pkl + final_vectorizer.pkl saved!")
print("       Restart the backend: python -m uvicorn main:app --reload")
