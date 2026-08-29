export type MapData = { center: string; branches: { name: string; kids: string[] }[] };

export function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
}

export const PALETTES = [
  ["#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#06b6d4"],
  ["#f472b6", "#fb923c", "#a3e635", "#38bdf8", "#c084fc", "#f87171"],
  ["#14b8a6", "#f59e0b", "#6366f1", "#ec4899", "#84cc16", "#0ea5e9"],
  ["#e11d48", "#7c3aed", "#0891b2", "#65a30d", "#d97706", "#db2777"],
  ["#22d3ee", "#facc15", "#f472b6", "#4ade80", "#a78bfa", "#fb7185"],
  ["#fbbf24", "#34d399", "#60a5fa", "#f87171", "#94a3b8", "#c084fc"],
  ["#dc2626", "#16a34a", "#2563eb", "#eab308", "#db2777", "#0891b2"],
  ["#8b5cf6", "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6"],
  ["#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#f59e0b", "#ec4899"],
  ["#0ea5e9", "#f59e0b", "#ec4899", "#84cc16", "#a78bfa", "#ef4444"],
];

export const DESIGN_NAMES = [
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

export function drawMap(map: MapData, title: string, designOverride?: number): string {
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

export function dataUrlToBlob(du: string) {
  const [head, b64] = du.split(",");
  const mime = head.split(":")[1].split(";")[0];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}