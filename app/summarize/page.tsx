"use client";

import { useState } from "react";
import Link from "next/link";

type MapData = {
  center: string;
  branches: { name: string; kids: string[] }[];
};

type Result = { title: string; points: string[]; map: MapData };

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
}

const PALETTES = [
  ["#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"],
  ["#f472b6", "#fb923c", "#a3e635", "#38bdf8", "#c084fc", "#f87171"],
  ["#14b8a6", "#f59e0b", "#6366f1", "#ec4899", "#84cc16", "#0ea5e9"],
  ["#e11d48", "#7c3aed", "#0891b2", "#65a30d", "#d97706", "#db2777"],
  ["#22d3ee", "#facc15", "#f472b6", "#4ade80", "#a78bfa", "#fb7185"],
  ["#fbbf24", "#34d399", "#60a5fa", "#f87171", "#94a3b8", "#c084fc"],
];

function drawMap(map: MapData, title: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, 1080, 1080);

  // title bar (never overlaps)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 1080, 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let tt = "🧠 " + (title || "Summary");
  while (ctx.measureText(tt).width > 1000 && tt.length > 4) tt = tt.slice(0, -1);
  if (tt !== "🧠 " + (title || "Summary")) tt += "…";
  ctx.fillText(tt, 540, 48);

  const design = hashStr(title + map.center) % 6;
  const pal = PALETTES[design];

  type Node = { x: number; y: number; text: string; bg: string; font: string; maxW: number; h: number };
  const nodes: Node[] = [];
  const edges: { a: number; b: number; color: string; w: number }[] = [];

  const addNode = (x: number, y: number, text: string, bg: string, font: string, maxW: number, h: number) => {
    ctx.font = font;
    let t = text;
    if (ctx.measureText(t).width > maxW) {
      while (t.length > 2 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
      t += "…";
    }
    const w = Math.min(ctx.measureText(t).width + 36, maxW + 36);
    const cx = Math.max(w / 2 + 16, Math.min(1080 - w / 2 - 16, x));
    const cy = Math.max(h / 2 + 106, Math.min(1080 - h / 2 - 16, y));
    nodes.push({ x: cx, y: cy, text: t, bg, font, maxW, h });
    return nodes.length - 1;
  };

  const branches = (map.branches || []).slice(0, design === 3 ? 4 : 6);
  const n = Math.max(branches.length, 1);

  let centerIdx = -1;

  if (design === 0) {
    // RADIAL
    centerIdx = addNode(540, 570, map.center, "#f59e0b", "bold 30px sans-serif", 300, 64);
    branches.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const bi = addNode(540 + Math.cos(a) * 280, 570 + Math.sin(a) * 280, b.name, pal[i % 6], "bold 24px sans-serif", 240, 54);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const kids = Math.min((b.kids || []).length, 3);
        const off = (j - (kids - 1) / 2) * 0.25;
        const ki = addNode(540 + Math.cos(a + off) * 470, 570 + Math.sin(a + off) * 470, k, "#1e293b", "20px sans-serif", 200, 44);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 1) {
    // TREE (top-down)
    centerIdx = addNode(540, 160, map.center, "#f59e0b", "bold 30px sans-serif", 400, 64);
    branches.forEach((b, i) => {
      const x = (1080 / (n + 1)) * (i + 1);
      const bi = addNode(x, 400, b.name, pal[i % 6], "bold 22px sans-serif", 1080 / (n + 1) - 50, 54);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const ki = addNode(x, 580 + j * 90, k, "#1e293b", "18px sans-serif", 1080 / (n + 1) - 60, 44);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 2) {
    // LEFT-RIGHT
    centerIdx = addNode(540, 560, map.center, "#f59e0b", "bold 30px sans-serif", 280, 64);
    const rows = Math.ceil(n / 2);
    branches.forEach((b, i) => {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const y = rows === 1 ? 560 : 240 + (row * 640) / (rows - 1);
      const bi = addNode(left ? 260 : 820, y, b.name, pal[i % 6], "bold 22px sans-serif", 240, 54);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 2).forEach((k, j) => {
        const ki = addNode(left ? 150 : 930, y + (j - 0.5) * 120, k, "#1e293b", "18px sans-serif", 200, 42);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 3) {
    // FLOWCHART (vertical)
    centerIdx = addNode(540, 160, map.center, "#f59e0b", "bold 30px sans-serif", 500, 64);
    let prev = centerIdx;
    branches.forEach((b, i) => {
      const bi = addNode(540, 320 + i * 190, b.name, pal[i % 6], "bold 24px sans-serif", 600, 58);
      edges.push({ a: prev, b: bi, color: pal[i % 6], w: 5 });
      const kidsText = (b.kids || []).slice(0, 3).join("  •  ");
      if (kidsText) {
        const ki = addNode(540, 320 + i * 190 + 78, kidsText, "#1e293b", "18px sans-serif", 800, 42);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      }
      prev = bi;
    });
  } else if (design === 4) {
    // COLUMNS
    const cols = Math.min(n, 4);
    const cw = 1000 / cols;
    centerIdx = addNode(540, 160, map.center, "#f59e0b", "bold 30px sans-serif", 500, 64);
    branches.slice(0, 4).forEach((b, i) => {
      const x = 40 + cw * (i + 0.5);
      const bi = addNode(x, 300, b.name, pal[i % 6], "bold 22px sans-serif", cw - 40, 54);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 4).forEach((k, j) => {
        const ki = addNode(x, 420 + j * 110, k, "#1e293b", "18px sans-serif", cw - 50, 60);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else {
    // BARS (infographic)
    centerIdx = addNode(540, 160, map.center, "#f59e0b", "bold 30px sans-serif", 500, 64);
    branches.forEach((b, i) => {
      const bi = addNode(540, 300 + i * 150, b.name, pal[i % 6], "bold 24px sans-serif", 700, 58);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const kids = Math.min((b.kids || []).length, 3);
        const ki = addNode(540 + (j - (kids - 1) / 2) * 340, 300 + i * 150 + 72, k, "#1e293b", "17px sans-serif", 300, 40);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  }

  // draw lines first, boxes on top
  edges.forEach((e) => {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = e.w;
    ctx.beginPath();
    ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
    ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
    ctx.stroke();
  });

  nodes.forEach((nd) => {
    ctx.font = nd.font;
    const w = Math.min(ctx.measureText(nd.text).width + 36, nd.maxW + 36);
    ctx.fillStyle = nd.bg;
    ctx.beginPath();
    ctx.roundRect(nd.x - w / 2, nd.y - nd.h / 2, w, nd.h, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(nd.text, nd.x, nd.y);
  });

  return canvas.toDataURL("image/png");
}

function dataUrlToBlob(du: string) {
  const [head, b64] = du.split(",");
  const mime = head.split(":")[1].split(";")[0];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
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
          Photo or topic → key points + mind-map (6 designs!)
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