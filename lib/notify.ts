export function recordNotification(title: string, body: string) {
  try {
    const key = "dg-notifications";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const now = Date.now();

    // If same message already recorded in last 60 seconds → skip
    const dup = list.some(
      (n: { title: string; body: string; time: string }) =>
        n.title === title &&
        n.body === body &&
        now - new Date(n.time).getTime() < 60000
    );
    if (dup) return;

    list.unshift({
      id: now + Math.random(),
      title,
      body,
      time: new Date().toISOString(),
      read: false,
    });
    const cutoff = now - 2 * 24 * 60 * 60 * 1000;
    const kept = list
      .filter((n: { time: string }) => new Date(n.time).getTime() > cutoff)
      .slice(0, 50);
    localStorage.setItem(key, JSON.stringify(kept));
    window.dispatchEvent(new Event("dg-notif-change"));
  } catch {
    // ignore
  }
}