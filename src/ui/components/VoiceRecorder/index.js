// src/ui/components/VoiceRecorder/index.js
'use client';
import { useEffect, useRef, useState } from 'react';

export default function VoiceRecorder({ onTranscript }) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const r = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (r) {
      const rec = new r();
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        onTranscript?.(text);
      };
      recognitionRef.current = rec;
    }
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  return (
    <button onClick={toggle} className="secondary-button">
      {recording ? 'Stop' : 'Record'}
    </button>
  );
}