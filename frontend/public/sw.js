const CACHE_NAME = "subserver-v1";
const STATIC_ASSETS = ["/", "/index.html"];
const API_PREFIX = "/api/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first untuk API
  if (url.pathname.startsWith(API_PREFIX)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => res)
        .catch(() => new Response(JSON.stringify({ error: "Offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }))
    );
    return;
  }

  // Cache-first untuk asset statis
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      });
    }).catch(() =>
      caches.match("/index.html").then((r) => r || new Response("Offline"))
    )
  );
});

// Background sync untuk pesan antrean (offline send)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  const cache = await caches.open("pending-messages");
  const keys = await cache.keys();
  for (const req of keys) {
    try {
      const body = await (await cache.match(req)).json();
      await fetch("/api/chat/grup/kirim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      await cache.delete(req);
    } catch {}
  }
}
