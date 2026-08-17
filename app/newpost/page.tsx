"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BANNED = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigga", "nigger", "cunt", "whore", "bastard"];
const bad = (t: string) => BANNED.some((w) => t.toLowerCase().includes(w));

const BGS = [
  "from-violet-600/40 via-slate-900 to-fuchsia-600/30",
  "from-blue-600/40 via-slate-900 to-cyan-500/30",
  "from-green-600/40 via-slate-900 to-emerald-500/30",
  "from-orange-600/40 via-slate-900 to-amber-500/30",
  "from-pink-600/40 via-slate-900 to-rose-500/30",
  "from-red-600/40 via-slate-900 to-orange-500/30",
  "from-teal-600/40 via-slate-900 to-green-500/30",
  "from-indigo-600/40 via-slate-900 to-blue-500/30",
  "from-fuchsia-600/40 via-slate-900 to-pink-500/30",
  "from-slate-700/60 via-slate-900 to-slate-600/40",
];

function compressImage(f: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (b) => resolve(new File([b || new Blob()], "post.jpg", { type: "image/jpeg" })),
          "image/jpeg",
          0.72
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

function burnText(
  file: File,
  text: string,
  pos: { x: number; y: number },
  color: string
): Promise<File> {
  return new Promise((resolve) => {
    if (!text.trim()) return resolve(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0);
      const size = Math.max(16, Math.round(img.width / 20));
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxW = img.width * 0.9;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) {
          lines.push(cur);
          cur = w;
        } else cur = t;
      }
      if (cur) lines.push(cur);
      const cx = (pos.x / 100) * img.width;
      const cy = (pos.y / 100) * img.height;
      const boxH = lines.length * size * 1.4 + size * 0.6;
      const boxW = Math.min(
        maxW,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + size
      );
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      const x0 = cx - boxW / 2;
      const y0 = cy - boxH / 2;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(x0, y0, boxW, boxH, size * 0.5);
      } else {
        ctx.rect(x0, y0, boxW, boxH);
      }
      ctx.fill();
      ctx.fillStyle = color;
      lines.forEach((ln, i) => {
        ctx.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * size * 1.4);
      });
      canvas.toBlob(
        (b) => resolve(new File([b || new Blob()], "post.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.72
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function NewPostPage() {
  const [me, setMe] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState(0);
  const [bgc, setBgc] = useState("");
  const [tc, setTc] = useState("#ffffff");
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) setMe(uid);
    };
    load();
  }, []);

  const moveText = (clientX: number, clientY: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(95, Math.max(5, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - r.top) / r.height) * 100));
    setPos({ x, y });
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      alert("Images only!");
      return;
    }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setPos({ x: 50, y: 50 });
  };

  const publish = async () => {
    if (!text.trim() && !photo) return;
    if (bad(text)) {
      alert("🚫 Keep it clean — banned word detected!");
      return;
    }
    setBusy(true);
    let url = "";
    if (photo) {
      let small = await compressImage(photo);
      small = await burnText(small, text, pos, tc);
      const path = `${me}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, small);
      if (upErr) {
        alert("Upload failed: " + upErr.message);
        setBusy(false);
        return;
      }
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    const { error: postErr } = await supabase.from("posts").insert({
      user_id: me,
      content: text.trim(),
      image_url: url || null,
      bg,
      tc,
      bgc,
    });
    if (postErr) {
      alert("Post failed: " + postErr.message);
      setBusy(false);
      return;
    }
    router.push("/feed");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col pb-24">
      <div className="flex items-center justify-between p-4 pr-28 border-b border-slate-800">
        <Link href="/feed" className="text-xl">←</Link>
        <p className="font-bold">📸 New post</p>
        <button
          onClick={publish}
          disabled={busy}
          className="px-5 py-1.5 rounded-full bg-violet-600 font-bold text-sm disabled:opacity-50"
        >
          {busy ? "..." : "Post"}
        </button>
      </div>

      <div className="p-4 grid gap-3">
        <div
          className={`rounded-xl p-4 min-h-[120px] flex items-center justify-center ${
            bgc ? "" : `bg-gradient-to-br ${BGS[bg]}`
          }`}
          style={bgc ? { background: bgc } : undefined}
        >
          <p className="text-center text-lg font-bold whitespace-pre-wrap" style={{ color: tc }}>
            {text || "Your text preview..."}
          </p>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Write something... ✍️"
            style={{ color: tc }}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pb-10 text-sm resize-none"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-3">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              BG
              <input
                type="color"
                value={bgc || "#1e293b"}
                onChange={(e) => setBgc(e.target.value)}
                className="w-7 h-7 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              Text
              <input
                type="color"
                value={tc}
                onChange={(e) => setTc(e.target.value)}
                className="w-7 h-7 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
              />
            </label>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {BGS.map((g, i) => (
            <button
              key={i}
              onClick={() => {
                setBg(i);
                setBgc("");
              }}
              className={`w-9 h-9 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 ${
                bg === i && !bgc ? "border-white" : "border-transparent"
              }`}
            />
          ))}
        </div>

        {preview ? (
          <div>
            <div
              ref={boxRef}
              className="relative rounded-xl overflow-hidden touch-none select-none cursor-move"
              onPointerDown={(e) => {
                dragging.current = true;
                moveText(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (dragging.current) moveText(e.clientX, e.clientY);
              }}
              onPointerUp={() => (dragging.current = false)}
            >
              <img src={preview} className="w-full max-h-96 object-cover" alt="" />
              {text.trim() && (
                <p
                  className="absolute font-bold text-center px-3 py-1 rounded-lg pointer-events-none"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: tc,
                    background: "rgba(0,0,0,0.45)",
                  }}
                >
                  {text}
                </p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              ✋ Drag on photo to place your text
            </p>
            <button
              onClick={() => {
                setPhoto(null);
                setPreview("");
              }}
              className="mt-2 w-full py-2 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold"
            >
              ✖ Remove photo
            </button>
          </div>
        ) : (
          <label className="py-5 rounded-xl bg-slate-900 border border-dashed border-slate-700 text-center text-sm font-bold cursor-pointer">
            📷 Add photo (optional)
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        )}

        <button
          onClick={publish}
          disabled={busy}
          className="py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold disabled:opacity-50"
        >
          🚀 Post
        </button>
      </div>
    </main>
  );
}