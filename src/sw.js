// Guardians of Lajen Compendium — Service Worker
// Enables PWA installation and basic offline caching

const CACHE_NAME = 'gol-compendium-v1';

// Core app shell files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: precache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first strategy (keeps data fresh from Supabase)
// Falls back to cache if offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Supabase API calls (always need fresh data)
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for the app shell
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
