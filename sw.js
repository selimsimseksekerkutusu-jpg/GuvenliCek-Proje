const CACHE_NAME = 'guvenli-cek-v4';

// Core local assets required for full offline capability
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
  './models/ssd_mobilenetv1_model-weights_manifest.json',
  './models/ssd_mobilenetv1_model-shard1',
  './models/face_landmark_68_model-weights_manifest.json',
  './models/face_landmark_68_model-shard1',
  './models/face_recognition_model-weights_manifest.json',
  './models/face_recognition_model-shard1',
  './models/face_recognition_model-shard2'
];

// Install Event: Pre-cache all essential assets
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clear outdated cache versions
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Smart Hybrid Caching Strategy
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  const requestUrl = new URL(evt.request.url);

  // Strategy 1: Network-First for HTML/Navigation to ensure deployments update instantly
  if (evt.request.mode === 'navigate' || requestUrl.pathname.endsWith('index.html') || requestUrl.pathname === '/') {
    evt.respondWith(
      fetch(evt.request)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          // Offline Fallback: Serve cached index.html
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Strategy 2: Cache-First for JS Libraries, AI Models & Static Assets
  evt.respondWith(
    caches.match(evt.request).then((cacheRes) => {
      return cacheRes || fetch(evt.request).then((fetchRes) => {
        if (fetchRes.status === 200) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, resClone));
        }
        return fetchRes;
      });
    }).catch((err) => {
      console.warn('[SW] Offline Fetch Failed:', evt.request.url, err);
    })
  );
});
