export type SrsItem = {
  id: string;
  type: "topic" | "card";
  front: string;
  back?: string;
  interval: number;
  due: string;
  created: number;
  reviews: number;
};

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO() { return localISO(new Date()); }
function addDaysISO(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return localISO(d); }

export function loadSrs(uid: string): SrsItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("dg-srs-" + uid) || "[]"); } catch { return []; }
}
export function saveSrs(uid: string, items: SrsItem[]) {
  try { localStorage.setItem("dg-srs-" + uid, JSON.stringify(items)); } catch {}
}

export function addTopic(uid: string, topic: string) {
  const t = topic.trim();
  if (!t) return;
  const items = loadSrs(uid);
  if (items.some((i) => i.type === "topic" && i.front.toLowerCase() === t.toLowerCase())) return;
  items.push({ id: Date.now() + "-" + Math.random().toString(16).slice(2), type: "topic", front: t, interval: 0, due: addDaysISO(1), created: Date.now(), reviews: 0 });
  saveSrs(uid, items);
}

export function addCard(uid: string, front: string, back?: string) {
  const f = front.trim();
  if (!f) return;
  const items = loadSrs(uid);
  if (items.some((i) => i.type === "card" && i.front.toLowerCase() === f.toLowerCase())) return;
  items.push({ id: Date.now() + "-" + Math.random().toString(16).slice(2), type: "card", front: f, back, interval: 0, due: addDaysISO(1), created: Date.now(), reviews: 0 });
  saveSrs(uid, items);
}

export function getDue(uid: string): SrsItem[] {
  const t = todayISO();
  return loadSrs(uid).filter((i) => i.due <= t);
}
export function countDue(uid: string): number { return getDue(uid).length; }

export function reviewItem(uid: string, id: string, good: boolean) {
  const items = loadSrs(uid);
  const it = items.find((i) => i.id === id);
  if (!it) return;
  if (good) {
    it.interval = it.interval === 0 ? 3 : Math.min(365, Math.round(it.interval * 2.2));
    it.due = addDaysISO(it.interval);
  } else {
    it.interval = 1;
    it.due = addDaysISO(1);
  }
  it.reviews += 1;
  saveSrs(uid, items);
}
export function deleteItem(uid: string, id: string) {
  saveSrs(uid, loadSrs(uid).filter((i) => i.id !== id));
}