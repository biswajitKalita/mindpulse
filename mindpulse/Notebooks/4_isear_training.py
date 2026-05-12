import pandas as pd
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

data = pd.read_csv("../Data/isear.csv", header=None)

data.columns = ["risk","text"]

def clean(t):
    t = str(t).lower()
    t = re.sub(r"[^a-z\s]", "", t)
    return t

data["clean"] = data["text"].apply(clean)

X = data["clean"]
y = data["risk"]

vec = TfidfVectorizer(max_features=6000)
X_vec = vec.fit_transform(X)

X_train,X_test,y_train,y_test = train_test_split(X_vec,y,test_size=0.2)

model = RandomForestClassifier()
model.fit(X_train,y_train)

print("ISEAR Accuracy:", model.score(X_test,y_test))

joblib.dump(model,"../Models/isear_model.pkl")
joblib.dump(vec,"../Models/isear_vectorizer.pkl")