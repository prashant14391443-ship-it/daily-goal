"use client";

import { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

function compressImage(f: File, fileName: string = "image.jpg"): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let w = img.width, h = img.height;
        if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => resolve(new File([b || new Blob()], fileName, { type: "image/jpeg" })), "image/jpeg", 0.8);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

export default function NewPostPage() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(0);
  const [bgc, setBgc] = useState("");
  const [tc, setTc] = useState("#ffffff");
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.id) setMe(data.session.user.id);
    };
    load();
  }, []);

  // 🎯 AUTO-FIT: long text = smaller font, never overflows
  const fitSize = Math.max(14, Math.min(30, Math.round(560 / Math.max(text.length || 1, 1))));

  const moveText = (clientX: number, clientY: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(95, Math.max(5, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(95, Math.max(5, ((clientY - r.top) / r.height) * 100));
    setPos({ x, y });
  };

  const handlePost = async () => {
    if (!text.trim() && !photo) return;
    setPosting(true);
    let url = "";
    if (photo) {
      const small = await compressImage(photo, "post.jpg");
      const path = `${me}/post-${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("posts").insert({
      user_id: me, content: text.trim(), image_url: url || null,
      bg, tc, bgc, tx: Math.round(pos.x), ty: Math.round(pos.y),
    });
    router.push("/feed");
  };

  const dragProps = {
    onPointerDown: (e: React.PointerEvent) => { dragging.current = true; moveText(e.clientX, e.clientY); },
    onPointerMove: (e: React.PointerEvent) => { if (dragging.current) moveText(e.clientX, e.clientY); },
    onPointerUp: () => (dragging.current = false),
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 pt-6 pb-10 flex justify-center">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <Link href="/feed" className="press w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">←</Link>
          <p className="font-black text-base text-white">📸 New Post</p>
          <div className="w-10" />
        </div>

        {/* ️ PREVIEW */}
        {preview ? (
          <div>
            <div
              ref={boxRef}
              {...dragProps}
              className="relative rounded-3xl overflow-hidden touch-none select-none cursor-move border-2 border-slate-800 bg-black aspect-square w-full flex items-center justify-center shadow-xl"
            >
              <img src={preview} className="w-full h-full object-contain" alt="preview" />
              {text.trim() && (
                <p
                  className="absolute font-black text-center px-4 py-2 rounded-xl pointer-events-none text-lg shadow-lg break-words max-w-[90%]"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", color: tc, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                >
                  {text}
                </p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold text-center mt-2">👆 Drag on photo to place your text</p>
            <button
              onClick={() => { setPhoto(null); setPreview(""); }}
              className="press mt-2 w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-black"
            >
              ✖ Remove photo
            </button>
          </div>
        ) : (
          <div
            ref={boxRef}
            {...dragProps}
            className={`relative rounded-3xl overflow-hidden touch-none select-none cursor-move aspect-square w-full border-2 border-slate-800 shadow-xl ${bgc ? "" : `bg-gradient-to-br ${BGS[bg]}`}`}
            style={bgc ? { background: bgc } : undefined}
          >
            <p
              className="absolute font-black text-center whitespace-pre-wrap break-words px-6 pointer-events-none w-full"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", color: tc, fontSize: fitSize }}
            >
              {text || "Type below..."}
            </p>
          </div>
        )}
        {!preview && <p className="text-[10px] text-slate-500 font-bold text-center mt-2">👆 Drag to move your text</p>}

        {/* ✍️ TEXT + COLORS */}
        <div className="relative mt-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={220}
            placeholder="Write something... ✍️"
            className="w-full bg-transparent rounded-2xl p-4 pb-12 text-sm resize-none focus:outline-none"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-600">{text.length}/220</span>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 cursor-pointer">
              BG
              <input type="color" value={bgc || "#1e293b"} onChange={(e) => setBgc(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent" />
            </label>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 cursor-pointer">
              Text
              <input type="color" value={tc} onChange={(e) => setTc(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent" />
            </label>
          </div>
        </div>

        {/* 🎨 GRADIENTS (hidden scrollbar) */}
        <div className="flex gap-2 overflow-x-auto py-3 mt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BGS.map((g, i) => (
            <button
              key={i}
              onClick={() => { setBg(i); setBgc(""); }}
              className={`press w-11 h-11 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 transition-all ${
                bg === i && !bgc ? "border-white scale-110 shadow-lg shadow-white/10" : "border-transparent opacity-80"
              }`}
            />
          ))}
        </div>

        {/* 🚀 ACTIONS */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <label className="press px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-lg cursor-pointer flex items-center justify-center">
            📷
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)); setPos({ x: 50, y: 50 }); }
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={handlePost}
            disabled={posting || (!text.trim() && !photo)}
            className={`press flex-1 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              posting || (!text.trim() && !photo)
                ? "bg-slate-900 border border-slate-800 text-slate-600"
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30"
            }`}
          >
            {posting ? "⏳ Posting..." : "🚀 Post"}
          </button>
        </div>
      </div>
    </main>
  );
}