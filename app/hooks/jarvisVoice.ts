"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

// ⏱️ HOW LONG TO WAIT after the user's last word before answering.
// 1500 = snappy | 2000 = balanced (recommended) | 2500-3000 = for slow/paused speakers
const SILENCE_THRESHOLD_MS = 2000;

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);

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
  const spokenRef = useRef("");
  const bufferRef = useRef("");       // finished segments waiting in the patience window
  const sessionTextRef = useRef("");  // live text of the current mic session
  const flushTimer = useRef<any>(null);
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

  // 📨 Patience window expired → send the FULL merged sentence
  const flushNow = useCallback(() => {
    clearTimeout(flushTimer.current);
    const text = bufferRef.current.trim();
    bufferRef.current = "";
    sessionTextRef.current = "";
    setTranscript("");
    if (text) {
      setVoiceState("thinking");
      onTranscriptRef.current?.(text);
      if (!continuousRef.current) wantMicRef.current = false;
    }
  }, [setVoiceState]);

  const speak = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;
    const clean = text
      .replace(/[*#_`~]/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;

    clearTimeout(flushTimer.current);
    bufferRef.current = "";
    sessionTextRef.current = "";

    spokenRef.current = clean;
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05;
    const voices = synth.getVoices();
    const v =
      voices.find((x) => x.name.includes("Google US English")) ||
      voices.find((x) => x.name.includes("Samantha")) ||
      voices.find((x) => x.lang.startsWith("en"));
    if (v) u.voice = v;

    u.onstart = () => {
      setVoiceState("speaking");
      if (continuousRef.current) startMic();
    };
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
    clearTimeout(flushTimer.current);
    bufferRef.current = "";
    sessionTextRef.current = "";
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
    clearTimeout(flushTimer.current);
    bufferRef.current = "";
    sessionTextRef.current = "";
    setTranscript("");
    setVoiceState("listening");
    startMic();
  }, [startMic, setVoiceState]);

  const stopListening = useCallback(() => {
    clearTimeout(flushTimer.current);
    bufferRef.current = "";
    sessionTextRef.current = "";
    setTranscript("");
    stopMic();
    setVoiceState("idle");
  }, [stopMic, setVoiceState]);

  const clearTranscript = useCallback(() => setTranscript(""), []);
  const setOnTranscript = useCallback((fn: (t: string) => void) => {
    onTranscriptRef.current = fn;
  }, []);

  // 🎙️ Engine
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
    synthRef.current = window.speechSynthesis || null;
    if (synthRef.current) synthRef.current.getVoices();

    if (SR) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        if (stateRef.current === "idle") setVoiceState("listening");
      };

      rec.onresult = (event: any) => {
        // rebuild from scratch (kills the repeat bug)
        let sessionText = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionText += event.results[i][0].transcript + " ";
        }
        sessionText = sessionText.trim();

        // 🗣️ AI is speaking → barge-in check (seamless handoff, mic stays open)
        if (stateRef.current === "speaking") {
          if (
            sessionText &&
            normalize(sessionText).length >= 2 &&
            echoScore(sessionText, spokenRef.current) < 0.5
          ) {
            synthRef.current?.cancel();
            spokenRef.current = "";
            clearTimeout(flushTimer.current);
            bufferRef.current = "";
            sessionTextRef.current = "";
            setTranscript("");
            setVoiceState("listening");
          }
          return;
        }

        // 🎧 User resumed talking → CANCEL the pending answer, keep collecting
        clearTimeout(flushTimer.current);
        sessionTextRef.current = sessionText;
        setTranscript((bufferRef.current + " " + sessionText).trim());
      };

      rec.onend = () => {
        if (stateRef.current === "listening") {
          const sessionText = sessionTextRef.current.trim();
          sessionTextRef.current = "";
          if (sessionText) {
            bufferRef.current = (bufferRef.current + " " + sessionText).trim();
          }
          if (bufferRef.current) {
            // ⏱️ PATIENCE WINDOW: wait SILENCE_THRESHOLD_MS before answering.
            // If the user continues speaking, onresult cancels this timer.
            setTranscript(bufferRef.current);
            clearTimeout(flushTimer.current);
            flushTimer.current = setTimeout(flushNow, SILENCE_THRESHOLD_MS);
          }
        }

        // keep-alive: reopen mic so resumed speech is captured
        if (
          wantMicRef.current &&
          !deniedRef.current &&
          stateRef.current !== "thinking" &&
          !(typeof document !== "undefined" && document.hidden)
        ) {
          clearTimeout(restartTimer.current);
          restartTimer.current = setTimeout(() => {
            try { rec.start(); } catch {}
          }, 250);
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

      recRef.current = rec;
    }

    return () => {
      wantMicRef.current = false;
      clearTimeout(flushTimer.current);
      clearTimeout(restartTimer.current);
      try { recRef.current?.stop(); } catch {}
      synthRef.current?.cancel();
    };
  }, [flushNow, setVoiceState]);

  return {
    state, isSupported, transcript,
    startListening, stopListening, speak, interrupt,
    clearTranscript, setOnTranscript,
  };
}