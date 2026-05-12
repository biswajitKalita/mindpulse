from flask import Flask, request, jsonify
import joblib
import re

app = Flask(__name__)

model = joblib.load("../Models/final_model.pkl")
vectorizer = joblib.load("../Models/final_vectorizer.pkl")


def clean(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", "", text)
    return text


@app.route("/predict", methods=["POST"])
def predict():

    data = request.json
    text = clean(data["text"])

    vec = vectorizer.transform([text])
    risk = model.predict(vec)[0]

    return jsonify({"risk": risk})


if __name__ == "__main__":
    app.run(debug=True)