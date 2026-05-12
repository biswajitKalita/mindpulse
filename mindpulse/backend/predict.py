import joblib
import re

# Load trained model
model = joblib.load("../Models/final_model.pkl")
vectorizer = joblib.load("../Models/final_vectorizer.pkl")


def clean(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", "", text)
    return text


def predict_risk(user_text):

    text = clean(user_text)
    vec = vectorizer.transform([text])
    pred = model.predict(vec)[0]

    return pred


# Test
if __name__ == "__main__":
    sample = input("Enter text: ")
    print("Mental Risk Level:", predict_risk(sample))