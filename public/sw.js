// DAILY GOAL service worker v5 — auto-precrawl core app for true offline
const CACHE_NAME = "daily-goal-v5";
const API_CACHE = "daily-goal-api-v1";
const PRECACHE = ["/", "/icon.svg", "/manifest.webmanifest"];

// Core app routes precrawled automatically on first online open
const CORE_ROUTES = [
  "/", "/dashboard", "/login", "/signup",
  "/todo", "/tasklog", "/myday", "/repeat",
  "/study", "/studylog", "/daily-goals",
  "/gym-log", "/workout", "/nutrition",
  "/routine-habits", "/habitslog", "/routines", "/freeze", "/quit",
  "/flashcards", "/streaks", "/habit-stats",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE).catch(() => {});

    // 🕷 AUTO-PRECRAWL: fetch each core page + every JS/CSS chunk it references
    await Promise.all(CORE_ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { credentials: "same-origin" });
        if (!res.ok) return;
        const clone = res.clone();
        const html = await clone.text();
        await cache.put(route, res);
        const chunkUrls = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
        await Promise.all(chunkUrls.map((u) =>
          fetch(u).then((r) => (r.ok ? cache.put(u, r) : null)).catch(() => {})
        ));
      } catch {}
    }));

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith("daily-goal-v5") && !k.startsWith("daily-goal-api")).map((k) => caches.delete(k)))
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

  // 📥 SUPABASE READS: network-first, replay cached when offline
  if (url.hostname.endsWith(".supabase.co")) {
    const authTail = (req.headers.get("authorization") || "").slice(-24);
    const cacheKey = url.href + "|auth:" + authTail;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then(async (c) => {
              await c.put(cacheKey, clone).catch(() => {});
              const keys = await c.keys();
              if (keys.length > 150) await c.delete(keys[0]);
            }).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(cacheKey).then((hit) => hit || Response.error()))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 📄 PAGE LOADS: network-first → cached page → cached home shell → branded offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (hit) => hit || caches.match("/").then((home) => home || new Response(offlineHTML(), { headers: { "Content-Type": "text/html" } }))
          )
        )
    );
    return;
  }

  // 🖼 STATIC/CHUNKS: cache-first, then network (and remember)
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {}); }
      return res;
    }))
  );
});

function offlineHTML() {
  return `<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#fff;font-family:sans-serif;text-align:center"><div><p style="font-size:44px;margin:0">📡</p><p style="font-size:18px;font-weight:800;margin:12px 0 4px">You're offline</p><p style="color:#94a3b8;font-size:13px;margin:0">Open Daily Goal once with internet to enable full offline mode.</p></div></body></html>`;
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-changes") {
    event.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: "SYNC_OFFLINE" }))));
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Daily Goal", { body: data.body || "New notification", icon: "/icon.svg", badge: "/icon.svg", data: data.url || "/" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) if (c.url.includes(target) && "focus" in c) return c.focus();
    if (clients.openWindow) return clients.openWindow(target);
  }));
});