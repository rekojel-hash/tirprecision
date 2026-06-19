// SW version — incrémenter à chaque déploiement pour forcer la mise à jour
const SW_VERSION = 'tirpro-v4';
const CACHE_NAME = `tirpro-cache-${SW_VERSION}`;

const CACHE_FIRST = ['.png', '.ico', 'manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Permet à la page de forcer l'activation immédiate du nouveau SW
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (url.includes('generativelanguage.googleapis.com')) return;
  if (url.includes('api.anthropic.com')) return;
  if (e.request.method !== 'GET') return;

  const isCacheFirst = CACHE_FIRST.some(ext => url.includes(ext));
  if (isCacheFirst) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML / JS / CSS → network-first
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});
