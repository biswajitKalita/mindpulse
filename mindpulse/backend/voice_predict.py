import sounddevice as sd
import numpy as np
import librosa
import joblib
import scipy.io.wavfile as wav

# ===== SETTINGS =====
fs = 22050
duration = 10   # seconds

# ===== LOAD MODEL =====
model = joblib.load("../Models/voice_emotion_model.pkl")
scaler = joblib.load("../Models/voice_scaler.pkl")

# ===== RECORD AUDIO =====
print("🎤 Speak now...")

recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
sd.wait()

wav.write("temp.wav", fs, recording)

print("✅ Recording finished")

# ===== FEATURE EXTRACTION =====
def extract_feature(file):
    audio, sr = librosa.load(file, duration=3, offset=0.5)

    mfcc = np.mean(librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40).T, axis=0)
    chroma = np.mean(librosa.feature.chroma_stft(y=audio, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=audio, sr=sr).T, axis=0)

    feature = np.hstack([mfcc, chroma, mel])

    return feature


feat = extract_feature("temp.wav")

feat = scaler.transform([feat])

emotion = model.predict(feat)[0]

print("\n🎧 Detected Emotion:", emotion)