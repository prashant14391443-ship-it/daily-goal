export type MoodLog = { date: string; mood: number; t: number };
export type JournalEntry = { id: string; text: string; t: number };

export const MOOD_EMOJIS = ["😞", "😐", "🙂", "😄"];

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO() { return localISO(new Date()); }

export function getMoodLogs(uid: string): MoodLog[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("dg-mood-" + uid) || "[]"); } catch { return []; }
}
export function getTodayMood(uid: string): number | null {
  const t = todayISO();
  const log = getMoodLogs(uid).find((l) => l.date === t);
  return log ? log.mood : null;
}
export function logMood(uid: string, mood: number) {
  const logs = getMoodLogs(uid).filter((l) => l.date !== todayISO());
  logs.push({ date: todayISO(), mood, t: Date.now() });
  try { localStorage.setItem("dg-mood-" + uid, JSON.stringify(logs.slice(-60))); } catch {}
}

export function getJournals(uid: string): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("dg-journal-" + uid) || "[]"); } catch { return []; }
}
export function addJournal(uid: string, text: string) {
  const list = getJournals(uid);
  list.unshift({ id: String(Date.now()), text, t: Date.now() });
  try { localStorage.setItem("dg-journal-" + uid, JSON.stringify(list.slice(0, 50))); } catch {}
}
export function deleteJournal(uid: string, id: string) {
  try { localStorage.setItem("dg-journal-" + uid, JSON.stringify(getJournals(uid).filter((j) => j.id !== id))); } catch {}
}