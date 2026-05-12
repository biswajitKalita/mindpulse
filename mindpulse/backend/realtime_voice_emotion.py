import sounddevice as sd
import numpy as np
import librosa
import joblib
import scipy.io.wavfile as wav
from collections import Counter


fs = 22050

model = joblib.load("../Models/voice_emotion_model.pkl")
scaler = joblib.load("../Models/voice_scaler.pkl")


def record_long_audio():

    print("🎤 Start speaking... Press ENTER to stop")

    recording = []

    def callback(indata, ):
        recording.append(indata.copy())

    with sd.InputStream(samplerate=fs, channels=1, callback=callback):
        input()

    audio = np.concatenate(recording, axis=0)

    wav.write("long_record.wav", fs, audio)

    return "long_record.wav"


def extract_feature_segment(audio, sr):

    mfcc = np.mean(librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40).T, axis=0)
    chroma = np.mean(librosa.feature.chroma_stft(y=audio, sr=sr).T, axis=0)
    mel = np.mean(librosa.feature.melspectrogram(y=audio, sr=sr).T, axis=0)

    return np.hstack([mfcc, chroma, mel])


file = record_long_audio()

audio, sr = librosa.load(file)

duration = len(audio) / sr

segment_size = 3

emotions = []

for i in range(0, int(duration), segment_size):

    segment = audio[i*sr:(i+segment_size)*sr]

    if len(segment) < sr:
        continue

    feat = extract_feature_segment(segment, sr)
    feat = scaler.transform([feat])

    emotion = model.predict(feat)[0]

    emotions.append(emotion)


print("Detected Emotion Segments:", emotions)

final_emotion = Counter(emotions).most_common(1)[0][0]

print("FINAL VOICE EMOTION:", final_emotion)