"use client";

import { useEffect, useState } from "react";

export default function InstallApp() {
  const [promptEvt, setPromptEvt] = useState<any>(null);
  const [hidden, setHidden] = useState(true);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem("ff-install-hide") === "1");
    const standalone =
      (navigator as any).standalone === true ||
      matchMedia("(display-mode: standalone)").matches;
    setInApp(standalone);
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
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || inApp) return null;

  const ios = /iphone|ipad/i.test(navigator.userAgent.toLowerCase());

  const guide = () => {
    alert(
      ios
        ? "iPhone: tap Share ⬆️ → 'Add to Home Screen' ➕"
        : "Android: tap ⋮ menu (top right) → 'Add to Home screen' / 'Install app' ⬇️"
    );
  };

  return (
    <div className="mx-4 mt-3 rounded-xl bg-violet-600/15 border border-violet-500/40 p-3 flex items-center gap-3">
      <span className="text-xl">📲</span>
      <p className="flex-1 text-xs font-bold">Install App — one tap!</p>
      {promptEvt ? (
        <button
          onClick={async () => {
            promptEvt.prompt();
            setPromptEvt(null);
            setHidden(true);
            localStorage.setItem("ff-install-hide", "1");
          }}
          className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-xs font-bold"
        >
          ⬇️ Install
        </button>
      ) : (
        <button
          onClick={guide}
          className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-xs font-bold"
        >
          How?
        </button>
      )}
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