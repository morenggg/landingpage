/**
 * MopedPlaner – Service Worker
 * Scope: /mopedplaner/ (beeinflusst die restliche Website nicht).
 * Strategie: Precache der App-Shell, danach stale-while-revalidate –
 * die App funktioniert damit komplett offline in der Garage.
 */

const CACHE = 'mopedplaner-v3';

const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/ui.js',
  './js/knowledge.js',
  './js/data/models.js',
  './js/data/components.js',
  './js/data/diagnostics.js',
  './js/data/conversions.js',
  './js/data/fasteners.js',
  './js/data/engines.js',
  './js/data/parts.js',
  './js/data/offers.js',
  './js/data/tools.js',
  './js/data/maintenance.js',
  './js/data/repairs.js',
  './js/data/bearings-seals.js',
  './js/data/sources.js',
  './js/views/dashboard.js',
  './js/views/garage.js',
  './js/views/vehicle.js',
  './js/views/technik.js',
  './js/views/diagnose.js',
  './js/views/planer.js',
  './js/views/schrauben.js',
  './js/views/einstellungen.js',
  './js/views/teile.js',
  './js/views/suche.js',
  './js/views/wissen.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mopedplaner-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Nur eigene Ressourcen innerhalb des Scopes behandeln
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.includes('/mopedplaner/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
