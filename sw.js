const CACHE_NAME = 'nex-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './viewer.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // Return a custom error page or response for failed requests
          return new Response('Resource not found', {
            status: 404,
            statusText: 'Not Found'
          });
        });
      })
  );
}); 