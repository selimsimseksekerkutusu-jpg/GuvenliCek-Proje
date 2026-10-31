const CACHE_NAME = 'guvenli-cek-v5';

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

// Install Event: Robust individual asset caching (won't fail if one asset fails)
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => console.warn('[SW] Failed to cache:', url, err)))
      );
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
          // Fixed Promise chaining fallback for index.html / root
          return caches.match('./index.html').then((r) => r || caches.match('./'));
        })
    );
    return;
  }

  // Strategy 2: Cache-First for JS Libraries, AI Models & Static Assets
  evt.respondWith(
    caches.match(evt.request).then((cacheRes) => {
      if (cacheRes) return cacheRes;

      return fetch(evt.request).then((fetchRes) => {
        // Only cache 200 responses from same-origin or trusted CDN
        const isAllowedOrigin = requestUrl.origin === self.location.origin || requestUrl.origin.includes('cdn.jsdelivr.net');
        if (fetchRes.status === 200 && isAllowedOrigin) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, resClone));
        }
        return fetchRes;
      });
    }).catch((err) => {
      console.warn('[SW] Offline Fetch Failed:', evt.request.url, err);
      // Return explicit 503 response instead of undefined
      return new Response('Offline Resource Unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    })
  );
});
