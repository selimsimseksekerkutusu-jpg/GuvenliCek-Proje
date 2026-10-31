const CACHE_NAME = 'guvenli-cek-v3';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './models/ssd_mobilenetv1_model-weights_manifest.json',
  './models/ssd_mobilenetv1_model-shard1',
  './models/face_landmark_68_model-weights_manifest.json',
  './models/face_landmark_68_model-shard1',
  './models/face_recognition_model-weights_manifest.json',
  './models/face_recognition_model-shard1',
  './models/face_recognition_model-shard2'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;

  evt.respondWith(
    caches.match(evt.request).then((cacheRes) => {
      return cacheRes || fetch(evt.request).then((fetchRes) => {
        if (fetchRes.status === 200 && evt.request.url.startsWith(self.location.origin)) {
          const resClone = fetchRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evt.request, resClone));
        }
        return fetchRes;
      });
    })
  );
});
