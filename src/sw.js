// Service Worker untuk Push Notifications dan Offline Support
// Precache files injected by Vite
if (self.__WB_MANIFEST) {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-precaching.prod.js');
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
}

const CACHE_NAME = 'dicoding-stories-v1';
const RUNTIME_CACHE = 'dicoding-stories-runtime';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first with cache fallback for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network first, cache fallback
  if (url.pathname.startsWith('/v1/stories') || url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const responseToCache = response.clone();
          // Cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback if available
            return new Response(
              JSON.stringify({ error: true, message: 'Offline - data tidak tersedia' }),
              {
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // For other requests, use cache first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request);
    })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);

  let notificationData = {
    title: 'Dicoding Stories',
    body: 'Ada story baru yang ditambahkan!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: '/',
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      // Handle Dicoding API notification format
      // Format: { "title": "...", "options": { "body": "..." } }
      if (data.title && data.options) {
        notificationData = {
          title: data.title,
          body: data.options.body || notificationData.body,
          icon: data.options.icon || data.icon || notificationData.icon,
          badge: data.options.badge || data.badge || notificationData.badge,
          image: data.options.image || data.image,
          data: {
            url: data.options.url || data.url || '/',
            storyId: data.options.storyId || data.storyId,
          },
          actions: (data.options.storyId || data.storyId)
            ? [
                {
                  action: 'view',
                  title: 'Lihat Story',
                },
                {
                  action: 'dismiss',
                  title: 'Tutup',
                },
              ]
            : [],
        };
      } else {
        // Fallback for other formats
        notificationData = {
          title: data.title || notificationData.title,
          body: data.body || data.message || data.options?.body || notificationData.body,
          icon: data.icon || data.options?.icon || notificationData.icon,
          badge: data.badge || data.options?.badge || notificationData.badge,
          image: data.image || data.options?.image,
          data: {
            url: data.url || data.options?.url || data.storyId ? `/#/story/${data.storyId}` : '/',
            storyId: data.storyId || data.options?.storyId,
          },
          actions: (data.storyId || data.options?.storyId)
            ? [
                {
                  action: 'view',
                  title: 'Lihat Story',
                },
                {
                  action: 'dismiss',
                  title: 'Tutup',
                },
              ]
            : [],
        };
      }
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Try to parse as text
      try {
        const text = event.data.text();
        if (text) {
          notificationData.body = text;
        }
      } catch (textError) {
        console.error('Error parsing push data as text:', textError);
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      data: notificationData.data,
      actions: notificationData.actions,
      tag: notificationData.data.storyId || 'story-notification',
      requireInteraction: false,
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === 'view' && notificationData.storyId) {
    // Navigate to story detail
    event.waitUntil(
      clients.openWindow(notificationData.url || `/#/story/${notificationData.storyId}`)
    );
  } else if (action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default: open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === self.location.origin && 'focus' in client) {
            if (notificationData.storyId) {
              client.navigate(`/#/story/${notificationData.storyId}`);
            }
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(notificationData.url || '/');
        }
      })
    );
  }
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncStories());
  }
});

async function syncStories() {
  // This will be called when device comes back online
  // The actual sync logic will be handled by the main app
  console.log('Service Worker: Syncing stories...');
}

