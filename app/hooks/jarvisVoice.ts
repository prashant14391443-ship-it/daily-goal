"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);

// How much of the heard text matches what the AI is currently saying (echo check)
function echoScore(transcript: string, spoken: string): number {
  const t = normalize(transcript);
  if (t.length === 0) return 1;
  const s = new Set(normalize(spoken));
  const hits = t.filter((w) => s.has(w)).length;
  return hits / t.length;
}

export function useJarvisVoice(continuousMode: boolean = true) {
  const [state, setState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const onTranscriptRef = useRef<((t: string) => void) | null>(null);

  const stateRef = useRef<VoiceState>("idle");
  const continuousRef = useRef(continuousMode);
  const deniedRef = useRef(false);
  const wantMicRef = useRef(false);
  const spokenRef = useRef("");       // what the AI is saying right now
  const utteranceRef = useRef("");    // user's accumulating speech
  const silenceTimer = useRef<any>(null);
  const restartTimer = useRef<any>(null);

  const setVoiceState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    continuousRef.current = continuousMode;
    if (continuousMode) wantMicRef.current = true;
    else if (stateRef.current === "idle") wantMicRef.current = false;
  }, [continuousMode]);

  const startMic = useCallback(() => {
    if (!recRef.current || deniedRef.current) return;
    wantMicRef.current = true;
    try { recRef.current.start(); } catch {}
  }, []);

  const stopMic = useCallback(() => {
    wantMicRef.current = false;
    try { recRef.current?.stop(); } catch {}
  }, []);

  // User paused → send the full sentence
  const flushUtterance = useCallback(() => {
    clearTimeout(silenceTimer.current);
    const text = utteranceRef.current.trim();
    utteranceRef.current = "";
    setTranscript("");
    if (text) {
      setVoiceState("thinking");
      onTranscriptRef.current?.(text);
      if (!continuousRef.current) stopMic();
    }
  }, [setVoiceState, stopMic]);

  // 🛑 BARGE-IN: user spoke while AI was talking → AI shuts up instantly
  const bargeIn = useCallback(() => {
    synthRef.current?.cancel();
    spokenRef.current = "";
    utteranceRef.current = "";
    try { recRef.current?.stop(); } catch {}
    setVoiceState("listening");
    setTimeout(() => {
      wantMicRef.current = true;
      try { recRef.current?.start(); } catch {}
    }, 250);
  }, [setVoiceState]);

  const speak = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;
    const clean = text
      .replace(/[*#_`~]/g, "")
      .replace(/[🤖✅❌💪📚🍽️🏋️⚡⭐🌟🚀🌱💧👋]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;

    spokenRef.current = clean; // remember for echo filtering
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05;
    const voices = synth.getVoices();
    const v =
      voices.find((x) => x.name.includes("Google US English")) ||
      voices.find((x) => x.name.includes("Samantha")) ||
      voices.find((x) => x.lang.startsWith("en"));
    if (v) u.voice = v;

    u.onstart = () => setVoiceState("speaking");
    const done = () => {
      spokenRef.current = "";
      if (continuousRef.current) {
        setVoiceState("listening");
        startMic();
      } else {
        setVoiceState("idle");
      }
    };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  }, [startMic, setVoiceState]);

  const interrupt = useCallback(() => {
    synthRef.current?.cancel();
    spokenRef.current = "";
    clearTimeout(silenceTimer.current);
    utteranceRef.current = "";
    setTranscript("");
    if (continuousRef.current) {
      setVoiceState("listening");
      startMic();
    } else {
      stopMic();
      setVoiceState("idle");
    }
  }, [startMic, stopMic, setVoiceState]);

  const startListening = useCallback(() => {
    synthRef.current?.cancel();
    spokenRef.current = "";
    setVoiceState("listening");
    startMic();
  }, [startMic, setVoiceState]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimer.current);
    utteranceRef.current = "";
    setTranscript("");
    stopMic();
    setVoiceState("idle");
  }, [stopMic, setVoiceState]);

  const clearTranscript = useCallback(() => setTranscript(""), []);
  const setOnTranscript = useCallback((fn: (t: string) => void) => {
    onTranscriptRef.current = fn;
  }, []);

  // 🎙️ Engine (runs once)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
    synthRef.current = window.speechSynthesis || null;
    if (synthRef.current) synthRef.current.getVoices();

    if (SR) {
      const rec = new SR();
      rec.continuous = true;      // mic stays alive → enables barge-in
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        if (stateRef.current === "idle") setVoiceState("listening");
      };

      // keep-alive loop
      rec.onend = () => {
        if (
          wantMicRef.current &&
          !deniedRef.current &&
          !(typeof document !== "undefined" && document.hidden)
        ) {
          clearTimeout(restartTimer.current);
          restartTimer.current = setTimeout(() => {
            try { rec.start(); } catch {}
          }, 300);
        }
      };

      rec.onerror = (e: any) => {
        const err = e?.error;
        if (err === "not-allowed" || err === "service-not-allowed") {
          deniedRef.current = true;
          wantMicRef.current = false;
          setVoiceState("error");
        }
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }

        // 🗣️ AI IS SPEAKING → echo filter / barge-in detector
        if (stateRef.current === "speaking") {
          const cand = (final || interim).trim();
          if (
            cand &&
            normalize(cand).length >= 2 &&
            echoScore(cand, spokenRef.current) < 0.5
          ) {
            bargeIn(); // 👈 USER INTERRUPTED → AI stops instantly
          }
          return; // swallow its own echo
        }

        // 🎧 LISTENING / THINKING path
        if (interim) setTranscript((utteranceRef.current + " " + interim).trim());
        if (final) {
          utteranceRef.current = (utteranceRef.current + " " + final).trim();
          setTranscript(utteranceRef.current);
        }
        if (stateRef.current === "idle") setVoiceState("listening");

        clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(flushUtterance, 1000);
      };

      recRef.current = rec;
    }

    return () => {
      wantMicRef.current = false;
      clearTimeout(silenceTimer.current);
      clearTimeout(restartTimer.current);
      try { recRef.current?.stop(); } catch {}
      synthRef.current?.cancel();
    };
  }, [bargeIn, flushUtterance, setVoiceState]);

  return {
    state, isSupported, transcript,
    startListening, stopListening, speak, interrupt,
    clearTranscript, setOnTranscript,
  };
}