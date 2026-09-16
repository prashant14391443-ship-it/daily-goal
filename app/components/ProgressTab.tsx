"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PhoneCall, Star } from "lucide-react";

type DayBar = { label: string; sec: number; today: boolean };

export default function ProgressTab({ me }: { me: string }) {
  const [calls30, setCalls30] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [thisWeek, setThisWeek] = useState(0);
  const [lastWeek, setLastWeek] = useState(0);
  const [bars, setBars] = useState<DayBar[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!me) return;
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const d14 = new Date(Date.now() - 14 * 86400000).toISOString();

      const [{ count }, rates, { data: recent }] = await Promise.all([
        supabase
          .from("call_logs")
          .select("*", { count: "exact", head: true })
          .or(`user_a.eq.${me},user_b.eq.${me}`)
          .not("ended_at", "is", null)
          .gte("started_at", d30),
        supabase.from("call_ratings").select("rating").eq("target_id", me),
        supabase
          .from("call_logs")
          .select("started_at,duration_sec,user_a,user_b")
          .or(`user_a.eq.${me},user_b.eq.${me}`)
          .not("ended_at", "is", null)
          .gte("started_at", d14),
      ]);
      setCalls30(count || 0);
      const rr = (rates.data as any[]) || [];
      setRating(rr.length ? rr.reduce((a, r) => a + r.rating, 0) / rr.length : null);

      // week boundaries (Monday start)
      const now = new Date();
      const dow = (now.getDay() + 6) % 7;
      const thisStart = new Date(now);
      thisStart.setDate(now.getDate() - dow);
      thisStart.setHours(0, 0, 0, 0);
      const lastStart = new Date(thisStart);
      lastStart.setDate(thisStart.getDate() - 7);

      const rows = (recent as any[]) || [];
      let tw = 0,
        lw = 0;
      const perDay: number[] = [0, 0, 0, 0, 0, 0, 0];
      rows.forEach((r) => {
        const d = new Date(r.started_at);
        if (d >= thisStart) tw++;
        else if (d >= lastStart) lw++;
        const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
        if (diff >= 0 && diff < 7) perDay[6 - diff] += r.duration_sec || 0;
      });
      setThisWeek(tw);
      setLastWeek(lw);

      const labels: DayBar[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push({
          label: d.toLocaleDateString([], { weekday: "short" }).toUpperCase(),
          sec: perDay[6 - i],
          today: i === 0,
        });
      }
      setBars(labels);
    };
    load();
  }, [me]);

  const max = Math.max(60, ...bars.map((b) => b.sec));

  return (
    <div className="grid gap-4">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <p className="text-sm font-bold mb-3">Your Weekly Call Activity</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <PhoneCall size={22} className="text-rose-400 shrink-0" />
            <div>
              <p className="text-xl font-black">{calls30}</p>
              <p className="text-[9px] text-slate-400 font-bold">Practice Calls (30 days)</p>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <Star size={22} className="text-amber-400 fill-amber-400 shrink-0" />
            <div>
              <p className="text-xl font-black">{rating === null ? "–" : rating.toFixed(1)}</p>
              <p className="text-[9px] text-slate-400 font-bold">Call Rating</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-3">
          <span>Last week: <b className="text-amber-400">{lastWeek} calls</b></span>
          <span>This week: <b className="text-violet-400">{thisWeek} calls</b></span>
        </div>

        {/* BAR CHART */}
        <div className="flex items-end gap-2 h-28 mb-1">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                title={`${Math.round(b.sec / 60)} min`}
                className={`w-full rounded-t-lg transition-all ${b.today ? "bg-gradient-to-t from-violet-600 to-rose-500" : "bg-slate-700"}`}
                style={{ height: `${Math.max(4, (b.sec / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {bars.map((b, i) => (
            <span key={i} className={`flex-1 text-center text-[8px] font-black ${b.today ? "text-violet-400" : "text-slate-600"}`}>
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-center">
        <p className="text-xs text-slate-300 font-semibold leading-relaxed">
          Consistency matters: each call you do this week adds to your growth 🌱
        </p>
      </div>
    </div>
  );
}