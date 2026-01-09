const CACHE_NAME = 'task-office-v1.0';
const urlsToCache = [
  '/',
  '/dashboard',
  '/chat',
  '/profile',
  '/about',
  '/help',
  '/offline'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache assets:', error);
      })
  );
  self.skipWaiting(); // Activate new service worker immediately
});

// Fetch event - serve cached content when available
self.addEventListener('fetch', (event) => {
  // Skip caching/intercepting for manifest.json, service worker, API routes, and other critical static assets
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Don't intercept API calls, authentication endpoints, or critical assets
  if (pathname === '/manifest.json' ||
      pathname === '/sw.js' ||
      pathname === '/favicon.ico' ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/login/') ||
      pathname.startsWith('/signup/')) {
    // Don't cache or intercept these files, let them be fetched directly
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        // Clone the request because request is a stream and can only be consumed once
        const fetchRequest = event.request.clone();
        
        // Fetch from network
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because response is a stream and can only be consumed once
          const responseToCache = response.clone();
          
          // Cache the fetched response
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        }).catch(() => {
          // If fetch fails, try to serve offline page
          return caches.match('/offline');
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all clients immediately
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  // Handle push notifications here if needed
});