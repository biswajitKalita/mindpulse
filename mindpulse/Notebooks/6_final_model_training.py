"""
MindPulse — Final Text Model Training (Production Quality)
============================================================
Improvements over the original 6_final_model_training.py:

1. CORRECT label mapping   — emotion.csv uses 0-5 numeric labels,
                             not text; original script treated all
                             negatives as "high" which caused bias.
2. VADER smart re-labelling— Splits mild-stress "high" into "moderate"
                             so the model isn't trigger-happy on risk.
3. Better class balancing  — Caps each class to avoid extreme oversampling.
4. Better model            — Logistic Regression with saga solver
                             (supports predict_proba, unlike LinearSVC).
5. Larger TF-IDF           — 20k features, (1,2)-ngrams, min_df=2.
6. Proper evaluation       — Per-class F1, confusion matrix printed.

Run from: C:/Users/ashik/OneDrive/Desktop/mindpulse_backend
  python mindpulse/Notebooks/6_final_model_training.py
"""

import re
import warnings
import numpy as np
import pandas as pd
import joblib

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils import resample

warnings.filterwarnings("ignore")

DATA   = "mindpulse/Data"
MODELS = "mindpulse/Models"

vader = SentimentIntensityAnalyzer()

# ── Crisis keywords: always → "high" ─────────────────────────────────────────
CRISIS_KW = [
    "want to die", "kill myself", "end my life", "end everything",
    "suicide", "suicidal", "no reason to live", "cant go on",
    "cant take it anymore", "self harm", "self-harm", "cutting myself",
    "overdose", "jump off", "dont want to be here", "want to disappear",
]

# ── Moderate keywords: mildly negative context ───────────────────────────────
MODERATE_KW = [
    "stressed", "anxious", "anxiety", "tired", "overwhelmed", "worried",
    "exam", "deadline", "pressure", "crying", "sad", "burnout", "lonely",
    "nervous", "panic", "fear", "scared", "frustrated", "angry",
    "depressed", "hopeless", "empty", "numb",
]


