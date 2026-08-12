"use client";

import { useState } from "react";
import Link from "next/link";

type MapData = {
  center: string;
  branches: { name: string; kids: string[] }[];
};

type Result = {
  title: string;
  points: string[];
  map: MapData;
};

function dataUrlToBlob(du: string) {
  const [head, b64] = du.split(",");
  const mime = head.split(":")[1].split(";")[0];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function drawMap(map: MapData, title: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🧠 " + title.slice(0, 30), 540, 60);

  const colors = ["#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];
  const cx = 540;
  const cy = 560;

  const box = (
    x: number,
    y: number,
    text: string,
    bg: string,
    font: string,
    maxW: number
  ) => {
    ctx.font = font;
    let t = text;
    if (ctx.measureText(t).width > maxW) {
      while (t.length > 3 && ctx.measureText(t + "…").width > maxW)
        t = t.slice(0, -1);
      t += "…";
    }
    const w = ctx.measureText(t).width + 36;
    const h = font.includes("22") ? 48 : 60;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(t, x, y);
  };

  const branches = (map.branches || []).slice(0, 6);
  const n = branches.length || 1;

  branches.forEach((b, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(a) * 300;
    const by = cy + Math.sin(a) * 300;
    const color = colors[i % colors.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx, by);
    ctx.stroke();

    (b.kids || []).slice(0, 3).forEach((k, j) => {
      const kids = Math.min((b.kids || []).length, 3);
      const off = (j - (kids - 1) / 2) * 0.22;
      const kx = cx + Math.cos(a + off) * 520;
      const ky = cy + Math.sin(a + off) * 520;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(kx, ky);
      ctx.stroke();
      box(kx, ky, k, "#1e293b", "22px sans-serif", 240);
    });

    box(bx, by, b.name, color, "bold 26px sans-serif", 260);
  });

  box(cx, cy, map.center, "#f59e0b", "bold 32px sans-serif", 300);

  return canvas.toDataURL("image/png");
}

export default function SummarizePage() {
  const [text, setText] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [mapImg, setMapImg] = useState("");

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024;
          let { width, height } = image;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        image.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImg(await compressImage(f));
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text || undefined, image: img || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResult(data);
      if (data.map) setMapImg(drawMap(data.map, data.title || "Summary"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Try again.");
    }
    setLoading(false);
  };

  const download = () => {
    if (!mapImg) return;
    const a = document.createElement("a");
    a.href = mapImg;
    a.download = "summary-mindmap.png";
    a.click();
  };

  const share = async () => {
    if (!mapImg) return;
    const blob = dataUrlToBlob(mapImg);
    const file = new File([blob], "summary-mindmap.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "Summary" });
      } catch {
        // cancelled
      }
    } else {
      download();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-xl">🧠</span>
          Summarize Anything
        </h1>
        <p className="text-slate-400">
          Photo or topic → key points + mind-map you can download
        </p>
      </div>

      <form onSubmit={generate} className="bg-slate-900 p-6 rounded-lg mb-8 grid gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a topic or paste text (e.g. Photosynthesis, World War 2 causes...)"
          rows={3}
          className="p-3 rounded bg-slate-800 border border-slate-700"
        />
        <label className="block bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500">
          <span className="text-2xl">📷</span>
          <p className="text-sm text-slate-400 mt-1">
            {img ? "Photo attached ✅ (tap to change)" : "or tap to add photo of notes"}
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="hidden"
          />
        </label>
        {img && (
          <img src={img} alt="notes" className="rounded-lg max-h-52 object-cover" />
        )}
        <button
          disabled={loading || (!text && !img)}
          className="py-3 rounded bg-cyan-600 hover:bg-cyan-500 font-semibold disabled:opacity-50"
        >
          {loading ? "🤖 AI is summarizing..." : "⚡ Summarize + Draw Map"}
        </button>
      </form>

      {error && <p className="text-red-400 mb-4">❌ {error}</p>}

      {result && (
        <div className="grid gap-6">
          <div className="bg-slate-900 rounded-xl p-5">
            <h3 className="text-xl font-bold mb-3">📌 {result.title}</h3>
            <div className="grid gap-2">
              {(result.points || []).map((p, i) => (
                <p key={i} className="text-sm bg-slate-800 rounded p-2">
                  {i + 1}. {p}
                </p>
              ))}
            </div>
          </div>

          {mapImg && (
            <div className="bg-slate-900 rounded-xl p-5">
              <h3 className="text-xl font-bold mb-3">🧠 Memory Map</h3>
              <img src={mapImg} alt="mind map" className="rounded-lg w-full" />
              <div className="flex gap-3 mt-4 flex-wrap">
                <button
                  onClick={download}
                  className="flex-1 min-w-[140px] py-3 rounded bg-cyan-600 hover:bg-cyan-500 font-semibold"
                >
                  📥 Download to Phone
                </button>
                <button
                  onClick={share}
                  className="flex-1 min-w-[140px] py-3 rounded bg-slate-800 hover:bg-slate-700 font-semibold"
                >
                  📤 Share
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link
        href="/study-tracker"
        className="inline-block mt-6 text-sm text-slate-400 hover:text-white"
      >
        ← Back to Study
      </Link>
    </main>
  );
}