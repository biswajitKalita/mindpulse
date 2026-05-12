import joblib
import librosa
import numpy as np
import os

# --- 1. CONFIGURATION ---
MODEL_FILE = 'voice_emotion_model.pkl'

# --- 2. THE BRAIN LOADING ---
try:
    # Loading the trained MLPClassifier
    model = joblib.load(MODEL_FILE)
    # Automatically extracting the emotion labels (e.g., 'happy', 'sad')
    emotion_labels = model.classes_
    print(f"✅ Model Loaded Successfully!")
    print(f"Detected Emotions: {list(emotion_labels)}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit()

# --- 3. THE FEATURE EXTRACTOR ---
# This function is identical to your notebook to ensure math alignment
def extract_mfcc(filename):
    # Matches the training: 3 second duration, 0.5s offset
    y, sr = librosa.load(filename, duration=3, offset=0.5)
    # Matches the training: 40 MFCC features
    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)
    return mfcc.reshape(1, -1)

# --- 4. THE PREDICTION ENGINE ---
def get_emotion(audio_path):
    if not os.path.exists(audio_path):
        return "File not found."
    
    # Process the audio file
    features = extract_mfcc(audio_path)
    
    # Predict the label
    prediction = model.predict(features)[0]
    
    # Calculate confidence (probability)
    # This shows how "sure" the AI is about the emotion
    probabilities = model.predict_proba(features)
    confidence = np.max(probabilities) * 100
    
    return f"{prediction.upper()} ({confidence:.2f}% confidence)"

# --- 5. EXECUTION ---
if __name__ == "__main__":
    print("\n--- Speech Emotion Recognition ---")
    # Change 'test_audio.wav' to the name of a file in your folder
    test_file = 'test_audio.wav' 
    
    if os.path.exists(test_file):
        result = get_emotion(test_file)
        print(f"Result for '{test_file}': {result}")
    else:
        print(f"Please place a file named '{test_file}' in this folder to test.")