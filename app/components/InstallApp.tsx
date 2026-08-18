"use client";

import { useEffect, useState } from "react";

export default function InstallApp() {
  const [promptEvt, setPromptEvt] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(localStorage.getItem("ff-install-hide") === "1");
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvt(e);
    };
    const onInstalled = () => {
      setPromptEvt(null);
      setHidden(true);
      localStorage.setItem("ff-install-hide", "1");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const ios = /iphone|ipad/i.test(navigator.userAgent.toLowerCase());
    const inApp =
      (navigator as any).standalone === true ||
      matchMedia("(display-mode: standalone)").matches;
    if (ios && !inApp) setTimeout(() => setShowIOS(true), 2500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl bg-violet-600/15 border border-violet-500/40 p-3 flex items-center gap-3">
      <span className="text-xl">📲</span>
      <p className="flex-1 text-xs font-bold">Get the full app experience!</p>
      {promptEvt ? (
        <button
          onClick={async () => {
            promptEvt.prompt();
            setPromptEvt(null);
            setHidden(true);
            localStorage.setItem("ff-install-hide", "1");
          }}
          className="px-3 py-1.5 rounded-full bg-violet-600 text-xs font-bold"
        >
          Install
        </button>
      ) : showIOS ? (
        <button
          onClick={() => alert("Tap Share ⬆️ then 'Add to Home Screen' ➕")}
          className="px-3 py-1.5 rounded-full bg-violet-600 text-xs font-bold"
        >
          How?
        </button>
      ) : null}
      <button
        onClick={() => {
          setHidden(true);
          localStorage.setItem("ff-install-hide", "1");
        }}
        className="text-slate-400"
      >
        ✖
      </button>
    </div>
  );
}