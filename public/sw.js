/* Hellofriends service worker.
 *
 * Deliberately hand-written and small — no build-step precache manifest, so
 * there is nothing to regenerate when assets change.
 *
 * Strategy
 *   navigations  network-first, falling back to the cached shell when offline
 *   hashed assets cache-first (filenames are content-hashed, so they are immutable)
 *   images       stale-while-revalidate, capped so storage does not grow forever
 *   API / auth   never cached
 */

const VERSION = 'v1';
const SHELL_CACHE = `hellofriends-shell-${VERSION}`;
const ASSET_CACHE = `hellofriends-assets-${VERSION}`;
const IMAGE_CACHE = `hellofriends-images-${VERSION}`;
const MAX_IMAGE_ENTRIES = 60;

const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never interfere with the payment API, Firebase auth or Firestore streams.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return;
  }

  // App shell for SPA navigations.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            return response;
          }),
      ),
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(IMAGE_CACHE)
                .then((cache) => cache.put(request, copy))
                .then(() => trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES))
                .catch(() => undefined);
            }
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
