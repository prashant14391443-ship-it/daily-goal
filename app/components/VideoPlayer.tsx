"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, ExternalLink, AlertCircle, RefreshCw, Flag, BadgeCheck } from "lucide-react";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady?: () => void; }
}

function loadYT(): Promise<any> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

const ERR_MSG: Record<number, string> = {
  2: "Invalid video ID.",
  5: "Player error on this device.",
  100: "Video not found — deleted or made private.",
  101: "Owner disabled embedding on other sites.",
  150: "Owner disabled embedding on other sites.",
};

export default function VideoPlayer({
  youtubeId,
  isPlaylist,
  onTick,
  title,
  channel,
  minutes,
  isComplete,
}: {
  youtubeId: string;
  isPlaylist?: boolean;
  onTick?: (seconds: number) => void;
  title?: string;
  channel?: string;
  minutes?: number;
  isComplete?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const playingRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const [watched, setWatched] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const directUrl = isPlaylist
    ? `https://www.youtube.com/playlist?list=${youtubeId}`
    : `https://www.youtube.com/watch?v=${youtubeId}`;

  useEffect(() => {
    let dead = false;
    setError(null);

    // Safety timeout — if YT API doesn't load in 10s, show fallback
    const timeout = setTimeout(() => {
      if (!dead && !player.current) setError("YouTube player load nahi hua. Network issue ho sakta hai.");
    }, 10000);

    loadYT().then((YT) => {
      if (dead || !holder.current) return;
      const opts: any = {
        playerVars: {
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          ...(isPlaylist ? { listType: "playlist", list: youtubeId } : {}),
        },
        events: {
          onStateChange: (e: any) => {
            playingRef.current = e.data === 1; // 1 = playing
          },
          onError: (e: any) => {
            if (!dead) setError(ERR_MSG[e.data] || "Video unavailable.");
          },
          onReady: () => {
            clearTimeout(timeout);
            // count every 5s, only if playing AND tab visible (no hour farming)
            tickRef.current = window.setInterval(() => {
              if (playingRef.current && document.visibilityState === "visible") {
                setWatched((w) => w + 5);
                onTick?.(5);
              }
            }, 5000);
          },
        },
      };
      if (!isPlaylist) opts.videoId = youtubeId;
      player.current = new YT.Player(holder.current, opts);
    });

    return () => {
      dead = true;
      clearTimeout(timeout);
      if (tickRef.current) clearInterval(tickRef.current);
      try { player.current?.destroy(); } catch {}
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId, retryKey]);

  const report = () => {
    try {
      const list = JSON.parse(localStorage.getItem("dg-broken-videos") || "[]");
      if (!list.includes(youtubeId)) list.push(youtubeId);
      localStorage.setItem("dg-broken-videos", JSON.stringify(list));
    } catch {}
    setReported(true);
  };

  const m = Math.floor(watched / 60);
  const s = watched % 60;
  const hrs = minutes ? Math.floor(minutes / 60) : 0;
  const mins = minutes ? minutes % 60 : 0;

  return (
    <div>
      {/* 📋 video info + complete-guide badge (only shows if title/channel passed) */}
      {(title || channel) && (
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {title && <p className="text-sm font-bold text-white leading-tight">{title}</p>}
            {channel && (
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {channel}{minutes ? ` · ${hrs > 0 ? `${hrs}h ` : ""}${mins}m` : ""}
              </p>
            )}
          </div>
          {isComplete && (
            <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black text-emerald-300">
              <BadgeCheck size={11} /> COMPLETE GUIDE
            </span>
          )}
        </div>
      )}

      {error ? (
        /* 🚨 fallback panel when video is dead */
        <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-rose-500/30 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertCircle size={36} className="text-rose-400" />
          <div>
            <p className="text-sm font-black text-white">Video unavailable</p>
            <p className="text-[11px] text-slate-400 mt-1">{error}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <a href={directUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors">
              <ExternalLink size={14} /> Open on YouTube
            </a>
            <button onClick={() => { setWatched(0); setRetryKey((k) => k + 1); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black transition-colors">
              <RefreshCw size={14} /> Retry
            </button>
            <button onClick={report} disabled={reported}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-black transition-colors disabled:opacity-50">
              <Flag size={14} /> {reported ? "Reported ✓" : "Report broken"}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
          <div ref={holder} className="w-full h-full" />
        </div>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-teal-300">
        <Clock size={11} /> In-app watched: {m}m {s}s (counts only while playing)
      </p>
    </div>
  );
}