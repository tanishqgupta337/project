/* ==========================================================================
   service-worker.js — offline caching for Beacon Help Center
   Cache-first for local assets, network passthrough for CDN libraries.
   ========================================================================== */
const CACHE_NAME = "beacon-help-center-v2";
const PRECACHE_URLS = [
  "index.html",
  "login.html",
  "admin.html",
  "style.css",
  "admin.css",
  "script.js",
  "admin.js",
  "data.js",
  "faq.json",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only manage same-origin requests; let CDN/network requests pass through normally.
  if (url.origin !== location.origin) return;
  // Never cache API calls — FAQ/category data lives in MySQL and must
  // always be fetched fresh, not served from a stale offline cache.
  if (url.pathname.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
  );
});
