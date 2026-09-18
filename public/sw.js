// DAILY GOAL service worker — SIMPLE & FAST (final)
const CACHE_NAME = "daily-goal-v8";
const API_CACHE = "daily-goal-api-v1";

// Install = 3 tiny files only → 3 seconds, like before
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(["/", "/icon.svg", "/manifest.webmanifest"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate = delete old caches, take control
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

  // 1) Supabase data: online = fresh, offline = last saved answer
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

  // 2) Pages: online = fresh (and saved), offline = saved copy
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("/")))
    );
    return;
  }

  // 3) JS/CSS/images: saved copy first, else download and save
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

// Offline edits auto-sync when internet returns
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-changes") {
    event.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: "SYNC_OFFLINE" }))));
  }
});

// Notifications (your existing feature, untouched)
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