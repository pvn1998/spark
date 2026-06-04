const CACHE_NAME = 'spark-v2';
const BASE = '/spark';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/sw.js'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // If some assets fail, still install
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const url = event.request.url;
          if (
            url.includes('.html') ||
            url.includes('.css') ||
            url.includes('.js') ||
            url.includes('.json') ||
            url.includes('fonts.googleapis') ||
            url.includes('fonts.gstatic')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Spark';
  const options = {
    body: data.body || 'You have a new match! 💫',
    icon: BASE + '/icons/icon-192.png',
    badge: BASE + '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || BASE + '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
