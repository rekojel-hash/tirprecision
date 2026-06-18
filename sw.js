// SW version — incrementer à chaque déploiement pour forcer la mise à jour
const SW_VERSION = 'tirpro-v3';
const CACHE_NAME = `tirpro-cache-${SW_VERSION}`;

// Stratégie Network-first pour HTML/JS/CSS → toujours le fichier le plus récent
// Cache-first uniquement pour les assets statiques (icons, manifest)
const CACHE_FIRST = ['.png', '.ico', 'manifest.json'];

self.addEventListener('install', e => {
  // Prendre le contrôle immédiatement sans attendre
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Ne pas intercepter les appels API externes
  if (url.includes('generativelanguage.googleapis.com')) return;
  if (url.includes('api.anthropic.com')) return;

  // Assets statiques → cache-first
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

  // HTML / JS / CSS → network-first : essaye le réseau, fallback cache
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Mettre en cache la réponse fraîche
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Offline : servir depuis le cache
        return caches.match(e.request)
          .then(cached => cached || caches.match('./index.html'));
      })
  );
});
