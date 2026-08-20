"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function DraggableAIBubble() {
  const router = useRouter();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0, moved: false, active: false });

  // Load saved position
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("dg-ai-btn-pos") || "null");
      if (p && typeof p.x === "number" && typeof p.y === "number") setPos(p);
    } catch {}
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: rect.left,
      baseY: rect.top,
      moved: false,
      active: true,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.current.moved = true;
    if (drag.current.moved) {
      const x = Math.min(Math.max(8, drag.current.baseX + dx), window.innerWidth - 72);
      const y = Math.min(Math.max(8, drag.current.baseY + dy), window.innerHeight - 96);
      setPos({ x, y });
    }
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.moved) {
      // Save new position forever
      if (pos) localStorage.setItem("dg-ai-btn-pos", JSON.stringify(pos));
    } else {
      // Simple tap = open AI
      router.push("/ai");
    }
  };

  return (
    <button
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        touchAction: "none",
        ...(pos ? { left: pos.x, top: pos.y } : {}),
      }}
      className={`fixed z-[75] w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-xl shadow-violet-900/40 flex items-center justify-center text-3xl select-none hover:scale-105 transition-transform ${
        pos ? "" : "right-4 bottom-24"
      }`}
      title="Hold & drag to move • Tap to open AI"
    >
      🤖
    </button>
  );
}