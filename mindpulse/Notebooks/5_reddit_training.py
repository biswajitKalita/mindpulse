import pandas as pd
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

data = pd.read_csv("../Data/reddit.csv")

print("Columns:", data.columns)

# ---- TRY COMMON COLUMN FIX ----
if "post" in data.columns:
    data = data.rename(columns={"post":"text"})

if "label" in data.columns:
    data = data.rename(columns={"label":"risk"})

if "class" in data.columns:
    data = data.rename(columns={"class":"risk"})

# If still not present, create text
if "text" not in data.columns:
    data["text"] = data.iloc[:,0]

if "risk" not in data.columns:
    data["risk"] = data.iloc[:,1]

data = data[["text","risk"]]

def clean(t):
    t = str(t).lower()
    t = re.sub(r"[^a-z\s]", "", t)
    return t

data["clean"] = data["text"].apply(clean)

X = data["clean"]
y = data["risk"]

vec = TfidfVectorizer(max_features=7000)
X_vec = vec.fit_transform(X)

X_train,X_test,y_train,y_test = train_test_split(X_vec,y,test_size=0.2)

model = LogisticRegression(max_iter=200)
model.fit(X_train,y_train)

print("Reddit Accuracy:", model.score(X_test,y_test))

joblib.dump(model,"../Models/reddit_model.pkl")
joblib.dump(vec,"../Models/reddit_vectorizer.pkl")