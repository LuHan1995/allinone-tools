const CACHE_VERSION = 'v4';
const CACHE_CORE = 'tools-core-' + CACHE_VERSION;
const CACHE_MODULES = 'tools-modules-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './landing.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/utils.js',
  './js/tools-data.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_CORE).then(cache =>
      Promise.all(CORE_ASSETS.map(asset =>
        cache.add(asset).catch(err => console.warn('缓存失败:', asset, err))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => (k.startsWith('tools-core-') || k.startsWith('tools-modules-')) && !k.endsWith(CACHE_VERSION)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
  // Notify all clients that update is ready
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'UPDATE_READY' }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isModule = url.pathname.includes('/modules/');

  if (isModule) {
    e.respondWith(
      caches.open(CACHE_MODULES).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) {
          // StaleWhileRevalidate
          fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone());
          }).catch(() => {});
          return cached;
        }
        const response = await fetch(e.request);
        if (response.ok) cache.put(e.request, response.clone());
        return response;
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
