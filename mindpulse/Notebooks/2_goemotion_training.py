import pandas as pd
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

train = pd.read_csv("../Data/train.tsv",sep="\t",header=None)
dev = pd.read_csv("../Data/dev.tsv",sep="\t",header=None)
test = pd.read_csv("../Data/test.tsv",sep="\t",header=None)

train.columns=["text","label","id"]
dev.columns=["text","label","id"]
test.columns=["text","label","id"]

data = pd.concat([train,dev,test])

emotion_list = open("../Data/emotions.txt").read().splitlines()

def get_emotions(label):
    ids = label.split(",")
    return [emotion_list[int(i)] for i in ids]

data["emotion_names"]=data["label"].apply(get_emotions)

def risk_map(e):
    high=["grief","remorse","sadness","fear","nervousness"]
    if any(x in high for x in e):
        return "high"
    med=["anger","annoyance","disgust"]
    if any(x in med for x in e):
        return "moderate"
    return "low"

data["risk"]=data["emotion_names"].apply(risk_map)

def clean(t):
    t=t.lower()
    t=re.sub(r"[^a-z\s]","",t)
    return t

data["clean"]=data["text"].apply(clean)

X=data["clean"]
y=data["risk"]

vec=TfidfVectorizer(max_features=8000)
X_vec=vec.fit_transform(X)

X_train,X_test,y_train,y_test=train_test_split(X_vec,y,test_size=0.2)

model=RandomForestClassifier(n_estimators=150)
model.fit(X_train,y_train)

print("GoEmotion Accuracy:",model.score(X_test,y_test))

joblib.dump(model,"../Models/goemotion_model.pkl")
joblib.dump(vec,"../Models/goemotion_vectorizer.pkl")

data[["text","risk"]].to_csv("../Data/goemotion_processed.csv", index=False)
print("GoEmotion processed dataset saved successfully")