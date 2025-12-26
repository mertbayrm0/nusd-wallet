const CACHE_NAME = 'nusd-wallet-v2';

// Install event - aktivasyon hemen yapılsın
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    self.skipWaiting();
});

// Activate event - hemen control al
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Network First stratejisi (SPA için daha uygun)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls and external requests
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;
    if (event.request.url.includes('/rest/') ||
        event.request.url.includes('/auth/') ||
        event.request.url.includes('supabase.co')) {
        return;
    }

    // Network first, fallback to cache, then to index.html for navigation
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and cache successful responses
                if (response.ok) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // For navigation requests, return index.html (SPA fallback)
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html') || fetch('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
