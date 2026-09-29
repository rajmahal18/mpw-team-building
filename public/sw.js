const CACHE_VERSION = "mpw-tb-pwa-v8";
const SHELL_CACHE = `${CACHE_VERSION}:shell`;
const STATIC_ASSETS = ["/offline", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

function isStatic(request, url) { return request.destination === "style" || request.destination === "script" || request.destination === "font" || request.destination === "image" || url.pathname.startsWith("/_next/static/"); }

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (isStatic(request, url)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) { const clone = response.clone(); caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone)); } return response; })));
    return;
  }

  if (request.mode === "navigate" && url.pathname.startsWith("/e/")) {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
  }
});
