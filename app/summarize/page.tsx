"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Sparkles, Pin, Camera, Download, Share2, Image as ImageIcon } from "lucide-react";
import { EmptyState } from "@/app/components/ui";

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
  ["#dc2626", "#16a34a", "#2563eb", "#eab308", "#db2777", "#0891b2"],
  ["#8b5cf6", "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6"],
  ["#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#f59e0b", "#ec4899"],
  ["#0ea5e9", "#f59e0b", "#ec4899", "#84cc16", "#a855f7", "#ef4444"],
];

const DESIGN_NAMES = [
  "Radial Star", "Top Columns", "Side Branches", "Vertical Cascade",
  "Grid Columns", "Stacked Flow", "Concentric Rings", "Timeline",
  "Diamond", "Zigzag", "Cross Layout", "Pyramid",
  "Figure-8", "Wave Curve", "3D Cards", "Fan Spread",
  "Cluster Groups", "3×3 Grid", "Corner Spread", "Spiral",
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, font: string, maxLines: number): string[] {
  ctx.font = font;
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const wd of words) {
    const test = cur ? cur + " " + wd : wd;
    if (!cur || ctx.measureText(test).width <= maxW) cur = test;
    else { lines.push(cur); cur = wd; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last.length > 2 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    cut[maxLines - 1] = last + "…";
    return cut;
  }
  return lines;
}

