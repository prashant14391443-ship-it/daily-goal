"use client";

import { useEffect, useRef, useState } from "react";

const MAX_WORK = 1600; // auto-shrink huge photos (memory saver)
const OUT = 256;       // final avatar size
const QUALITY = 0.85;  // jpeg compression

export default function AvatarCropper({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (f: File) => void;
  onCancel: () => void;
}) {
  const V = 280; // circular window size
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [work, setWork] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      const maxDim = Math.max(im.width, im.height);
      if (maxDim > MAX_WORK) {
        const scale = MAX_WORK / maxDim;
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * scale);
        c.height = Math.round(im.height * scale);
        c.getContext("2d")?.drawImage(im, 0, 0, c.width, c.height);
        setWork(c);
      } else {
        setWork(im);
      }
    };
    im.src = src;
  }, [src]);

  const W = work?.width || V;
  const H = work?.height || V;
  const fit = Math.min(V / W, V / H);                       // zoom 1 = whole photo visible
  const coverZoom = Math.max(W, H) / Math.min(W, H);        // zoom that fills the circle
  const displayW = W * fit * zoom;
  const displayH = H * fit * zoom;

  // WhatsApp-style: free movement, only keep ≥40px of photo on screen so it can't get lost
  const mX = (displayW + V) / 2 - 40;
  const mY = (displayH + V) / 2 - 40;
  const clamp = (x: number, y: number) => ({
    x: Math.min(mX, Math.max(-mX, x)),
    y: Math.min(mY, Math.max(-mY, y)),
  });

  // open filled (cover), like WhatsApp
  useEffect(() => {
    if (work) {
      const z = Math.max(work.width, work.height) / Math.min(work.width, work.height);
      setZoom(Math.min(8, z));
      setPan({ x: 0, y: 0 });
    }
  }, [work]);

  const applyZoom = (z: number) => {
    const zz = Math.min(8, Math.max(1, z));
    setZoom(zz);
    const dW = W * fit * zz;
    const dH = H * fit * zz;
    const nx = (dW + V) / 2 - 40;
    const ny = (dH + V) / 2 - 40;
    setPan((p) => ({
      x: Math.min(nx, Math.max(-nx, p.x)),
      y: Math.min(ny, Math.max(-ny, p.y)),
    }));
  };

  /* ---------- drag (mouse) ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !drag.current) return;
    setPan(clamp(drag.current.px + (e.clientX - drag.current.x), drag.current.py + (e.clientY - drag.current.y)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") drag.current = null;
  };

  /* ---------- drag + pinch (touch) ---------- */
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = { dist: Math.hypot(dx, dy), zoom };
    } else if (e.touches.length === 1) {
      drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: pan.x, py: pan.y };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      applyZoom(pinch.current.zoom * (Math.hypot(dx, dy) / pinch.current.dist));
    } else if (e.touches.length === 1 && drag.current) {
      setPan(clamp(drag.current.px + (e.touches[0].clientX - drag.current.x), drag.current.py + (e.touches[0].clientY - drag.current.y)));
    }
  };
  const onTouchEnd = () => {
    drag.current = null;
    pinch.current = null;
  };

  /* ---------- crop exactly what the circle shows ---------- */
  const confirm = () => {
    if (!work) return;
    const k = OUT / V;
    const left = (V - displayW) / 2 + pan.x;
    const top = (V - displayH) / 2 + pan.y;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000"; // WhatsApp-style black fill for empty corners
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(work, left * k, top * k, displayW * k, displayH * k);
    canvas.toBlob(
      (blob) => onConfirm(new File([blob || new Blob()], "avatar.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      QUALITY
    );
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-sm grid gap-4 text-white">
        <p className="text-sm font-black text-center">Drag anywhere • pinch to zoom</p>

        {/* circular WhatsApp-style window */}
        <div className="relative mx-auto" style={{ width: V, height: V }}>
          <div
            className="absolute inset-0 rounded-full overflow-hidden bg-black touch-none select-none"
            style={{ cursor: "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            {work && (
              <img
                src={src}
                alt="crop"
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: displayW,
                  height: displayH,
                  left: (V - displayW) / 2 + pan.x,
                  top: (V - displayH) / 2 + pan.y,
                }}
              />
            )}
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-white/40 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs">🔍</span>
          <input
            type="range"
            min={1}
            max={8}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="flex-1 accent-violet-500"
          />
        </div>
        <p className="text-[10px] text-slate-500 text-center -mt-2">
          slide left = whole photo • slide right = close-up
        </p>

        <div className="flex gap-2">
          <button onClick={confirm} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-black">
            ✅ Use this
          </button>
          <button onClick={onCancel} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-black">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}