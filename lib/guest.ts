import { supabase } from "@/lib/supabase";

const GUEST_TABLES = [
  "study_sessions", "gym_logs", "habit_logs", "habits", "tasks", "countdowns",
  "flashcards", "learning_progress", "learning_enrollments", "daily_study_log",
  "move_posts", "posts", "post_likes", "nutrition_logs", "summaries",
  "personal_bests", "user_coins", "coin_log", "friend_requests", "friends",
];

export async function isGuest(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session?.user?.is_anonymous;
}

export async function guestLogin(): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { error: error.message };
  return {};
}

export async function deleteGuestData(uid: string) {
  for (const t of GUEST_TABLES) {
    try { await supabase.from(t).delete().eq("user_id", uid); } catch {}
  }
}

/** Wipe everything + sign out (used by "Leave guest" and auto-expiry). */
export async function leaveGuest() {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (u?.is_anonymous) await deleteGuestData(u.id);
  await supabase.auth.signOut();
}

/** Auto-delete guest accounts older than maxDays. Call once on app load. */
export async function cleanupOldGuest(maxDays = 3) {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u?.is_anonymous) return;
  const age = Date.now() - new Date(u.created_at).getTime();
  if (age > maxDays * 86400000) {
    await deleteGuestData(u.id);
    await supabase.auth.signOut();
  }
}