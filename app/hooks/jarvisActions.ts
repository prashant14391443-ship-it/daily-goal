"use client";

import { supabase } from "@/lib/supabase";
import { getTrackById } from "@/lib/learningTracks";

export type ActionType =
  | "log_study"
  | "log_workout"
  | "log_habit"
  | "log_calories"
  | "add_task"
  | "complete_task"
  | "add_countdown"
  | "enroll_track"
  | "complete_milestone"
  | "log_mock_test"
  | "log_english"
  | "log_run"
  | "chat";

export interface ParsedAction {
  action: ActionType;
  data: Record<string, any>;
  reply: string;
}

// Local track type
interface LearningTrack {
  id: string;
  name: string;
  milestones: { id: string; title: string }[];
}

// Get all tracks (with fallback if learningTracks doesn't export getAllTracks)
async function getAllTracksList(): Promise<LearningTrack[]> {
  try {
    const { data } = await supabase
      .from("learning_tracks")
      .select("id, name")
      .order("id");
    
    if (!data) return [];
    
    return data.map((track: any) => ({
      id: track.id,
      name: track.name,
      milestones: [], // Will be loaded when needed
    }));
  } catch {
    // Fallback: return common tracks
    return [
      { id: "web-dev", name: "Web Development", milestones: [] },
      { id: "python-data", name: "Python for Data Science", milestones: [] },
      { id: "cyber-sec", name: "Cybersecurity", milestones: [] },
      { id: "dsa-java", name: "DSA in Java", milestones: [] },
      { id: "app-dev", name: "App Development", milestones: [] },
      { id: "devops-cloud", name: "DevOps & Cloud", milestones: [] },
      { id: "game-dev", name: "Game Development", milestones: [] },
    ];
  }
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function findTrackByKeyword(keyword: string): Promise<LearningTrack | null> {
  const k = keyword.toLowerCase().trim();
  const all = await getAllTracksList();
  return all.find((track: LearningTrack) =>
    track.name.toLowerCase().includes(k) ||
    track.id.toLowerCase().includes(k)
  ) || null;
}

export async function executeVoiceAction(
  message: string,
  userId: string
): Promise<ParsedAction> {
  const lowerMsg = message.toLowerCase();
  const today = toLocalISO(new Date());

  // 📚 STUDY LOG
  const studyMatch = lowerMsg.match(/(?:studied|study|read|reading)\s+(?:for\s+)?(\d+)\s*(?:min|minute)/);
  if (studyMatch) {
    const minutes = parseInt(studyMatch[1], 10);
    try {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: userId, session_date: today, duration_minutes: minutes,
        completed: true, created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return { action: "log_study", data: { minutes }, reply: `✅ Logged ${minutes} minutes of study. Great focus!` };
    } catch (err) {
      return { action: "log_study", data: { minutes }, reply: `I tried to log ${minutes} minutes of study, but hit a snag. Try again?` };
    }
  }

  // 🏋️ WORKOUT LOG (generic)
  const workoutMatch = lowerMsg.match(/(?:did|completed|finished|worked out)\s+(.+?)(?:\s+for\s+(\d+)\s*min)?$/);
  if (workoutMatch && /workout|exercise|gym|pushup/.test(lowerMsg) && !/run|walk|ride|hike/.test(lowerMsg)) {
    const exercise = workoutMatch[1].replace(/for\s+\d+\s*min$/, "").trim();
    const duration = workoutMatch[2] ? parseInt(workoutMatch[2], 10) : 30;
    try {
      const { error } = await supabase.from("gym_logs").insert({
        user_id: userId, session_date: today, workout_type: exercise, duration_minutes: duration,
        completed: true, created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return { action: "log_workout", data: { exercise, duration }, reply: `💪 Logged your ${exercise} workout for ${duration} minutes!` };
    } catch {
      return { action: "log_workout", data: { exercise, duration }, reply: `I tried to log your workout but something went wrong.` };
    }
  }

  // 🏃 RUN / WALK LOG
  const runMatch = lowerMsg.match(/(?:ran|run|walked|walk)\s+(?:for\s+)?([\d.]+)\s*(?:km|kilometers?)(?:\s+(?:in|for)\s+(\d+)\s*(?:min|minutes?))?/);
  if (runMatch) {
    const km = parseFloat(runMatch[1]);
    const mins = runMatch[2] ? parseInt(runMatch[2], 10) : Math.round(km * 8);
    const mode = /walk/.test(lowerMsg) ? "walk" : "run";
    try {
      const { error } = await supabase.from("gym_logs").insert({
        user_id: userId, session_date: today, workout_type: `${mode} ${km.toFixed(2)} km`,
        duration_minutes: mins, activity_type: mode, distance_km: km, completed: true,
        calories: Math.round((9.8 * 3.5 * 65 / 200) * mins),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return { action: "log_run", data: { km, mins, mode }, reply: `🏃 Logged a ${km.toFixed(1)}km ${mode} in ${mins} minutes!` };
    } catch {
      return { action: "log_run", data: { km, mins, mode }, reply: `I tried to log your ${mode} but hit a snag.` };
    }
  }

  // ✅ HABIT COMPLETION
  const habitMatch = lowerMsg.match(/(?:completed|did|finished|done with)\s+(?:my\s+)?(?:habit\s+)?(.+?)(?:\s+today)?$/);
  if (habitMatch && /habit|completed|finished|done with/.test(lowerMsg)) {
    const habitName = habitMatch[1].trim();
    try {
      const { data: habit } = await supabase.from("habits").select("id").eq("user_id", userId)
        .ilike("habit_name", `%${habitName}%`).maybeSingle();
      if (!habit) return { action: "log_habit", data: { habitName }, reply: `I couldn't find a habit called "${habitName}".` };
      const { error } = await supabase.from("habit_logs").insert({
        user_id: userId, habit_id: habit.id, log_date: today, completed: true,
      });
      if (error) throw error;
      return { action: "log_habit", data: { habitName }, reply: `✅ Marked "${habitName}" as done!` };
    } catch {
      return { action: "log_habit", data: { habitName }, reply: `I tried to complete your habit but hit an issue.` };
    }
  }

  // 🍽️ CALORIE LOG
  const calorieMatch = lowerMsg.match(/(?:ate|consumed|had|logged|logged food for)\s+(?:about\s+)?(\d+)\s*(?:cal|calories)/);
  if (calorieMatch) {
    const calories = parseInt(calorieMatch[1], 10);
    try {
      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: userId, log_date: today, calories,
      });
      if (error) throw error;
      return { action: "log_calories", data: { calories }, reply: `🍽️ Logged ${calories} calories. Keep tracking!` };
    } catch {
      return { action: "log_calories", data: { calories }, reply: `I tried to log ${calories} calories but something went wrong.` };
    }
  }

  // 📝 ADD TASK
  const taskMatch = lowerMsg.match(/(?:add|create|remind me to)\s+(?:a\s+)?(?:task\s+)?(?:to\s+)?(.+)$/);
  if (taskMatch && /add|create|remind/.test(lowerMsg)) {
    const taskTitle = taskMatch[1].trim();
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: userId, task_date: today, title: taskTitle, category: "todo", completed: false,
      });
      if (error) throw error;
      return { action: "add_task", data: { title: taskTitle }, reply: `📝 Added "${taskTitle}" to your todo list.` };
    } catch {
      return { action: "add_task", data: { title: taskTitle }, reply: `I tried to add that task but hit a snag.` };
    }
  }

  // ✅ COMPLETE TASK
  const completeTaskMatch = lowerMsg.match(/(?:mark|complete|finish|done with|did|finished)\s+(?:my\s+)?(?:task\s+)?(?:called\s+)?(.+?)(?:\s+as\s+done)?$/);
  if (completeTaskMatch && /mark|complete|finish|done|did/.test(lowerMsg) && /task/.test(lowerMsg)) {
    const kw = completeTaskMatch[1].replace(/as\s+done|today$/g, "").trim();
    try {
      const { data: t } = await supabase.from("tasks").select("id, title")
        .eq("user_id", userId).eq("completed", false).ilike("title", `%${kw}%`).order("created_at", { ascending: false }).limit(1);
      if (!t || t.length === 0) return { action: "complete_task", data: {}, reply: `No open task matching "${kw}".` };
      await supabase.from("tasks").update({ completed: true }).eq("id", t[0].id);
      return { action: "complete_task", data: { title: t[0].title }, reply: `✅ Marked "${t[0].title}" as done!` };
    } catch {
      return { action: "complete_task", data: {}, reply: `I tried to mark that task done but hit an issue.` };
    }
  }

  // ⏳ COUNTDOWN
  const cdMatch = lowerMsg.match(/(?:add|create|set)\s+(?:a\s+)?(?:countdown|reminder)\s+(?:for\s+)?(.+?)\s+on\s+(\w+\s+\d{1,2})/);
  if (cdMatch) {
    const title = cdMatch[1].trim();
    const dateStr = cdMatch[2].trim();
    const parsed = new Date(`${dateStr}, ${new Date().getFullYear()}`);
    if (isNaN(parsed.getTime())) return { action: "add_countdown", data: {}, reply: `I couldn't understand the date "${dateStr}". Try "october 15".` };
    const target = toLocalISO(parsed);
    try {
      const { error } = await supabase.from("countdowns").insert({
        user_id: userId, title, target_date: target, emoji: "🎯",
      });
      if (error) throw error;
      return { action: "add_countdown", data: { title, target }, reply: `⏳ Countdown set: "${title}" on ${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.` };
    } catch {
      return { action: "add_countdown", data: {}, reply: `I tried to add that countdown but hit a snag.` };
    }
  }

  // 🎓 ENROLL IN TRACK
  const enrollMatch = lowerMsg.match(/(?:enroll|join|start|take up)\s+(?:in|me in)?\s*(?:the\s+)?(?:.*?\s+)?(?:track|course)?\s*([\w\s]+?)(?:\s+track)?$/);
  if (enrollMatch && /enroll|join|start|take up|dsa|react|app|web|python/.test(lowerMsg)) {
    const keyword = enrollMatch[1].trim().replace(/\btrack\b|\bcourse\b/g, "").trim();
    const tr = await findTrackByKeyword(keyword);
    if (!tr) {
      const all = await getAllTracksList();
      const trackNames = all.map((track: LearningTrack) => track.name).join(", ");
      return { action: "enroll_track", data: {}, reply: `No track matched "${keyword}". Available: ${trackNames}.` };
    }
    try {
      const { data: existing } = await supabase.from("learning_enrollments")
        .select("id").eq("user_id", userId).eq("track_id", tr.id).maybeSingle();
      if (existing) return { action: "enroll_track", data: { track: tr.name }, reply: `You're already enrolled in ${tr.name}!` };
      const { error } = await supabase.from("learning_enrollments").insert({
        user_id: userId, track_id: tr.id, status: "active",
      });
      if (error) throw error;
      return { action: "enroll_track", data: { track: tr.name }, reply: `🎓 Enrolled you in ${tr.name}!` };
    } catch {
      return { action: "enroll_track", data: {}, reply: `I tried to enroll you but hit a snag.` };
    }
  }

  // 🏁 COMPLETE MILESTONE
  const mileMatch = lowerMsg.match(/(?:complete|finish|done with)\s+(?:milestone\s+)?(.+)$/);
  if (mileMatch && /milestone|lesson|module/.test(lowerMsg)) {
    const keyword = mileMatch[1].trim();
    try {
      const { data: en } = await supabase.from("learning_enrollments")
        .select("track_id").eq("user_id", userId).eq("status", "active").maybeSingle();
      if (!en) return { action: "complete_milestone", data: {}, reply: `You're not enrolled in any track yet. Enroll first!` };
      const tr = getTrackById(en.track_id);
      if (!tr) return { action: "complete_milestone", data: {}, reply: `Couldn't find your track.` };
      const m = tr.milestones.find((x: any) => x.title.toLowerCase().includes(keyword) || x.id.includes(keyword));
      if (!m) return { action: "complete_milestone", data: {}, reply: `No milestone matching "${keyword}" in ${tr.name}.` };
      await supabase.from("learning_progress").upsert({
        user_id: userId, track_id: tr.id, milestone_id: m.id, status: "completed",
      }, { onConflict: "user_id,track_id,milestone_id" });
      return { action: "complete_milestone", data: { milestone: m.title, track: tr.name }, reply: `🏁 Completed "${m.title}" in ${tr.name}!` };
    } catch {
      return { action: "complete_milestone", data: {}, reply: `I tried to mark that milestone done but hit an issue.` };
    }
  }

  // 📊 MOCK TEST SCORE
  const mockMatch = lowerMsg.match(/(?:mock|pyq|test|exam)\s*(?:test)?\s*(?:score|of|was|is)?\s*(\d+)\s*%?/);
  if (mockMatch && /mock|pyq|test|exam/.test(lowerMsg)) {
    const score = parseInt(mockMatch[1], 10);
    const type = /pyq/.test(lowerMsg) ? "pyq" : "mock";
    try {
      const { error } = await supabase.from("mock_tests").insert({
        user_id: userId, test_date: today, score_percent: score, test_type: type,
      });
      if (error) throw error;
      return { action: "log_mock_test", data: { score, type }, reply: `📊 Logged your ${type} test: ${score}%. ${score >= 80 ? "Crushing it!" : score >= 60 ? "Solid — keep pushing!" : "Let's review and retry!"}` };
    } catch {
      return { action: "log_mock_test", data: { score, type }, reply: `Noted: ${score}% on your ${type} test! (I couldn't save it permanently yet — mock test table may need setup.)` };
    }
  }

  // 🗣️ ENGLISH PRACTICE LOG
  const enMatch = lowerMsg.match(/(?:practiced|practise|logged|did|studied)\s+(?:english|speaking|pronunciation)(?:\s+for\s+(\d+)\s*(?:min|minutes?))?/);
  if (enMatch) {
    const mins = enMatch[1] ? parseInt(enMatch[1], 10) : 15;
    try {
      const { error } = await supabase.from("english_logs").insert({
        user_id: userId, session_date: today, duration_minutes: mins,
      });
      if (error) throw error;
      return { action: "log_english", data: { mins }, reply: `🗣️ Logged ${mins} minutes of English practice. Keep going!` };
    } catch {
      return { action: "log_english", data: { mins }, reply: `Logged your English practice mentally! (English table may need setup — I'll remember.)` };
    }
  }

  return { action: "chat", data: {}, reply: "" };
}

export function isLikelyCommand(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    /studied\s+\d+\s*min/,
    /did\s+(pushups|workout|exercise|gym)/,
    /completed\s+(my\s+)?habit/,
    /ate\s+\d+\s*cal/,
    /add\s+(a\s+)?task/,
    /remind me to/,
    /log\s+(my\s+)?(workout|study|calories|english)/,
    /mark\s+.+\s+(as\s+)?done/,
    /complete\s+(my\s+)?(task|milestone|lesson)/,
    /add\s+(a\s+)?countdown/,
    /enroll\s+(me\s+)?in/,
    /join\s+(the\s+)?(track|course)/,
    /start\s+(the\s+)?(react|dsa|app|web|python|webdev|appdev|track)/,
    /ran\s+[\d.]+\s*km/,
    /walked\s+[\d.]+\s*km/,
    /mock\s*(test)?\s*\d+/,
    /pyq\s*\d+/,
    /practiced\s+english/,
  ];
  return patterns.some((p) => p.test(lower));
}