function drawMap(map: MapData, title: string, designOverride?: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, 1080, 1080);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, 1080, 90);
  ctx.fillStyle = "#ffffff";
  const tLine = wrapText(ctx, "🧠 " + (title || "Summary"), 1000, "bold 36px sans-serif", 1);
  ctx.fillText(tLine[0], 540, 48);
  const design = designOverride ?? (hashStr(title + map.center) % 20);
  const pal = PALETTES[design % PALETTES.length];
  type Node = { x: number; y: number; lines: string[]; w: number; h: number; bg: string; font: string; lh: number; sub?: string[] };
  const nodes: Node[] = [];
  const edges: { a: number; b: number; color: string; w: number }[] = [];
  const addNode = (x: number, y: number, text: string, bg: string, font: string, maxW: number, lh: number, maxLines: number, sub?: string[]) => {
    const lines = wrapText(ctx, text, maxW, font, maxLines);
    const subLines = (sub || []).map((s) => wrapText(ctx, s, maxW, "18px sans-serif", 1)[0]);
    ctx.font = font;
    let wMax = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (subLines.length) { ctx.font = "18px sans-serif"; wMax = Math.max(wMax, ...subLines.map((s) => ctx.measureText("• " + s).width)); }
    const w = Math.min(wMax + 44, maxW + 44);
    const h = lines.length * lh + (subLines.length ? subLines.length * 24 + 10 : 0) + 28;
    const cx = Math.max(w / 2 + 16, Math.min(1064 - w / 2, x));
    const cy = Math.max(h / 2 + 106, Math.min(1064 - h / 2, y));
    nodes.push({ x: cx, y: cy, lines, w, h, bg, font, lh, sub: subLines });
    return nodes.length - 1;
  };
  const branches = (map.branches || []).slice(0, 6);
  const n = Math.max(branches.length, 1);
  let centerIdx = -1;
  if (design === 0) {
    centerIdx = addNode(540, 560, map.center, "#f59e0b", "bold 28px sans-serif", 340, 34, 2);
    branches.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const bi = addNode(540 + Math.cos(a) * 270, 560 + Math.sin(a) * 270, b.name, pal[i % 6], "bold 22px sans-serif", 240, 28, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const ki = addNode(540 + Math.cos(a) * 460, 560 + Math.sin(a) * 460 + (j - (b.kids.length - 1) / 2) * 110, k, "#1e293b", "18px sans-serif", 220, 24, 3);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 1) {
    const bs = branches.slice(0, 4);
    const colW = 1080 / (bs.length + 1);
    centerIdx = addNode(540, 160, map.center, "#f59e0b", "bold 28px sans-serif", 400, 34, 2);
    bs.forEach((b, i) => {
      const x = colW * (i + 1);
      const bi = addNode(x, 380, b.name, pal[i % 6], "bold 22px sans-serif", colW - 40, 28, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const ki = addNode(x, 580 + j * 140, k, "#1e293b", "18px sans-serif", colW - 50, 24, 3);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 2) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 280, 34, 2);
    const rows = Math.ceil(n / 2);
    branches.forEach((b, i) => {
      const left = i % 2 === 0;
      const row = Math.floor(i / 2);
      const y = rows === 1 ? 540 : 240 + (row * 620) / (rows - 1);
      const bi = addNode(left ? 280 : 800, y, b.name, pal[i % 6], "bold 22px sans-serif", 260, 28, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 2).forEach((k, j) => {
        const ki = addNode(left ? 280 : 800, y + 110 + j * 110, k, "#1e293b", "18px sans-serif", 260, 24, 3);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 3) {
    centerIdx = addNode(540, 150, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    let prev = centerIdx;
    branches.slice(0, 4).forEach((b, i) => {
      const bi = addNode(540, 320 + i * 210, b.name, pal[i % 6], "bold 24px sans-serif", 700, 30, 2, (b.kids || []).slice(0, 3));
      edges.push({ a: prev, b: bi, color: pal[i % 6], w: 5 });
      prev = bi;
    });
  } else if (design === 4) {
    const bs = branches.slice(0, 4);
    const cw = 1000 / bs.length;
    centerIdx = addNode(540, 150, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    bs.forEach((b, i) => {
      const x = 40 + cw * (i + 0.5);
      const bi = addNode(x, 300, b.name, pal[i % 6], "bold 22px sans-serif", cw - 40, 28, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const ki = addNode(x, 470 + j * 150, k, "#1e293b", "18px sans-serif", cw - 50, 24, 3);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 3 });
      });
    });
  } else if (design === 5) {
    centerIdx = addNode(540, 150, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    branches.forEach((b, i) => {
      const bi = addNode(540, 300 + i * 170, b.name, pal[i % 6], "bold 24px sans-serif", 800, 30, 2, (b.kids || []).slice(0, 3));
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
  } else if (design === 6) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 320, 34, 2);
    const inner = branches.slice(0, Math.ceil(n / 2));
    const outer = branches.slice(Math.ceil(n / 2));
    inner.forEach((b, i) => {
      const a = (i / Math.max(inner.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const bi = addNode(540 + Math.cos(a) * 200, 540 + Math.sin(a) * 200, b.name, pal[i % 6], "bold 20px sans-serif", 200, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
    outer.forEach((b, i) => {
      const a = (i / Math.max(outer.length, 1)) * Math.PI * 2 - Math.PI / 2 + 0.3;
      const bi = addNode(540 + Math.cos(a) * 400, 540 + Math.sin(a) * 400, b.name, pal[(i + 3) % 6], "bold 20px sans-serif", 200, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[(i + 3) % 6], w: 4 });
    });
  } else if (design === 7) {
    centerIdx = addNode(540, 200, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    const colW = 1000 / Math.max(n, 1);
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(80, 540); ctx.lineTo(1000, 540); ctx.stroke();
    branches.forEach((b, i) => {
      const x = 80 + colW * (i + 0.5);
      const top = i % 2 === 0;
      const y = top ? 380 : 700;
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 18px sans-serif", colW - 30, 24, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 3 });
    });
  } else if (design === 8) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 300, 34, 2);
    branches.forEach((b, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rx = 380, ry = 250;
      const x = 540 + Math.cos(a) * rx * (Math.abs(Math.cos(a)) > 0.5 ? 1 : 0.7);
      const y = 540 + Math.sin(a) * ry * (Math.abs(Math.sin(a)) > 0.5 ? 1 : 0.7);
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 240, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
  } else if (design === 9) {
    centerIdx = addNode(540, 150, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    let prev = centerIdx;
    branches.forEach((b, i) => {
      const x = i % 2 === 0 ? 300 : 780;
      const y = 280 + i * 150;
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 22px sans-serif", 320, 28, 2, (b.kids || []).slice(0, 2));
      edges.push({ a: prev, b: bi, color: pal[i % 6], w: 4 });
      prev = bi;
    });
  } else if (design === 10) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 300, 34, 2);
    const positions = [[540, 260], [820, 540], [540, 820], [260, 540], [780, 260], [780, 820]];
    branches.forEach((b, i) => {
      const [x, y] = positions[i] || [540, 540];
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 260, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
  } else if (design === 11) {
    centerIdx = addNode(540, 200, map.center, "#f59e0b", "bold 28px sans-serif", 400, 34, 2);
    const tier1 = branches.slice(0, 2);
    const tier2 = branches.slice(2, 4);
    const tier3 = branches.slice(4, 6);
    [tier1, tier2, tier3].forEach((tier, ti) => {
      const colW = 900 / Math.max(tier.length, 1);
      tier.forEach((b, i) => {
        const x = 90 + colW * (i + 0.5);
        const y = 420 + ti * 240;
        const bi = addNode(x, y, b.name, pal[(ti + i) % 6], "bold 20px sans-serif", colW - 30, 26, 2);
        edges.push({ a: centerIdx, b: bi, color: pal[(ti + i) % 6], w: 4 });
      });
    });
  } else if (design === 12) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 260, 34, 2);
    const left = branches.slice(0, Math.floor(n / 2));
    const right = branches.slice(Math.floor(n / 2));
    left.forEach((b, i) => {
      const a = (i / Math.max(left.length, 1)) * Math.PI - Math.PI / 2;
      const bi = addNode(320 + Math.cos(a) * 180, 540 + Math.sin(a) * 280, b.name, pal[i % 6], "bold 20px sans-serif", 220, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
    right.forEach((b, i) => {
      const a = (i / Math.max(right.length, 1)) * Math.PI + Math.PI / 2;
      const bi = addNode(760 + Math.cos(a) * 180, 540 + Math.sin(a) * 280, b.name, pal[(i + 3) % 6], "bold 20px sans-serif", 220, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[(i + 3) % 6], w: 4 });
    });
  } else if (design === 13) {
    centerIdx = addNode(540, 200, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    branches.forEach((b, i) => {
      const x = 120 + (i * 840 / Math.max(n - 1, 1));
      const y = 540 + Math.sin((i / n) * Math.PI * 2) * 180;
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 200, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
  } else if (design === 14) {
    centerIdx = addNode(540, 150, map.center, "#f59e0b", "bold 28px sans-serif", 500, 34, 2);
    branches.forEach((b, i) => {
      const offset = i * 15;
      const bi = addNode(540 + offset, 310 + i * 160, b.name, pal[i % 6], "bold 22px sans-serif", 600, 28, 2, (b.kids || []).slice(0, 2));
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 3 });
    });
  } else if (design === 15) {
    centerIdx = addNode(540, 900, map.center, "#f59e0b", "bold 28px sans-serif", 360, 34, 2);
    branches.forEach((b, i) => {
      const a = (i / (n - 1 || 1)) * Math.PI - Math.PI;
      const x = 540 + Math.cos(a) * 450;
      const y = 900 + Math.sin(a) * 450;
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 240, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 5 });
    });
  } else if (design === 16) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 26px sans-serif", 280, 34, 2);
    const clusters = [[200, 250], [880, 250], [200, 830], [880, 830], [540, 250], [540, 830]];
    branches.forEach((b, i) => {
      const [cx, cy] = clusters[i] || [540, 540];
      const bi = addNode(cx, cy, b.name, pal[i % 6], "bold 20px sans-serif", 240, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
      (b.kids || []).slice(0, 3).forEach((k, j) => {
        const angle = (j / 3) * Math.PI * 2;
        const ki = addNode(cx + Math.cos(angle) * 110, cy + Math.sin(angle) * 110, k, "#1e293b", "16px sans-serif", 180, 22, 2);
        edges.push({ a: bi, b: ki, color: pal[i % 6], w: 2 });
      });
    });
  } else if (design === 17) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 280, 34, 2);
    const gridPositions = [[200, 200], [540, 200], [880, 200], [200, 540], [880, 540], [200, 880], [540, 880], [880, 880]];
    branches.forEach((b, i) => {
      const [x, y] = gridPositions[i] || [540, 540];
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 260, 26, 2);
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 3 });
    });
  } else if (design === 18) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 300, 34, 2);
    const corners = [[200, 200], [880, 200], [880, 880], [200, 880], [540, 200], [540, 880]];
    branches.forEach((b, i) => {
      const [x, y] = corners[i] || [540, 540];
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 260, 26, 2, (b.kids || []).slice(0, 2));
      edges.push({ a: centerIdx, b: bi, color: pal[i % 6], w: 4 });
    });
  } else if (design === 19) {
    centerIdx = addNode(540, 540, map.center, "#f59e0b", "bold 28px sans-serif", 300, 34, 2);
    let prev = centerIdx;
    branches.forEach((b, i) => {
      const a = (i / n) * Math.PI * 3;
      const r = 150 + i * 50;
      const x = 540 + Math.cos(a) * r;
      const y = 540 + Math.sin(a) * r;
      const bi = addNode(x, y, b.name, pal[i % 6], "bold 20px sans-serif", 240, 26, 2);
      edges.push({ a: prev, b: bi, color: pal[i % 6], w: 3 });
      prev = bi;
    });
  }
  edges.forEach((e) => {
    ctx.strokeStyle = e.color; ctx.lineWidth = e.w;
    ctx.beginPath(); ctx.moveTo(nodes[e.a].x, nodes[e.a].y); ctx.lineTo(nodes[e.b].x, nodes[e.b].y); ctx.stroke();
  });
  nodes.forEach((nd) => {
    ctx.fillStyle = nd.bg;
    ctx.beginPath(); ctx.roundRect(nd.x - nd.w / 2, nd.y - nd.h / 2, nd.w, nd.h, 16); ctx.fill();
    ctx.fillStyle = "#ffffff";
    const subCount = nd.sub?.length || 0;
    const contentH = nd.lines.length * nd.lh + subCount * 24;
    let yy = nd.y - contentH / 2 + nd.lh / 2;
    ctx.font = nd.font;
    nd.lines.forEach((ln) => { ctx.fillText(ln, nd.x, yy); yy += nd.lh; });
    if (nd.sub && nd.sub.length) {
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      yy += 4;
      nd.sub.forEach((ln) => { ctx.fillText("• " + ln, nd.x, yy + 8); yy += 24; });
    }
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
  const [designPick, setDesignPick] = useState<number | null>(null);

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 1024;
          let { width, height } = image;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width; canvas.height = height;
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
      const res = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text || undefined, image: img || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResult(data);
      if (data.map) setMapImg(drawMap(data.map, data.title || "Summary", designPick ?? undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed. Try again.");
    }
    setLoading(false);
  };

  const download = () => {
    if (!mapImg) return;
    const a = document.createElement("a");
    a.href = mapImg; a.download = "summary-mindmap.png"; a.click();
  };

  const share = async () => {
    if (!mapImg) return;
    const blob = dataUrlToBlob(mapImg);
    const file = new File([blob], "summary-mindmap.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: "Summary" }); } catch {}
    } else { download(); }
  };

  const redrawWithDesign = (d: number) => {
    if (result?.map) {
      setDesignPick(d);
      setMapImg(drawMap(result.map, result.title || "Summary", d));
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-24 max-w-4xl mx-auto">
      {/* 🌆 CALM HERO */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 p-5 shadow-xl shadow-teal-900/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className={`w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center ${loading ? "animate-pulse" : ""}`}>
            <Brain size={22} strokeWidth={2.2} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight" style={{ whiteSpace: "nowrap" }}>Summarize Anything</h1>
            <p className="text-[11px] text-white/75 font-semibold mt-0.5">
              AI picks optimal points (5-10) + draws mind-map (20 designs!)
            </p>
          </div>
        </div>
      </div>

      {/* 📝 FORM */}
      <form onSubmit={generate} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 grid gap-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Sparkles size={16} strokeWidth={2.2} />
          </span>
          <p className="font-black text-sm text-white">What to summarize?</p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a topic or paste text (e.g. Photosynthesis, World War 2 causes...)"
          rows={3}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm outline-none focus:border-cyan-500"
        />

        <label className="press block bg-slate-800 border-2 border-dashed border-slate-700 hover:border-cyan-500/40 rounded-xl p-4 text-center cursor-pointer transition-colors">
          <span className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Camera size={22} strokeWidth={2.2} />
          </span>
          <p className="text-sm text-slate-400 mt-2 font-bold">
            {img ? "Photo attached ✅ (tap to change)" : "or tap to add photo of notes"}
          </p>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        </label>
        {img && <img src={img} alt="notes" className="rounded-xl max-h-52 object-cover" />}

        <button
          type="submit"
          disabled={loading || (!text && !img)}
          className="press w-full py-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-black text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Sparkles size={15} />
          {loading ? "AI is summarizing..." : "Summarize + Draw Map"}
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-4 text-center">
          <p className="text-sm font-bold text-red-300">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="grid gap-4">
          {/* POINTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Pin size={15} strokeWidth={2.2} />
              </span>
              <h3 className="font-black text-base text-white flex-1">{result.title}</h3>
              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
                {result.points.length} points
              </span>
            </div>
            <div className="grid gap-2">
              {(result.points || []).map((p, i) => (
                <div key={i} className="flex gap-3 items-start bg-slate-800/60 rounded-xl p-3">
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${
                    i < 3 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-slate-700"
                  }`}>
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-200">{p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* MAP */}
          {mapImg && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Brain size={15} strokeWidth={2.2} />
                </span>
                <h3 className="font-black text-base text-white flex-1">Memory Map</h3>
                <span className="text-[9px] font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-md">
                  Design {designPick !== null ? designPick : "auto"}
                </span>
              </div>
              <img src={mapImg} alt="mind map" className="rounded-xl w-full" />

              <div className="mt-4">
                <p className="text-[10px] font-black text-slate-500 mb-2">🎨 TRY A DIFFERENT LAYOUT</p>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto [scrollbar-width:thin]">
                  {DESIGN_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => redrawWithDesign(i)}
                      className={`press px-2 py-2 rounded-lg text-[10px] font-black transition-all ${
                        designPick === i
                          ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                          : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {i + 1}. {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={download} className="press flex-1 py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-sm font-black text-cyan-300 flex items-center justify-center gap-1.5">
                  <Download size={15} /> Download
                </button>
                <button onClick={share} className="press flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-black text-slate-300 flex items-center justify-center gap-1.5">
                  <Share2 size={15} /> Share
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl mt-2">
          <EmptyState emoji="🧠✨" text="Type a topic or add a photo — AI will summarize + draw a mind-map!" />
        </div>
      )}

      <Link href="/study" className="inline-block mt-6 text-sm text-slate-500 hover:text-white press font-bold">
        ← Back to Study
      </Link>
    </main>
  );
}