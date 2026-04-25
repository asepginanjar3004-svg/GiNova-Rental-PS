/**
 * GiNova PS - Service Worker
 * Premium Edition - Offline Ready
 */

const CACHE_NAME = 'ginova-ps-v3';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './admin.html',
  './css/style.css',
  './js/app.js?v=3',
  './js/auth.js?v=3',
  './js/dashboard.js?v=3',
  './js/admin.js',
  './img/ginova-logo.svg',
  './qris.jpeg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).catch((err) => {
      console.error('SW: Failed to cache assets', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - prefer network, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const requestUrl = new URL(event.request.url);
  const isDocument = event.request.destination === 'document';
  const isStaticFile = ['script', 'style', 'image', 'font'].includes(event.request.destination)
    || requestUrl.pathname.endsWith('.js')
    || requestUrl.pathname.endsWith('.css')
    || requestUrl.pathname.endsWith('.html')
    || requestUrl.pathname.endsWith('.svg')
    || requestUrl.pathname.endsWith('.json');

  if (isDocument || isStaticFile) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || (isDocument ? caches.match('./index.html') : null)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

