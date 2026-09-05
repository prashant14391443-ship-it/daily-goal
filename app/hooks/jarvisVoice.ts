"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

export function useJarvisVoice(continuousMode: boolean = true) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);

  const continuousRef = useRef(continuousMode);
  const stateRef = useRef<VoiceState>("idle");
  const deniedRef = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setVoiceState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    continuousRef.current = continuousMode;
  }, [continuousMode]);

  const clearRestart = useCallback(() => {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
  }, []);

  // 🔄 THE MAGIC: auto-reopen the mic in continuous mode
  const scheduleRestart = useCallback(
    (delay: number) => {
      if (!continuousRef.current || deniedRef.current) return;
      clearRestart();
      restartTimer.current = setTimeout(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        if (stateRef.current !== "idle") return;
        try {
          recognitionRef.current?.start();
          setVoiceState("listening");
        } catch {
          /* already running */
        }
      }, delay);
    },
    [clearRestart, setVoiceState]
  );

  const startListening = useCallback(() => {
    if (!recognitionRef.current || deniedRef.current) return;
    clearRestart();
    synthRef.current?.cancel();
    if (stateRef.current === "listening") return;
    try {
      recognitionRef.current.start();
      setVoiceState("listening");
    } catch {
      /* ignore */
    }
  }, [clearRestart, setVoiceState]);

  const stopListening = useCallback(() => {
    clearRestart();
    try {
      recognitionRef.current?.stop();
    } catch {}
    setVoiceState("idle");
  }, [clearRestart, setVoiceState]);

  const speak = useCallback(
    (text: string) => {
      const synth = synthRef.current;
      if (!synth) return;

      const clean = text
        .replace(/[*#_`~]/g, "")
        .replace(/🤖|✅|❌|💪|📚|🍽️|📅|🏋️|📝||⚡|⭐|🌟||🚀||💧|/g, "")
        .replace(/\n+/g, ". ")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;

      clearRestart();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.05;
      u.pitch = 1;
      u.volume = 1;

      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.name.includes("Google US English")) ||
        voices.find((v) => v.name.includes("Samantha")) ||
        voices.find((v) => v.name.includes("Microsoft Zira")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (voice) u.voice = voice;

      u.onstart = () => setVoiceState("speaking");
      u.onend = () => {
        setVoiceState("idle");
        scheduleRestart(500); // 🔄 AI finished speaking → mic reopens automatically
      };
      u.onerror = () => {
        setVoiceState("idle");
        scheduleRestart(500);
      };

      synth.speak(u);
    },
    [clearRestart, scheduleRestart, setVoiceState]
  );

  const interrupt = useCallback(() => {
    clearRestart();
    synthRef.current?.cancel();
    try {
      recognitionRef.current?.stop();
    } catch {}
    setVoiceState("idle");
    scheduleRestart(400);
  }, [clearRestart, scheduleRestart, setVoiceState]);

  const clearTranscript = useCallback(() => setTranscript(""), []);
  const setOnTranscript = useCallback((fn: (text: string) => void) => {
    onTranscriptRef.current = fn;
  }, []);

  // 🎙️ Engine setup (runs once)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
    synthRef.current = window.speechSynthesis || null;
    if (synthRef.current) {
      synthRef.current.getVoices();
      synthRef.current.onvoiceschanged = () => synthRef.current?.getVoices();
    }

    if (SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => setVoiceState("listening");

      rec.onend = () => {
        // Don't disturb while AI is thinking/speaking
        if (stateRef.current === "thinking" || stateRef.current === "speaking") return;
        setVoiceState("idle");
        scheduleRestart(700); // 🔄 silence detected → re-listen automatically
      };

      rec.onerror = (e: any) => {
        const err = e?.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          deniedRef.current = true; // mic permission denied → stop looping
          setVoiceState("error");
          return;
        }
        if (err === "no-speech" || err === "aborted") return; // onend handles restart
        setVoiceState("error");
        setTimeout(() => setVoiceState("idle"), 1500);
      };

      rec.onresult = (event: any) => {
        let finalText = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        setTranscript(interim || finalText);
        if (finalText.trim()) {
          clearRestart();
          setTranscript("");
          setVoiceState("thinking");
          onTranscriptRef.current?.(finalText.trim());
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      clearRestart();
      try {
        recognitionRef.current?.stop();
      } catch {}
      synthRef.current?.cancel();
    };
  }, [clearRestart, scheduleRestart, setVoiceState]);

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