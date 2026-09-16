"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const APP_URL = "https://daily-goal-beige.vercel.app";
const INSTALL_URL = APP_URL + "/install";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase = "idle" | "confirm" | "installing" | "installed";

export default function InstallPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [sizeLabel, setSizeLabel] = useState("~3 MB");
  const [note, setNote] = useState("");
  const safetyTimer = useRef<number | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };

    // THIS is the real "installation finished" signal from Chrome
    const onInstalled = () => {
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      setPhase("installed");
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setAlreadyInstalled(window.matchMedia("(display-mode: standalone)").matches);

    // measure real downloaded size of this app (transfer bytes)
    const t = window.setTimeout(() => {
      try {
        const nav = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        let bytes = 0;
        nav.forEach((e) => (bytes += e.transferSize || 0));
        res.forEach((e) => (bytes += e.transferSize || 0));
        const mb = bytes / (1024 * 1024);
        if (mb > 0.05) {
          setSizeLabel(mb < 1 ? "~" + mb.toFixed(1) + " MB" : "~" + Math.round(mb) + " MB");
        }
      } catch {
        /* keep default label */
      }
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(t);
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      // popup not available (iPhone / in-app browser) → one small line only
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setNote(
        isIOS
          ? "iPhone: tap Share → Add to Home Screen"
          : "Use browser ⋮ menu → Install and create shortcut"
      );
      return;
    }

    setNote("");
    setPhase("confirm");
    installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setPhase("installing"); // spinner stays until appinstalled fires
      safetyTimer.current = window.setTimeout(() => setPhase("installed"), 20000);
    } else {
      setPhase("idle"); // user cancelled the popup
    }
    setInstallEvent(null);
  };

  return (
    <main style={styles.page}>
      <style>{"@keyframes dgspin{to{transform:rotate(360deg)}}"}</style>

      <div style={styles.card}>
        <div style={styles.logo}>🎯</div>
        <h1 style={styles.h1}>DAILY GOAL</h1>
        <p style={styles.sub}>Study • Compete • Connect</p>

        <div style={styles.sizeBadge}>📦 {sizeLabel} • installs in seconds</div>

        {alreadyInstalled ? (
          <>
            <p style={styles.sub2}>Already installed on this phone.</p>
            <a href="/" style={{ ...styles.btn, ...styles.btnBrowser }}>
              🎯 OPEN APP
            </a>
          </>
        ) : phase === "installed" ? (
          <>
            <div style={styles.success}>
              ✅ Installed! Open <b>Daily Goal</b> from your home screen.
            </div>
            <a href="/" style={{ ...styles.btn, ...styles.btnBrowser }}>
              🎯 OPEN APP
            </a>
          </>
        ) : phase === "confirm" || phase === "installing" ? (
          <div style={styles.spinWrap}>
            <div style={styles.spinner} />
            <p style={styles.spinText}>
              {phase === "confirm" ? "Tap “Install” in the popup…" : "Installing Daily Goal…"}
            </p>
            <p style={styles.spinSub}>
              {phase === "confirm"
                ? "Chrome is asking for your confirmation"
                : "Usually takes 5–10 seconds • only " + sizeLabel}
            </p>
          </div>
        ) : (
          <>
            <button onClick={handleInstall} style={{ ...styles.btn, ...styles.btnInstall }}>
              📲 INSTALL APP
              <span style={styles.btnSmall}>Only {sizeLabel} — icon on your home screen</span>
            </button>

            <a href="/" style={{ ...styles.btn, ...styles.btnBrowser }}>
              🌐 USE IN BROWSER
              <span style={styles.btnSmall}>Continue in Chrome / any browser</span>
            </a>

            {note && <p style={styles.note}>{note}</p>}
          </>
        )}

        <div style={styles.divider} />

        <p style={styles.qrTitle}>Scan to open this page</p>
        <div style={styles.qrBox}>
          <img
            src={
              "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
              encodeURIComponent(INSTALL_URL)
            }
            alt="QR code"
            style={styles.qr}
          />
        </div>
        <p style={styles.small}>{INSTALL_URL}</p>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 24,
    padding: "32px 22px",
    textAlign: "center",
    color: "#fff",
  },
  logo: { fontSize: 44 },
  h1: { margin: "8px 0 4px", fontSize: 26, letterSpacing: 2 },
  sub: { margin: 0, color: "#94a3b8", fontSize: 14 },
  sub2: { margin: "14px 0 0", color: "#94a3b8", fontSize: 14 },
  sizeBadge: {
    display: "inline-block",
    marginTop: 12,
    padding: "6px 14px",
    borderRadius: 999,
    background: "#1e293b",
    color: "#a5b4fc",
    fontSize: 12,
    fontWeight: 700,
  },
  btn: {
    display: "block",
    width: "100%",
    marginTop: 14,
    padding: "14px 12px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontSize: 17,
    fontWeight: 800,
    textDecoration: "none",
    color: "#fff",
  },
  btnInstall: { background: "#7c3aed" },
  btnBrowser: { background: "transparent", border: "2px solid #334155", color: "#e2e8f0" },
  btnSmall: { display: "block", fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.8 },
  note: { color: "#fbbf24", fontSize: 13, marginTop: 12 },
  success: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    background: "#052e16",
    color: "#86efac",
    fontSize: 15,
  },
  spinWrap: { marginTop: 22 },
  spinner: {
    width: 56,
    height: 56,
    margin: "0 auto",
    borderRadius: "50%",
    border: "5px solid #1e293b",
    borderTop: "5px solid #7c3aed",
    animation: "dgspin 0.9s linear infinite",
  },
  spinText: { margin: "14px 0 0", fontSize: 16, fontWeight: 800 },
  spinSub: { margin: "6px 0 0", color: "#94a3b8", fontSize: 13 },
  divider: { height: 1, background: "#1e293b", margin: "24px 0 16px" },
  qrTitle: { margin: 0, color: "#94a3b8", fontSize: 13 },
  qrBox: { display: "inline-block", background: "#fff", padding: 12, borderRadius: 14, marginTop: 10 },
  qr: { width: 200, height: 200, display: "block" },
  small: { color: "#64748b", fontSize: 12, marginTop: 10 },
};