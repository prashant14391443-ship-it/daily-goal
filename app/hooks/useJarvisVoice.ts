"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseJarvisVoiceReturn {
  state: VoiceState;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  interrupt: () => void;
  clearTranscript: () => void;
  setOnTranscript: (fn: (text: string) => void) => void;
}

export function useJarvisVoice(continuousMode: boolean = false): UseJarvisVoiceReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);
  const continuousModeRef = useRef(continuousMode);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    synthRef.current = window.speechSynthesis;

    // Load voices (needed for some browsers)
    if (synthRef.current) {
      synthRef.current.getVoices();
      synthRef.current.onvoiceschanged = () => {
        synthRef.current?.getVoices();
      };
    }

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop on pause (built-in VAD)
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setState("listening");
      
      recognition.onend = () => {
        setState((prev) => {
          if (prev === "thinking" || prev === "speaking") return prev;
          return "idle";
        });
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setState("error");
          setTimeout(() => setState("idle"), 2000);
        }
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript.trim()) {
          setState("thinking");
          onTranscriptRef.current?.(finalTranscript.trim());
          setTranscript("");
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    // Interrupt AI if it's speaking
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    setState("listening");
    setTranscript("");
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started, ignore
      console.log("Recognition already started");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setState("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;

    // Clean text for natural speech
    const cleanText = text
      .replace(/[*#_`~]/g, "")
      .replace(/🤖|✅|❌|💪|📚|🍽️|📅|🏋️|📝|🎯|⚡||⭐|🌟|/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Select best available voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = 
      voices.find((v) => v.name.includes("Google US English")) ||
      voices.find((v) => v.name.includes("Samantha")) ||
      voices.find((v) => v.name.includes("Microsoft Zira")) ||
      voices.find((v) => v.lang === "en-US" && v.localService) ||
      voices.find((v) => v.lang.startsWith("en"));
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setState("speaking");
    
    utterance.onend = () => {
      setState("idle");
      // Auto-resume listening in continuous mode
      if (continuousModeRef.current) {
        setTimeout(() => startListening(), 500);
      }
    };

    utterance.onerror = () => {
      setState("idle");
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, []);

  const interrupt = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState("idle");
    setTranscript("");
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  const setOnTranscript = useCallback((fn: (text: string) => void) => {
    onTranscriptRef.current = fn;
  }, []);

  return {
    state,
    isSupported,
    transcript,
    startListening,
    stopListening,
    speak,
    interrupt,
    clearTranscript,
    setOnTranscript,
  };
}