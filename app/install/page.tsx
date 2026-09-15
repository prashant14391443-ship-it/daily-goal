"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const APP_URL = "https://daily-goal-beige.vercel.app";
const INSTALL_URL = APP_URL + "/install";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setAlreadyInstalled(window.matchMedia("(display-mode: standalone)").matches);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallEvent(null);
    } else {
      setShowHelp(true);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🎯</div>
        <h1 style={styles.h1}>DAILY GOAL</h1>
        <p style={styles.sub}>Study • Compete • Connect</p>

        {installed ? (
          <div style={styles.success}>
            ✅ Installed! Open <b>Daily Goal</b> from your home screen.
          </div>
        ) : alreadyInstalled ? (
          <a href="/" style={{ ...styles.btn, ...styles.btnBrowser }}>
            🎯 OPEN APP
          </a>
        ) : (
          <>
            <button onClick={handleInstall} style={{ ...styles.btn, ...styles.btnInstall }}>
              📲 INSTALL APP
              <span style={styles.btnSmall}>Gets an icon on your home screen</span>
            </button>

            <a href="/" style={{ ...styles.btn, ...styles.btnBrowser }}>
              🌐 USE IN BROWSER
              <span style={styles.btnSmall}>Continue in Chrome / any browser</span>
            </a>
          </>
        )}

        {showHelp && (
          <div style={styles.help}>
            <b>Install manually (10 seconds):</b>
            <ul style={styles.helpList}>
              <li>
                <b>Android Chrome:</b> tap ⋮ menu → “Install and create shortcut” → Install
              </li>
              <li>
                <b>iPhone:</b> Share button → “Add to Home Screen”
              </li>
              <li>Or just continue in the browser — it works fully.</li>
            </ul>
          </div>
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
  success: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    background: "#052e16",
    color: "#86efac",
    fontSize: 15,
  },
  help: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    background: "#1e293b",
    textAlign: "left",
    fontSize: 14,
    lineHeight: 1.6,
  },
  helpList: { margin: "8px 0 0", paddingLeft: 18 },
  divider: { height: 1, background: "#1e293b", margin: "24px 0 16px" },
  qrTitle: { margin: 0, color: "#94a3b8", fontSize: 13 },
  qrBox: { display: "inline-block", background: "#fff", padding: 12, borderRadius: 14, marginTop: 10 },
  qr: { width: 200, height: 200, display: "block" },
  small: { color: "#64748b", fontSize: 12, marginTop: 10 },
};