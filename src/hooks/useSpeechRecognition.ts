import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

interface UseSpeechRecognitionReturn {
  status:          SpeechStatus;
  transcript:      string;
  interimText:     string;
  audioBlob:       Blob | null;   // ← raw audio for voice ML model
  startListening:  () => void;
  stopListening:   () => void;
  resetTranscript: () => void;
  isSupported:     boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status,      setStatus]      = useState<SpeechStatus>('idle');
  const [transcript,  setTranscript]  = useState('');
  const [interimText, setInterimText] = useState('');
  const [audioBlob,   setAudioBlob]   = useState<Blob | null>(null);

  const recognitionRef  = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef  = useRef<Blob[]>([]);

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = Boolean(SpeechRecognitionAPI);

  // ── Set up speech recognition ──────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) { setStatus('unsupported'); return; }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart  = () => { setStatus('listening'); setInterimText(''); };
    recognition.onresult = (event: any) => {
      let finalPart = '', interimPart = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalPart   += r[0].transcript + ' ';
        else           interimPart += r[0].transcript;
      }
      if (finalPart) setTranscript(prev => prev + finalPart);
      setInterimText(interimPart);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      setStatus('error');
      setInterimText('');
      setTimeout(() => setStatus('idle'), 2500);
    };
    recognition.onend = () => { setStatus('idle'); setInterimText(''); };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [isSupported]);

  // ── Start: both speech recognition + MediaRecorder ────────────────────────
  const startListening = useCallback(async () => {
    if (!recognitionRef.current || status === 'listening') return;

    // Start raw audio capture via MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioBlob(null);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        // Stop all microphone tracks to release mic indicator
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('[useSpeechRecognition] MediaRecorder unavailable:', err);
      // Still allow text transcription even if raw audio capture fails
    }

    try { recognitionRef.current.start(); } catch { /* already started */ }
  }, [status]);

  // ── Stop: both speech recognition + MediaRecorder ────────────────────────
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setStatus('processing');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // triggers onstop → sets audioBlob
    }

    setTimeout(() => setStatus('idle'), 400);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setAudioBlob(null);
    setStatus('idle');
    audioChunksRef.current = [];
  }, []);

  return {
    status, transcript, interimText, audioBlob,
    startListening, stopListening, resetTranscript, isSupported,
  };
}
