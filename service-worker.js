const CACHE_NAME = 'ipo-account-hub-v3.11';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=3.11',
  './manifest.json',
  './Logo IPO Tracker.png',
  './js/firebase-config.js?v=3.11',
  './js/db.js?v=3.11',
  './js/translations.js?v=3.11',
  './js/ui-render.js?v=3.11',
  './js/app.js?v=3.11'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network First Strategy)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