# ── Text cleaning ─────────────────────────────────────────────────────────────
def clean(t: str) -> str:
    t = str(t).lower()
    t = re.sub(r"http\S+", "", t)
    t = re.sub(r"[^a-z\s]", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


# ── VADER-guided smart label ──────────────────────────────────────────────────
def smart_label(text: str, original: str) -> str:
    lower = text.lower()

    # Hard rule: crisis phrase → always high
    if any(kw in lower for kw in CRISIS_KW):
        return "high"

    score = vader.polarity_scores(text)["compound"]

    # Clearly positive → low
    if score >= 0.45:
        return "low"

    # Very strongly negative without specific crisis phrase → still high
    if score <= -0.70:
        return "high"

    # Original "high" but only mild negativity + moderate keyword → moderate
    if original == "high" and score >= -0.55:
        if any(kw in lower for kw in MODERATE_KW):
            return "moderate"

    return original


# ── Original rough label normaliser (for datasets that use text labels) ──────
def normalize_rough(r: str) -> str:
    r = str(r).lower()
    high_w  = ["suicide", "depression", "grief", "remorse", "sadness",
                "fear", "nervousness", "dead", "die", "hopeless"]
    mod_w   = ["anger", "annoyance", "disgust", "stress", "anxiety",
                "frustrated", "worried", "sad", "angry"]
    if any(w in r for w in high_w):   return "high"
    if any(w in r for w in mod_w):    return "moderate"
    if r in ["1", "true", "yes"]:     return "high"
    return "low"


# =============================================================================
# STEP 1 — Load datasets
# =============================================================================
print("=" * 62)
print("  MindPulse — Final Text Model Retraining")
print("=" * 62)
print("\n[1/6] Loading datasets...")

# --- emotion.csv (numeric labels: 0=sadness, 1=joy, 2=love,
#                                  3=anger, 4=fear, 5=surprise) ---
emotion = pd.read_csv(f"{DATA}/emotion.csv")
emotion = emotion.rename(columns={"label": "risk"})
emotion = emotion[["text", "risk"]]
# Map numeric → risk level (sadness=0, fear=4 → high; anger=3 → moderate; rest → low)
emotion_map = {0: "high", 1: "low", 2: "low", 3: "moderate", 4: "high", 5: "low"}
emotion["risk"] = emotion["risk"].map(emotion_map).fillna("moderate")

# --- suicide.csv ---
suicide = pd.read_csv(f"{DATA}/suicide.csv")
suicide = suicide.rename(columns={"class": "risk"})
suicide = suicide[["text", "risk"]]
suicide["risk"] = suicide["risk"].apply(
    lambda x: "high" if str(x).lower() in ("suicide", "1", "true") else "low"
)

# --- isear.csv (no header: col0=emotion-name, col1=text) ---
isear = pd.read_csv(f"{DATA}/isear.csv", header=None)
isear.columns = ["risk", "text"]
isear = isear[["text", "risk"]]
isear["risk"] = isear["risk"].apply(normalize_rough)

# --- reddit.csv ---
reddit = pd.read_csv(f"{DATA}/reddit.csv")
reddit["text"] = reddit["title"].fillna("") + " " + reddit["selftext"].fillna("")
reddit["risk"] = reddit["subreddit"].apply(normalize_rough)
reddit = reddit[["text", "risk"]]

# --- goemotion_processed.csv ---
goemotion = pd.read_csv(f"{DATA}/goemotion_processed.csv")
goemotion = goemotion[["text", "risk"]]
goemotion["risk"] = goemotion["risk"].apply(normalize_rough)

data = pd.concat([emotion, suicide, isear, reddit, goemotion], ignore_index=True)
data["text"] = data["text"].fillna("").astype(str)
data["risk"] = data["risk"].astype(str)
data = data[data["text"].str.strip().str.len() > 10]  # remove near-empty rows

print(f"   Loaded {len(data):,} rows total")
print("   Raw distribution:\n", data["risk"].value_counts().to_string())


# =============================================================================
# STEP 2 — VADER smart re-labelling (sample for speed on large datasets)
# =============================================================================
print("\n[2/6] Smart re-labelling with VADER...")
MAX_RELABEL = 150_000
if len(data) > MAX_RELABEL:
    idx = data.sample(MAX_RELABEL, random_state=42).index
    data.loc[idx, "risk"] = data.loc[idx].apply(
        lambda row: smart_label(row["text"], row["risk"]), axis=1
    )
    print(f"   Re-labelled {MAX_RELABEL:,} sampled rows (rest kept as-is)")
else:
    data["risk"] = data.apply(
        lambda row: smart_label(row["text"], row["risk"]), axis=1
    )
    print("   Re-labelled all rows")

print("   Updated distribution:\n", data["risk"].value_counts().to_string())


# =============================================================================
# STEP 3 — Balance classes (cap to avoid extreme oversampling)
# =============================================================================
print("\n[3/6] Balancing classes...")

low_df  = data[data["risk"] == "low"]
mod_df  = data[data["risk"] == "moderate"]
high_df = data[data["risk"] == "high"]

# Cap each class to avoid training on 500k+ duplicates
TARGET = min(60_000, max(len(low_df), len(mod_df), len(high_df)))

low_df  = resample(low_df,  replace=(len(low_df)  < TARGET), n_samples=TARGET, random_state=42)
mod_df  = resample(mod_df,  replace=(len(mod_df)  < TARGET), n_samples=TARGET, random_state=42)
high_df = resample(high_df, replace=(len(high_df) < TARGET), n_samples=TARGET, random_state=42)

balanced = pd.concat([low_df, mod_df, high_df]).sample(frac=1, random_state=42)
print(f"   Each class -> {TARGET:,} samples ({len(balanced):,} total)")


# =============================================================================
# STEP 4 — Clean text + TF-IDF features
# =============================================================================
print("\n[4/6] Vectorising text...")
balanced["clean"] = balanced["text"].apply(clean)

vectorizer = TfidfVectorizer(
    max_features=20_000,
    ngram_range=(1, 2),
    min_df=2,
    sublinear_tf=True,
    stop_words="english",
)
X_vec = vectorizer.fit_transform(balanced["clean"])
y     = balanced["risk"]

X_train, X_test, y_train, y_test = train_test_split(
    X_vec, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   Train: {X_train.shape[0]:,}  |  Test: {X_test.shape[0]:,}")


# =============================================================================
# STEP 5 — Train Logistic Regression
# =============================================================================
print("\n[5/6] Training Logistic Regression...")

model = LogisticRegression(
    C=2.0,
    max_iter=400,
    class_weight="balanced",
    solver="saga",
    n_jobs=-1,
    random_state=42,
)
model.fit(X_train, y_train)

acc = model.score(X_test, y_test)
print(f"\n   [OK] Test Accuracy : {acc * 100:.1f}%")
print("\n   Classification Report:")
print(classification_report(y_test, model.predict(X_test)))
print("\n   Confusion Matrix (low | moderate | high):")
print(confusion_matrix(y_test, model.predict(X_test), labels=["low", "moderate", "high"]))


# =============================================================================
# STEP 6 — Save
# =============================================================================
print("\n[6/6] Saving models...")
joblib.dump(model,      f"{MODELS}/final_model.pkl")
joblib.dump(vectorizer, f"{MODELS}/final_vectorizer.pkl")

print("\n[DONE] final_model.pkl + final_vectorizer.pkl saved to", MODELS)
print("   Restart the backend: python -m uvicorn main:app --reload --port 8000")