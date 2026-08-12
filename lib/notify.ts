export function recordNotification(title: string, body: string) {
  try {
    const key = "dg-notifications";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift({
      id: Date.now() + Math.random(),
      title,
      body,
      time: new Date().toISOString(),
      read: false,
    });
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000; // ← 2 days (change 2 to 7 for a week)
    const kept = list
      .filter((n: { time: string }) => new Date(n.time).getTime() > cutoff)
      .slice(0, 50);
    localStorage.setItem(key, JSON.stringify(kept));
    window.dispatchEvent(new Event("dg-notif-change"));
  } catch {
    // ignore
  }
}