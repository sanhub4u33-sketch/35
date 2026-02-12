const CACHE_NAME = 'library-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/library-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
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
      console.log('Caching static assets');
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
  if (NEVER_INTERCEPT.some(pattern => url.includes(pattern))) {
    return;
  }

  // Skip IndexedDB-related requests
  if (url.includes('idb') || url.includes('indexeddb')) {
    return;
  }

  // Skip non-http requests
  if (!url.startsWith('http')) {
    return;
  }

  // For navigation requests (HTML pages), always go to network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // For static assets, use stale-while-revalidate strategy
  if (
    url.endsWith('.js') || 
    url.endsWith('.css') || 
    url.endsWith('.png') || 
    url.endsWith('.jpg') || 
    url.endsWith('.ico') ||
    url.endsWith('.woff2') ||
    url.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !url.includes('api')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: '/icons/library-logo.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Library', options));
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
