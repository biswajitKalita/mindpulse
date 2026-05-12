import pandas as pd
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

data = pd.read_csv("../Data/emotion.csv")

def clean(t):
    t = str(t).lower()
    t = re.sub(r"[^a-z\s]", "", t)
    return t

data["clean"] = data["text"].apply(clean)

X = data["clean"]
y = data["label"]

vec = TfidfVectorizer(max_features=5000)
X_vec = vec.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_vec, y, test_size=0.2)

model = RandomForestClassifier()
model.fit(X_train, y_train)

print("Emotion Baseline Accuracy:", model.score(X_test, y_test))