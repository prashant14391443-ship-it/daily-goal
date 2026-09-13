export type GoalKey = "job" | "exam" | "fit" | "habits" | "english";

export function readGoal(uid: string): GoalKey | null {
  if (typeof window === "undefined") return null;
  try { return (localStorage.getItem("dg-goal-" + uid) as GoalKey) || null; } catch { return null; }
}
export function writeGoal(uid: string, g: GoalKey) {
  try { localStorage.setItem("dg-goal-" + uid, g); } catch {}
}