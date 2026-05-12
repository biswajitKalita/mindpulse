import os
import librosa
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

DATA_PATH = "../Data/Voice_data"

emotions = os.listdir(DATA_PATH)

X = []
y = []

def extract_feature(file):
    audio, sr = librosa.load(file, duration=3, offset=0.5)

    mfcc = np.mean(librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40).T, axis=0)
    chroma = np.mean(librosa.feature.chroma_stft(y=audio, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=audio, sr=sr).T, axis=0)

    return np.hstack([mfcc, chroma, mel])

for emotion in emotions:
    folder = os.path.join(DATA_PATH, emotion)

    for file in os.listdir(folder):
        if file.endswith(".wav"):
            path = os.path.join(folder, file)

            feature = extract_feature(path)

            X.append(feature)
            y.append(emotion)

print("Total Voice Samples:", len(X))

X = np.array(X)

scaler = StandardScaler()
X = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=200)
model.fit(X_train, y_train)

print("Voice Model Accuracy:", model.score(X_test, y_test))

joblib.dump(model, "../Models/voice_emotion_model.pkl")
joblib.dump(scaler, "../Models/voice_scaler.pkl")

print("Voice Model Saved Successfully")