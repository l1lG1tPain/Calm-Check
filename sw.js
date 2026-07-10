// Calm Check v1.2 — Service Worker
const CACHE_NAME = 'calm-check-v1.3.2';
const ASSETS = ['/', '/index.html', '/app.js', '/manifest.json', '/img/CalmCheck-192.png', '/img/CalmCheck-512.png', '/img/CalmCheck.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (event.request.method === 'GET' && (event.request.url.includes('.js') || event.request.url.includes('.html') || event.request.url.includes('.json') || event.request.url.includes('.png') || event.request.url.includes('.ico'))) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('/index.html') : new Response('Offline', { status: 503 }));
  }));
});
