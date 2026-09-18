// DAILY GOAL service worker v10 — FINAL: aggressive precrawl, silent offline
const CACHE_NAME = "daily-goal-v10";
const API_CACHE = "daily-goal-api-v1";
const SENTINEL = "/__all_pages_saved_v10";

const ALL_PAGES = [
  "/", "/dashboard", "/login", "/signup",
  "/todo", "/tasklog", "/myday", "/repeat", "/breakdown",
  "/study", "/studylog", "/daily-goals", "/study-tracker", "/focus", "/mind",
  "/gym-log", "/workout", "/nutrition", "/calculator", "/running", "/progress", "/move",
  "/routine-habits", "/habitslog", "/routines", "/freeze", "/quit", "/habit-stats", "/streaks", "/weekly",
  "/flashcards",
  "/talk", "/english", "/english-tips", "/speaking",
  "/leaderboard", "/feed", "/friends", "/profile", "/pricing", "/install", "/search",
  "/ai", "/quiz", "/summarize", "/calorie", "/blueprint", "/exam", "/test",
];

async function saveAllPages() {
  const cache = await caches.open(CACHE_NAME);
  for (let i = 0; i < ALL_PAGES.length; i += 8) {
    const batch = ALL_PAGES.slice(i, i + 8);
    await Promise.all(batch.map(async (route) => {
      try {
        const existing = await cache.match(route);
        if (existing) return;
        const res = await fetch(route, { credentials: "same-origin" });
        if (!res.ok) return;
        const html = await res.clone().text();
        await cache.put(route, res);
        const chunks = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(chunks.map((u) =>
          cache.match(u).then((h) => (h ? null : fetch(u).then((r) => (r.ok ? cache.put(u, r) : null)))).catch(() => {})
        ));
      } catch {}
    }));
  }
  await cache.put(SENTINEL, new Response("1"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(["/", "/icon.svg", "/manifest.webmanifest"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_API_CACHE") caches.delete(API_CACHE);
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname.endsWith(".supabase.co")) {
    const authTail = (req.headers.get("authorization") || "").slice(-24);
    const key = url.href + "|auth:" + authTail;
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(API_CACHE).then((c) => c.put(key, clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(key).then((hit) => hit || Response.error()))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        // Run precrawl every page load if sentinel missing (catches failed batches)
        event.waitUntil((async () => {
          const done = await caches.match(SENTINEL);
          if (done) return;
          await saveAllPages();
        })());
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
      }
      return res;
    }))
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-changes") {
    event.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: "SYNC_OFFLINE" }))));
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Daily Goal", {
    body: data.body || "New notification", icon: "/icon.svg", badge: "/icon.svg", data: data.url || "/",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) if (c.url.includes(target) && "focus" in c) return c.focus();
    if (clients.openWindow) return clients.openWindow(target);
  }));
});