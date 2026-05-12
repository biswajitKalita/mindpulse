import pandas as pd
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

data = pd.read_csv("../Data/suicide.csv")

data = data[["text","class"]]

def clean(t):
    t=t.lower()
    t=re.sub(r"[^a-z\s]","",t)
    return t

data["clean"]=data["text"].apply(clean)

X=data["clean"]
y=data["class"]

vec=TfidfVectorizer(max_features=6000)
X_vec=vec.fit_transform(X)

X_train,X_test,y_train,y_test=train_test_split(X_vec,y,test_size=0.2)

model=LogisticRegression(max_iter=200)
model.fit(X_train,y_train)

print("Suicide Model Accuracy:",model.score(X_test,y_test))

joblib.dump(model,"../Models/suicide_model.pkl")
joblib.dump(vec,"../Models/suicide_vectorizer.pkl")