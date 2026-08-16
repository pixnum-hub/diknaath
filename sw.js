/* ═══════════════════════════════════════════════════════════
   DikNaath — Service Worker
   © Manik Roy
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'diknaath-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192x192-any.png',
  './icon-192x192-maskable.png',
  './icon-512x512-any.png',
  './icon-512x512-maskable.png',
  './apple-touch-icon.png',
  './icon-152x152.png',
  './icon-144x144.png'
];

// ── INSTALL: pre-cache the app shell ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .catch((err) => console.warn('[DikNaath SW] Pre-cache failed:', err))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ─────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for app shell, network-first for the rest ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept cross-origin requests (fonts, APIs, etc.) —
  // let the browser handle those normally so the app degrades gracefully.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Cache a copy of successfully fetched same-origin assets
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to the app shell if offline and page was requested
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
