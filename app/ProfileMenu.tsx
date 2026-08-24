"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";
import { recordNotification } from "@/lib/notify";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import FeedbackModal from "@/app/components/FeedbackModal";

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

type Counts = { s: number; g: number; h: number; m: number; t: number };
const BADGES: { id: string; label: string; ok: (c: Counts) => boolean }[] = [
  { id: "s1", label: "📚 Study Starter — first session", ok: (c) => c.s >= 1 },
  { id: "s2", label: "📚 Study Climber — 10 sessions", ok: (c) => c.s >= 10 },
  { id: "s3", label: "📚 Study Master — 50 sessions", ok: (c) => c.s >= 50 },
  { id: "g1", label: "💪 Gym Starter — first workout", ok: (c) => c.g >= 1 },
  { id: "g2", label: "💪 Gym Climber — 10 workouts", ok: (c) => c.g >= 10 },
  { id: "g3", label: "💪 Gym Master — 25 workouts", ok: (c) => c.g >= 25 },
  { id: "h1", label: "✅ Habit Starter — first habit", ok: (c) => c.h >= 1 },
  { id: "h2", label: "✅ Habit Climber — 25 habits", ok: (c) => c.h >= 25 },
  { id: "h3", label: "✅ Habit Master — 50 habits", ok: (c) => c.h >= 50 },
  { id: "t1", label: "🎯 Task Starter — first task", ok: (c) => c.t >= 1 },
  { id: "t2", label: "🎯 Task Climber — 10 tasks", ok: (c) => c.t >= 10 },
  { id: "t3", label: "🎯 Task Master — 20 tasks", ok: (c) => c.t >= 20 },
];

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
  const [badgePop, setBadgePop] = useState("");
  const [coinFly, setCoinFly] = useState("");
  const [light, setLight] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
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
    const beat = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      await supabase
        .from("online_users")
        .upsert({ user_id: uid, last_seen: new Date().toISOString() });
    };
    beat();
    const id = setInterval(beat, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  const checkBadgesNow = async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const [cStudy, cWork, cHab, cMeal, cTodo] = await Promise.all([
      supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
      supabase.from("gym_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
      supabase.from("habit_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
      supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("category", "todo").eq("completed", true),
    ]);
    for (const b of BADGES) {
      if (!b.ok({ s: cStudy.count || 0, g: cWork.count || 0, h: cHab.count || 0, m: cMeal.count || 0, t: cTodo.count || 0 })) continue;
      const key = `dg-badge-${userId}-${b.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        await supabase.from("earned_badges").upsert({ user_id: userId, badge_id: b.id });
        playBeep();
        setBadgePop(b.label);
      }
    }
  };

  const checkStreaksNow = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const [s, g, m, h, t] = await Promise.all([
      supabase.from("study_sessions").select("session_date").eq("user_id", uid).eq("completed", true),
      supabase.from("gym_logs").select("session_date").eq("user_id", uid).eq("completed", true).is("activity_type", null),
      supabase.from("gym_logs").select("session_date").eq("user_id", uid).eq("completed", true).not("activity_type", "is", null),
      supabase.from("habit_logs").select("log_date").eq("user_id", uid).eq("completed", true),
      supabase.from("tasks").select("task_date").eq("user_id", uid).eq("category", "todo").eq("completed", true),
    ]);
    const rows = [
      ...(s.data || []).map((r) => ({ user_id: uid, category: "study", day: r.session_date })),
      ...(g.data || []).map((r) => ({ user_id: uid, category: "workout", day: r.session_date })),
      ...(m.data || []).map((r) => ({ user_id: uid, category: "move", day: r.session_date })),
      ...(h.data || []).map((r) => ({ user_id: uid, category: "habits", day: r.log_date })),
      ...(t.data || []).map((r) => ({ user_id: uid, category: "todo", day: r.task_date })),
    ];
    if (rows.length > 0) {
      await supabase
        .from("streak_ledger")
        .upsert(rows, { onConflict: "user_id,category,day" });
    }
  };

  const checkCoinsNow = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const today = toLocalISO(new Date());
    
    const [s, g, h, t, n] = await Promise.all([
      supabase.from("study_sessions").select("id").eq("user_id", uid).eq("session_date", today).eq("completed", true),
      supabase.from("gym_logs").select("id, distance_km").eq("user_id", uid).eq("session_date", today).eq("completed", true),
      supabase.from("habit_logs").select("id").eq("user_id", uid).eq("log_date", today).eq("completed", true),
      supabase.from("tasks").select("id").eq("user_id", uid).eq("task_date", today).eq("category", "todo").eq("completed", true),
      supabase.from("nutrition_logs").select("id").eq("user_id", uid).eq("log_date", today),
    ]);
    
    const actions = [
      ...(s.data || []).map((r) => ({ key: `s-${r.id}`, coins: 10 })),
      ...(g.data || [])
        .map((r) => ({ key: `g-${r.id}`, coins: Math.floor(r.distance_km || 0) * 10}))
        .filter((a) => a.coins > 0),
      ...(h.data || []).map((r) => ({ key: `h-${r.id}`, coins: 5 })),
      ...(t.data || []).map((r) => ({ key: `t-${r.id}`, coins: 5 })),
      ...(n.data || []).map((r) => ({ key: `n-${r.id}`, coins: 3 })),
      { key: `d-${today}`, coins: 20 },
    ];
    
    const { data: logged } = await supabase
      .from("coin_log")
      .select("action_key")
      .eq("user_id", uid);
      
    const doneKeys = new Set((logged || []).map((r) => r.action_key));
    let earned = 0;
    
    for (const a of actions) {
      if (doneKeys.has(a.key)) continue;
      const { error } = await supabase
        .from("coin_log")
        .insert({ user_id: uid, action_key: a.key, coins: a.coins });
      if (!error) earned += a.coins;
    }
    
    if (earned > 0) {
      const { data: cur } = await supabase
        .from("user_coins")
        .select("coins")
        .eq("user_id", uid)
        .maybeSingle();

      const total = (cur?.coins || 0) + earned;

      await supabase.from("user_coins").upsert({ user_id: uid, coins: total });
      
      playBeep();
      setCoinFly(`+${earned} 🪙`);
      setTimeout(() => setCoinFly(""), 2500);

      window.dispatchEvent(new CustomEvent("dg-coins", { detail: { total, earned } }));
    }
  };

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const trigger = () => {
      setTimeout(checkBadgesNow, 1500);
      setTimeout(checkCoinsNow, 2000);
      setTimeout(checkStreaksNow, 2200);
    };
    setTimeout(checkCoinsNow, 2500);
    setTimeout(checkStreaksNow, 2700);
    const chan = supabase
      .channel("badge-watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_sessions" }, trigger)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gym_logs" }, trigger)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "habit_logs" }, trigger)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, trigger)
      .subscribe();
    return () => {
      supabase.removeChannel(chan);
    };
  }, [pathname]);

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

      const [s, g, h, t, hl, cStudy, cWork, cHab, cMeal, cTodo] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id, subject, reminder_time, completed")
          .eq("user_id", userId)
          .eq("session_date", todayStr),
        supabase
          .from("gym_logs")
          .select("id, workout_type, reminder_time, completed")
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
        supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("gym_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("habit_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
        supabase.from("nutrition_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("category", "todo").eq("completed", true),
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

        // STREAK RESCUE
        const doneAnything =
          (s.data || []).filter((r) => r.completed).length +
          (g.data || []).filter((r) => r.completed).length +
          (hl.data?.length || 0) > 0;
        const hour = now.getHours();
        const rescueKey = `dg-rescue-${todayStr}`;
        if (hour >= 19 && hour <= 21 && !doneAnything && !localStorage.getItem(rescueKey)) {
          localStorage.setItem(rescueKey, "1");
          playBeep();
          recordNotification("🔥 STREAK RESCUE", "Nothing done today yet — one small habit now saves your streak!");
          reg.showNotification("🔥 STREAK RESCUE", { body: "One small habit now saves your streak!" });
        }

        // INSTANT BADGES
        for (const b of BADGES) {
          if (
            !b.ok({
              s: cStudy.count || 0,
              g: cWork.count || 0,
              h: cHab.count || 0,
              m: cMeal.count || 0,
              t: cTodo.count || 0,
            })
          )
            continue;
          const key = `dg-badge-${userId}-${b.id}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, "1");
            await supabase
              .from("earned_badges")
              .upsert({ user_id: userId, badge_id: b.id });
            playBeep();
            setBadgePop(b.label);
          }
        }

        // SUNDAY AI WEEKLY REPORT
        if (now.getDay() === 0) {
          const weekKey = `dg-weekrep-${todayStr}`;
          if (!localStorage.getItem(weekKey)) {
            const fromStr = toLocalISO(new Date(Date.now() - 6 * 86400000));
            const [ws, wg, wh, wt, wn] = await Promise.all([
              supabase.from("study_sessions").select("duration_minutes").eq("user_id", userId).gte("session_date", fromStr),
              supabase.from("gym_logs").select("id").eq("user_id", userId).gte("session_date", fromStr),
              supabase.from("habit_logs").select("id").eq("user_id", userId).gte("log_date", fromStr).eq("completed", true),
              supabase.from("tasks").select("id").eq("user_id", userId).gte("task_date", fromStr).eq("category", "todo").eq("completed", true),
              supabase.from("nutrition_logs").select("id").eq("user_id", userId).gte("log_date", fromStr),
            ]);
            const mins = (ws.data || []).reduce((a: number, r: { duration_minutes: number }) => a + r.duration_minutes, 0);
            const ctx = `This week: studied ${mins} min, ${(wg.data || []).length} workouts, ${(wh.data || []).length} habits done, ${(wt.data || []).length} tasks done, ${(wn.data || []).length} meals logged. Write a 3-line weekly report: 1 line praise, 1 line weakest area, 1 line next week tip. Use emojis.`;
            const ar = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: "Write my weekly report.", context: ctx, mode: "coach" }),
            });
            const ad = await ar.json();
            if (ad.reply) {
              localStorage.setItem(weekKey, "1");
              recordNotification("📊 YOUR WEEKLY REPORT", ad.reply.slice(0, 250));
              reg.showNotification("📊 YOUR WEEKLY REPORT", { body: ad.reply.slice(0, 200) });
            }
          }
        }
      } catch {
        // notifications not allowed yet
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  if (["/login", "/signup", "/activity", "/inbox", "/profile", "/feed", "/search", "/leaderboard", "/english", "/ai", "/move", "/speaking", "/vocab", "/sentences", "/tips", "/games"].includes(pathname)) return null;

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
    <div ref={boxRef} style={{ position: "absolute", top: 16, right: 16, zIndex: 60 }}>
      
      {/* Badge Earned Modal */}
      {badgePop && typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
              <p className="text-7xl mb-4 animate-bounce">🏆</p>
              <p className="text-2xl font-black text-amber-400 mb-2">BADGE EARNED!</p>
              <p className="text-white font-bold mb-6 text-lg">{badgePop}</p>
              <button
                onClick={() => setBadgePop("")}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black transition-colors"
              >
                🎉 YAY!
              </button>
            </div>
          </div>,
          document.body
        )}
      
      {/* Tiny popup animation for coins */}
      {coinFly && (
        <div className="fixed -left-24 top-2 z-[60] font-black text-amber-400 animate-bounce pointer-events-none drop-shadow-md text-lg whitespace-nowrap">
          {coinFly}
        </div>
      )}

      {/* Floating Profile Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center overflow-hidden relative shadow-lg hover:shadow-xl hover:scale-105 transition-all ring-2 ring-transparent hover:ring-blue-400"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="me" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg md:text-xl">{initial}</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="fixed top-14 right-0 w-72 md:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-5 grid gap-3 shadow-2xl origin-top-right animate-in fade-in zoom-in-95 duration-200 text-white max-h-[80vh] overflow-y-auto">
          
          <div className="pb-3 border-b border-slate-800">
            <p className="font-bold text-lg capitalize truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>

          {!editing ? (
            <button
              onClick={() => {
                setEditName(displayName || "");
                setEditing(true);
              }}
              className="text-sm bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl font-medium transition-colors text-left flex items-center gap-2"
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <div className="bg-slate-800 rounded-xl p-4 grid gap-3 border border-slate-700">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center text-xl overflow-hidden shrink-0 border border-slate-500">
                    {preview ? (
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      "📷"
                    )}
                    <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                  </label>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1 font-medium">Display Name</p>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your name"
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-bold disabled:opacity-50"
                >
                  {saving ? "..." : "💾 Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex justify-between items-center text-sm bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-xl font-medium"
          >
            <span>Theme</span>
            <span className="bg-slate-900 px-3 py-1 rounded-lg text-xs font-bold">{light ? "☀️ Light" : "🌙 Dark"}</span>
          </button>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-xl font-medium flex items-center gap-2"
          >
            🎯 Settings & Goals
          </Link>
          <Link
            href="/badges"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-xl font-medium flex items-center gap-2"
          >
            🏆 Earned Badges
          </Link>

          <Link
            href="/feed"
            onClick={() => setOpen(false)}
            className="text-sm bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 transition-all p-3 rounded-xl font-bold flex items-center gap-2 shadow-md"
          >
            📰 Friend Feed
          </Link>
          <Link
            href="/ai"
            onClick={() => setOpen(false)}
            className="text-sm bg-violet-600 hover:bg-violet-500 transition-colors p-3 rounded-xl font-bold flex items-center gap-2 shadow-md"
          >
            🤖 Personal AI Coach
          </Link>
          <Link
            href="/report"
            onClick={() => setOpen(false)}
            className="text-sm bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-xl font-medium flex items-center gap-2"
          >
            📊 Weekly Report
          </Link>
          <button
            onClick={() => { setOpen(false); setFbOpen(true); }}
            className="text-sm bg-slate-800 hover:bg-slate-700 transition-colors p-3 rounded-xl font-medium flex items-center gap-2 w-full text-left"
          >
            💬 Send Feedback
          </button>
          {email.toLowerCase() === "prashant14391443@gmail.com" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="text-sm bg-amber-600 hover:bg-amber-500 transition-colors p-3 rounded-xl font-bold flex justify-center mt-2 shadow-md"
            >
              👑 Admin Panel
            </Link>
          )}
          <div className="border-t border-slate-800 pt-3 mt-1">
            
            <button
              onClick={logout}
              className="w-full text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors p-2.5 rounded-xl font-bold"
            >
              Logout
            </button>
            
          </div>
        </div>
      )}

      <FeedbackModal open={fbOpen} onClose={() => setFbOpen(false)} />
    </div>
  ); 
}