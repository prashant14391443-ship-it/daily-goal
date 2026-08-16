"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BANNED = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "nigga", "nigger", "cunt", "whore", "bastard"];
const bad = (t: string) => BANNED.some((w) => t.toLowerCase().includes(w));

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

export default function NewPostPage() {
  const [me, setMe] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (uid) setMe(uid);
    };
    load();
  }, []);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      alert("Images only!");
      return;
    }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
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
      const small = await compressImage(photo);
      const path = `${me}/${Date.now()}.jpg`;
      await supabase.storage.from("posts").upload(path, small);
      url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
    }
    await supabase.from("posts").insert({ user_id: me, content: text.trim(), image_url: url || null });
    const { data: frs } = await supabase.from("friends").select("friend_id").eq("user_id", me);
    const { data: sess } = await supabase.auth.getSession();
    const myName = ((sess?.session?.user?.user_metadata as any)?.display_name as string) || "A friend";
    const notifs = (frs || []).map((f) => ({
      user_id: f.friend_id,
      actor_id: me,
      type: "post",
      text: `📸 ${myName} shared a new post`,
    }));
    if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write something... ✍️"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm resize-none"
        />
        {preview ? (
          <div className="relative">
            <img src={preview} className="rounded-xl w-full max-h-96 object-cover" alt="" />
            <button
              onClick={() => {
                setPhoto(null);
                setPreview("");
              }}
              className="absolute top-2 right-2 bg-red-600 rounded-full w-8 h-8 text-sm font-bold"
            >
              ✖
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