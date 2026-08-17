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
          (b) => resolve(new File([b || new Blob()], fileName, { type: "image/jpeg" })),
          "image/jpeg",
          0.8
        );
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
      user_id: me,
      content: text.trim(),
      image_url: url || null,
      bg,
      tc,
      bgc,
      tx: Math.round(pos.x),
      ty: Math.round(pos.y),
    });

    router.push("/feed");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      {/* Centered, compact card layout mirroring the "New Story" modal */}
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-5 grid gap-4 shadow-2xl border border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-1">
          <Link href="/feed" className="text-slate-400 hover:text-white text-xl px-2 py-1 -ml-2 rounded-lg transition-colors">
            ←
          </Link>
          <p className="font-bold text-lg flex items-center gap-2">
            📸 New post
          </p>
          <div className="w-8"></div> {/* Spacer to perfectly center the title */}
        </div>

        {/* Preview Area - Constrained height so controls always fit on screen */}
        {preview ? (
          <div className="relative group">
            <div
              ref={boxRef}
              className="relative rounded-xl overflow-hidden touch-none select-none cursor-move border border-slate-700 bg-black aspect-square max-h-[45vh] w-full flex items-center justify-center"
              onPointerDown={(e) => {
                dragging.current = true;
                moveText(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (dragging.current) moveText(e.clientX, e.clientY);
              }}
              onPointerUp={() => (dragging.current = false)}
            >
              <img src={preview} className="w-full h-full object-contain" alt="preview" />
              {text.trim() && (
                <p
                  className="absolute font-bold text-center px-4 py-2 rounded-lg pointer-events-none text-xl shadow-lg"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    color: tc,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {text}
                </p>
              )}
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              👆 Drag on photo to place your text
            </p>
            <button
              onClick={() => {
                setPhoto(null);
                setPreview("");
              }}
              className="mt-2 w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-bold transition-colors"
            >
              ✖ Remove photo
            </button>
          </div>
        ) : (
          <div
            ref={boxRef}
            className={`relative rounded-xl overflow-hidden touch-none select-none cursor-move aspect-square max-h-[45vh] w-full shadow-inner border border-slate-800 ${
              bgc ? "" : `bg-gradient-to-br ${BGS[bg]}`
            }`}
            style={bgc ? { background: bgc } : undefined}
            onPointerDown={(e) => {
              dragging.current = true;
              moveText(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (dragging.current) moveText(e.clientX, e.clientY);
            }}
            onPointerUp={() => (dragging.current = false)}
          >
            <p
              className="absolute font-bold text-center text-3xl whitespace-pre-wrap px-6 pointer-events-none w-full"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                color: tc,
              }}
            >
              {text || "Type below..."}
            </p>
          </div>
        )}

        {/* Text Input & Colors */}
        <div className="relative mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write something... ✍️"
            style={{ color: tc }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pb-12 text-[15px] resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200">
              BG
              <input
                type="color"
                value={bgc || "#1e293b"}
                onChange={(e) => setBgc(e.target.value)}
                className="w-7 h-7 rounded-md cursor-pointer p-0 border border-slate-600 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200">
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

        {/* Gradient Selectors */}
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
          {BGS.map((g, i) => (
            <button
              key={i}
              onClick={() => {
                setBg(i);
                setBgc("");
              }}
              className={`w-10 h-10 shrink-0 rounded-full bg-gradient-to-br ${g} border-2 transition-transform ${
                bg === i && !bgc ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-800">
          <label className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-lg font-bold cursor-pointer flex items-center justify-center">
            📷
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPhoto(f);
                  setPreview(URL.createObjectURL(f));
                  setPos({ x: 50, y: 50 });
                }
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={handlePost}
            disabled={posting || (!text.trim() && !photo)}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 transition-colors font-bold text-[15px] flex items-center justify-center gap-2"
          >
            {posting ? "Posting..." : "🚀 Post"}
          </button>
        </div>
      </div>
    </main>
  );
}