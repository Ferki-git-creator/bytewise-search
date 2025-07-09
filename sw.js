// sw.js
const CACHE_NAME = 'bytewise-v2'; // Updated cache version
const OFFLINE_URL = '/index.html'; // Fallback to index.html for offline

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/', // Cache the root path
        '/index.html', // Cache the main HTML file
        // Add other critical assets here if any, e.g., '/images/logo.png', '/styles/main.css'
        // For this project, all CSS/JS is inline, so only index.html is crucial
      ])
    ).then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(clients.claim()); // Take control of un-controlled clients
});

self.addEventListener('fetch', event => {
  // Only handle GET requests for navigation and static assets
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // No cache hit - fetch from network
        return fetch(event.request).catch(() => {
          // If network fails, return the offline page (which is index.html in this case)
          return caches.match(OFFLINE_URL);
        });
      })
    );
  }
  // Do NOT cache or intercept API requests (DuckDuckGo API)
  // These requests should always go to the network
});

