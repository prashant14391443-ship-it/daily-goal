"use client";
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

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

export default function VideoPlayer({
  youtubeId, isPlaylist, onTick,
}: {
  youtubeId: string;
  isPlaylist?: boolean;
  onTick?: (seconds: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const playingRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const [watched, setWatched] = useState(0);

  useEffect(() => {
    let dead = false;
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
          onReady: () => {
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
      if (tickRef.current) clearInterval(tickRef.current);
      try { player.current?.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  const m = Math.floor(watched / 60);
  const s = watched % 60;

  return (
    <div>
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
        <div ref={holder} className="w-full h-full" />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-teal-300">
        <Clock size={11} /> In-app watched: {m}m {s}s (counts only while playing)
      </p>
    </div>
  );
}