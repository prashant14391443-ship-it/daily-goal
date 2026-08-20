"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const CATS = ["🐛 Bug", "💡 Idea", "😍 Love it", "😕 Confusing"];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(CATS[1]);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!msg.trim()) return;
    setSaving(true);
    const { data } = await supabase.auth.getSession();
    await supabase.from("feedback").insert({
      user_id: data.session?.user.id || null,
      user_email: data.session?.user.email || "guest",
      category: cat,
      message: msg.trim(),
    });
    setSaving(false);
    setSent(true);
    setMsg("");
    setTimeout(() => {
      setSent(false);
      setOpen(false);
    }, 1500);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="fixed bottom-20 left-4 z-[70] w-12 h-12 rounded-full bg-slate-800 border border-slate-700 text-xl shadow-lg hover:bg-slate-700 transition-colors"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-end md:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm grid gap-3">
            <p className="font-bold text-white">💬 Help us improve!</p>
            <div className="flex gap-2 flex-wrap">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    cat === c
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="What problem did you face? What should we build next?"
              className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-violet-500"
            />
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 font-bold text-white disabled:opacity-50"
              >
                {saving ? "..." : "🚀 Send"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                ✖
              </button>
            </div>
            {sent && (
              <p className="text-green-400 text-sm text-center font-bold">✅ Thank you! You're shaping the app!</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}