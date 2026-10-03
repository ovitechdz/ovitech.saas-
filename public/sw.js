const CACHE_NAME = "ovitech-shell-v3";
const NAV_FALLBACK = "/";
const ASSET_RE = /\.(?:js|mjs|css|map|json|svg|png|jpe?g|gif|ico|woff2?|ttf|eot|webmanifest)(?:\?|$)/i;
const PRECACHE = [];
const APP_SHELL = [
  "/",
  "/__grok/manifest.webmanifest",
  "/favicon.svg",
  "/__grok/icon-180.png",
  "/__grok/icon-192.png",
  "/__grok/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting();
      const cache = await caches.open(CACHE_NAME);
      const urls = [...APP_SHELL, ...PRECACHE];
      await Promise.allSettled(
        urls.map((url) =>
          fetch(url).then(async (res) => {
            if (res.ok) await cache.put(url, res);
          }),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const hit = (await cache.match(request)) || (await cache.match(NAV_FALLBACK));
          return hit || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/__grok/")) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          fetch(request)
            .then(async (res) => {
              if (res.ok) {
                const c = await caches.open(CACHE_NAME);
                await c.put(request, res.clone());
              }
            })
            .catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
  }
});