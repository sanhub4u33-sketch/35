const CACHE_NAME = 'library-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/library-logo.png'
];

// URLs that should never be cached or intercepted (auth-related)
const NEVER_INTERCEPT = [
  'firebaseauth',
  'identitytoolkit',
  'securetoken',
  '__/auth/',
  'googleapis.com',
  'firebaseinstallations',
  'firebasedatabase',
  'firebase',
  'gstatic.com'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
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

// Fetch event - network first, with special handling for auth
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  
  // CRITICAL: Never intercept ANY Firebase/auth-related requests
  // Let them pass through directly to the network
  if (NEVER_INTERCEPT.some(pattern => url.includes(pattern))) {
    return; // Don't call respondWith - let the browser handle it normally
  }

  // Skip IndexedDB-related requests (used by Firebase for persistence)
  if (url.includes('idb') || url.includes('indexeddb')) {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.startsWith('http')) {
    return;
  }

  // For navigation requests (HTML pages), always go to network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets (not API calls)
        if (response.ok && 
            !url.includes('api') && 
            !url.includes('firebase') &&
            (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.ico'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
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

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
