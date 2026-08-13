"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordNotification } from "@/lib/notify";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    ctx.resume();
    const note = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.45);
    };
    note(880, 0);
    note(1175, 0.25);
  } catch {
    // audio not available
  }
}

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function compressAvatar(f: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        canvas.width = size;
        canvas.height = size;
        canvas
          .getContext("2d")
          ?.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        canvas.toBlob(
          (blob) =>
            resolve(new File([blob || new Blob()], "avatar.jpg", { type: "image/jpeg" })),
          "image/jpeg",
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(f);
  });
}

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [light, setLight] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email || "friend");
      const meta = (data.session?.user.user_metadata || {}) as {
        display_name?: string;
        avatar_url?: string;
      };
      setDisplayName(meta.display_name || "");
      setAvatarUrl(meta.avatar_url || "");
    };
    load();
    if (localStorage.getItem("dg-theme") === "light") {
      setLight(true);
      document.documentElement.classList.add("light");
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid || !("serviceWorker" in navigator)) return;

    const notified = new Set<string>();

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowHM = `${hh}:${mm}`;
      const todayStr = toLocalISO(now);

      const [s, g, h, t, hl] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id, subject, reminder_time")
          .eq("user_id", userId)
          .eq("session_date", todayStr),
        supabase
          .from("gym_logs")
          .select("id, workout_type, reminder_time")
          .eq("user_id", userId)
          .eq("session_date", todayStr),
        supabase
          .from("habits")
          .select("id, habit_name, reminder_time")
          .eq("user_id", userId),
        supabase
          .from("tasks")
          .select("id, title, reminder_time, completed")
          .eq("user_id", userId)
          .eq("category", "todo")
          .eq("task_date", todayStr),
        supabase
          .from("habit_logs")
          .select("habit_id")
          .eq("user_id", userId)
          .eq("log_date", todayStr)
          .eq("completed", true),
      ]);

      const items: { key: string; label: string; time: string }[] = [];
      (s.data || []).forEach((r) => {
        if (r.reminder_time)
          items.push({ key: `s${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.subject, time: r.reminder_time.slice(0, 5) });
      });
      (g.data || []).forEach((r) => {
        if (r.reminder_time)
          items.push({ key: `g${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.workout_type, time: r.reminder_time.slice(0, 5) });
      });
      const doneHabits = new Set((hl.data || []).map((x) => x.habit_id));
      (h.data || []).forEach((r) => {
        if (r.reminder_time && !doneHabits.has(r.id))
          items.push({ key: `h${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.habit_name, time: r.reminder_time.slice(0, 5) });
      });
      (t.data || []).forEach((r) => {
        if (r.reminder_time && !r.completed)
          items.push({ key: `t${r.id}-${r.reminder_time.slice(0, 5)}`, label: r.title, time: r.reminder_time.slice(0, 5) });
      });

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        items.forEach((it) => {
          if (it.time === nowHM && !notified.has(it.key)) {
            notified.add(it.key);
            playBeep();
            recordNotification("DAILY GOAL ⏰", `Time to: ${it.label}`);
            reg.showNotification("DAILY GOAL ⏰", { body: `Time to: ${it.label}` });
          }
        });
      } catch {
        // notifications not allowed yet
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  if (pathname === "/login" || pathname === "/signup") return null;

  const name = displayName || (email ? email.split("@")[0] : "friend");
  const initial = name.charAt(0).toUpperCase();

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("dg-theme", next ? "light" : "dark");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Images only!");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      alert("Max 8 MB!");
      return;
    }
    const small = await compressAvatar(f);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    let url = avatarUrl;
    if (photo && uid) {
      const path = `${uid}/avatar.jpg`;
      await supabase.storage.from("avatars").upload(path, photo, { upsert: true });
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      url = urlData.publicUrl + "?t=" + Date.now();
    }
    const finalName = editName.trim() || name;
    const { error } = await supabase.auth.updateUser({
      data: { display_name: finalName, avatar_url: url },
    });
    if (!error) {
      setDisplayName(finalName);
      setAvatarUrl(url);
      setEditing(false);
      setPhoto(null);
      setPreview("");
    } else {
      alert("Could not save: " + error.message);
    }
    setSaving(false);
  };

  return (
    <div className="absolute top-3 right-3 z-50" ref={boxRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center overflow-hidden"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="me" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-4 grid gap-3 shadow-xl">
          <div>
            <p className="font-bold text-white capitalize">{name}</p>
            <p className="text-xs text-slate-400 break-all">{email}</p>
          </div>

          {!editing ? (
            <button
              onClick={() => {
                setEditName(displayName || "");
                setEditing(true);
              }}
              className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <div className="bg-slate-800 rounded p-3 grid gap-2">
              <div className="flex items-center gap-2">
                <label className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 cursor-pointer flex items-center justify-center text-xl overflow-hidden shrink-0">
                  {preview ? (
                    <img src={preview} alt="preview" className="w-12 h-12 object-cover" />
                  ) : (
                    "📷"
                  )}
                  <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 p-2 rounded bg-slate-900 border border-slate-700 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-2 rounded bg-violet-600 hover:bg-violet-500 text-xs font-bold disabled:opacity-50"
                >
                  💾 Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-2 rounded bg-slate-700 text-xs"
                >
                  ✖
                </button>
              </div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex justify-between items-center text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            <span>Theme</span>
            <span>{light ? "☀️ Light" : "🌙 Dark"}</span>
          </button>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            🎯 Settings / Goals
          </Link>
          <Link
            href="/badges"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            🏆 Badges
          </Link>
          <Link
            href="/report"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 p-2 rounded text-white"
          >
            📊 Weekly Report
          </Link>
          {email === "prahant14391443@gmail.com" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="text-sm bg-amber-600 hover:bg-amber-500 p-2 rounded text-white font-bold"
            >
              👑 Admin Panel
            </Link>
          )}
          <button
            onClick={logout}
            className="text-sm bg-red-600 hover:bg-red-500 p-2 rounded font-semibold text-white"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}