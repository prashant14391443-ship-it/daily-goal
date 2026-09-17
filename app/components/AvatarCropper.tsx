"use client";

import { useEffect, useRef, useState } from "react";

const MAX_WORK = 1600;   // auto-shrink huge photos to this (memory saver)
const OUT = 256;        // final avatar size (always compressed to this)
const QUALITY = 0.85;   // jpeg compression, same spirit as old compressAvatar

export default function AvatarCropper({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (f: File) => void;
  onCancel: () => void;
}) {
  const V = 280; // square viewport size
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [work, setWork] = useState<HTMLCanvasElement | HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // load + AUTO-COMPRESS big images before editing
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
        setWork(c); // shrunk version = smooth dragging on phones
      } else {
        setWork(im);
      }
    };
    im.src = src;
  }, [src]);

  const W = work?.width || V;
  const H = work?.height || V;
  const base = Math.max(V / W, V / H); // cover scale
  const displayW = W * base * zoom;
  const displayH = H * base * zoom;
  const maxPanX = Math.max(0, (displayW - V) / 2);
  const maxPanY = Math.max(0, (displayH - V) / 2);

  const clamp = (x: number, y: number, mX: number, mY: number) => ({
    x: Math.min(mX, Math.max(-mX, x)),
    y: Math.min(mY, Math.max(-mY, y)),
  });

  const applyZoom = (z: number) => {
    setZoom(z);
    const b = Math.max(V / W, V / H);
    const mX = Math.max(0, (W * b * z - V) / 2);
    const mY = Math.max(0, (H * b * z - V) / 2);
    setPan((p) => clamp(p.x, p.y, mX, mY));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = drag.current.px + (e.clientX - drag.current.x);
    const ny = drag.current.py + (e.clientY - drag.current.y);
    setPan(clamp(nx, ny, maxPanX, maxPanY));
  };
  const onPointerUp = () => { drag.current = null; };

  // crop + COMPRESS to final 256px jpeg
  const confirm = () => {
    if (!work) return;
    const scale = base * zoom;
    const left = (V - displayW) / 2 + pan.x;
    const top = (V - displayH) / 2 + pan.y;
    const sx = -left / scale;
    const sy = -top / scale;
    const sw = V / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    canvas.getContext("2d")?.drawImage(work, sx, sy, sw, sw, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => onConfirm(new File([blob || new Blob()], "avatar.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      QUALITY
    );
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-sm grid gap-4 text-white">
        <p className="text-sm font-black text-center">Move & zoom your photo</p>

        <div
          className="relative mx-auto rounded-2xl overflow-hidden touch-none select-none bg-slate-800"
          style={{ width: V, height: V, cursor: "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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
          <div className="absolute inset-4 pointer-events-none border-4 border-white/30 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs">🔍</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            className="flex-1 accent-violet-500"
          />
        </div>
        <p className="text-[10px] text-slate-500 text-center -mt-2">drag photo to move • slider to zoom</p>

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