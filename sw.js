// sw.js - Service Worker for ByteWise Search

const CACHE_NAME = 'bytewise-cache-v1';

// List of static assets to cache on install
const urlsToCache = [
    '/',
    '/index.html',
    '/worker.js' // Cache the web worker file
    // Add other static assets like CSS, images, etc. if they were external files
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache static assets', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Only delete caches that are not the current static cache
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of clients immediately
    return self.clients.claim();
});

// Fetch event: implement caching strategy for static assets
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Strategy for the worker.js file (Network First to ensure latest worker logic)
    // This is important because worker.js contains our "database"
    if (requestUrl.pathname.endsWith('/worker.js')) {
        event.respondWith(networkFirst(event.request, CACHE_NAME));
        return;
    }

    // Default strategy for other static assets (Cache First)
    // This includes index.html and any other files in urlsToCache
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
});

// Network First strategy: Try network, then fallback to cache
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(cacheName);
        // Cache successful network responses
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.warn(`Service Worker: Network failed for ${request.url}, falling back to cache.`, error);
        const cachedResponse = await caches.match(request);
        // If no cached response, return a generic offline response
        return cachedResponse || new Response('<h1>Offline</h1><p>You are offline and this content is not cached.</p>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

// Cache First strategy: Try cache, then fallback to network
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(cacheName);
        // Cache successful network responses
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error(`Service Worker: Cache and Network failed for ${request.url}`, error);
        // If both fail, return a generic offline response (or a specific one if needed)
        return new Response('<h1>Offline</h1><p>You are offline and this content is not cached.</p>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

