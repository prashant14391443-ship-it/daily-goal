// DAILY GOAL service worker v16 — whole app saved during signup, offline forever
const CACHE_NAME = "daily-goal-v16";
const API_CACHE = "daily-goal-api-v1";
const SENTINEL = "/__all_pages_saved_v16";

// ⚡ Saved FIRST (parallel, within seconds)
const CRITICAL_PAGES = [
  "/dashboard", "/english", "/speaking", "/vocab", "/games",
  "/english-tips", "/sentences", "/tips",
  "/study", "/study-tracker", "/gym-log", "/routine-habits", "/todo",
];

//  The full app (saved in background while user signs up)
const ALL_PAGES = [
  "/", "/dashboard", "/login", "/signup",
  "/todo", "/tasklog", "/myday", "/repeat", "/breakdown",
  "/study", "/studylog", "/daily-goals", "/study-tracker", "/focus", "/mind",
  "/gym-log", "/workout", "/nutrition", "/calculator", "/running", "/progress", "/move",
  "/routine-habits", "/habitslog", "/routines", "/freeze", "/quit", "/habit-stats", "/streaks", "/weekly",
  "/flashcards",
  "/talk", "/english", "/english-tips", "/speaking", "/vocab", "/sentences", "/games",
  "/leaderboard", "/feed", "/friends", "/profile", "/pricing", "/install", "/search",
  "/ai", "/quiz", "/summarize", "/calorie", "/blueprint", "/exam", "/test",
];

async function precrawlRoute(route, cache) {
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
}

// Critical first (parallel), then ALL pages in big fast batches, then mark done
async function saveAllPages() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(CRITICAL_PAGES.map((r) => precrawlRoute(r, cache)));
  for (let i = 0; i < ALL_PAGES.length; i += 12) {
    const batch = ALL_PAGES.slice(i, i + 12);
    await Promise.all(batch.map((r) => precrawlRoute(r, cache)));
  }
  await cache.put(SENTINEL, new Response("1"));
}

// INSTALL (0 seconds): app shell + dashboard saved instantly
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      Promise.allSettled(
        ["/", "/dashboard", "/icon.svg", "/manifest.webmanifest"].map((u) =>
          fetch(u, { credentials: "same-origin" }).then((r) => (r.ok ? c.put(u, r) : null))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ACTIVATE: start the FULL 48-page save IMMEDIATELY (this runs while user signs up).
// Old caches are deleted ONLY when the new cache is 100% complete → never a wipe-fail.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim()
      .then(() => saveAllPages().catch(() => {}))
      .then(async () => {
        if (!navigator.onLine) return;
        const done = await caches.match(SENTINEL);
        if (!done) return;
        const keys = await caches.keys();
        await Promise.all(keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k)));
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_API_CACHE") caches.delete(API_CACHE);
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) Supabase data: online = fresh (saved for offline), offline = replay saved
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

  // 🚫 NEVER cache our own API routes — always ask the server
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ error: "offline" }), {
        status: 503, headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // 2) Pages: INSTANT from any cache generation, refresh in background,
  //    and keep retrying the full save until sentinel exists
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        let hit = await caches.match(req);
        if (!hit) hit = await caches.match(req, { ignoreSearch: true });
        if (!hit) hit = await caches.match(url.pathname);
        const network = fetch(req).then((res) => {
          if (res.ok) { const clone = res.clone(); cache.put(req, clone).catch(() => {}); }
          return res;
        }).catch(() => null);
        event.waitUntil((async () => {
          const done = await caches.match(SENTINEL);
          if (done) return;
          await saveAllPages().catch(() => {});
        })());
        if (hit) return hit; // ⚡ instant, forever
        const res = await network;
        if (res) return res;
        const isCore = CRITICAL_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
        if (!isCore) {
          const fallback = await caches.match("/dashboard") || await caches.match("/");
          if (fallback) return fallback;
        }
        return new Response(offlineHTML(), { headers: { "Content-Type": "text/html" } });
      })()
    );
    return;
  }

  // 3) JS/CSS/images: device copy first, else download + save (exact match only)
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

function offlineHTML() {
  return `<!doctype html><html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#fff;font-family:sans-serif;text-align:center;padding:24px"><div><img src="/icon.svg" width="96" height="96" alt="" /><p style="font-size:14px;color:#94a3b8;margin:16px auto 0;max-width:280px">This page isn't saved on this phone yet.<br/>Open it once with internet — after that it works offline.</p><a href="/dashboard" style="display:inline-block;margin-top:16px;padding:10px 18px;border-radius:12px;background:#10b981;color:#022c22;font-weight:700;font-size:13px;text-decoration:none">Go to Home</a></div></body></html>`;
}

// Offline edits auto-sync when internet returns
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-changes") {
    event.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: "SYNC_OFFLINE" }))));
  }
});

// Push notifications
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