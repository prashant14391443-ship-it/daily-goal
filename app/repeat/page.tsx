"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Template = {
  id: string;
  title: string;
  repeat: string;
};

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RepeatTasksPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId) {
      router.push("/login");
      return;
    }

    // Fetch master templates (tasks where 'repeat' is set)
    const { data: rows } = await supabase
      .from("tasks")
      .select("id, title, repeat")
      .eq("user_id", userId)
      .not("repeat", "is", null)
      .order("created_at", { ascending: false });

    setTemplates(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    
    if (!userId || !title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const todayIso = toLocalISO(new Date());

      await supabase.from("tasks").insert({
        user_id: userId,
        title: title.trim(),
        category: "todo",
        repeat: frequency,
        task_date: todayIso, // Sets the starting point for your auto-copies
        completed: false,
      });
      setTitle("");
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    // Delete the master template
    await supabase.from("tasks").delete().eq("id", id);
    setTemplates(templates.filter((t) => t.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl">🔁</span>
          Repeat Tasks
        </h1>
        <p className="text-slate-400">Manage your daily and weekly auto-copies</p>
      </div>

      <form
        onSubmit={addTemplate}
        className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8 flex flex-col md:flex-row gap-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 10 pages"
          required
          className="flex-1 p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-4">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="p-3 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded bg-indigo-600 font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-slate-400">Loading routines...</p>
      ) : (
        <div className="grid gap-3 mb-8">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-bold">{t.title}</p>
                <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase tracking-wider font-semibold mt-1 inline-block">
                  {t.repeat}
                </span>
              </div>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="text-red-400 hover:text-red-300 text-sm px-3 py-1 bg-red-400/10 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
              <p className="text-slate-400">No repeating tasks set up yet.</p>
              <p className="text-sm text-slate-500 mt-1">Add a habit above to automate your to-do list!</p>
            </div>
          )}
        </div>
      )}

      <Link
        href="/todo"
        className="inline-block mt-4 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Back to ToDo
      </Link>
    </main>
  );
}