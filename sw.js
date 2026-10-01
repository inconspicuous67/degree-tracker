/*
  sw.js — the "service worker": a helper the browser runs in the background.
  It sits between the app and the internet and handles every file request.

  Strategy: NETWORK FIRST.
    Online  → always ask GitHub for the newest file (cheap: if nothing
              changed, GitHub just answers "same as before"), save a copy,
              and use it. So your phone never gets stuck on an old version.
    Offline → use the saved copy. So the app works without a connection.

  You normally never need to edit this file. If you rename or add files the
  app needs offline, add them to CORE_FILES below.
*/

const CACHE = 'degree-tracker';

// Saved on first visit so the app opens even if you go offline right away
const CORE_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icon-192.png', 'icon-512.png',
  'js/app.js', 'js/storage.js', 'js/catalog.js', 'js/terms.js', 'js/gpa.js', 'js/utils.js',
  'js/requirements-engine.js', 'js/general-reqs.js',
  'js/views/home.js', 'js/views/plan.js', 'js/views/requirements.js', 'js/views/explore.js',
  'js/views/course.js', 'js/views/class-form.js', 'js/views/settings.js', 'js/views/programs.js',
  'data/courses.json', 'data/programs.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // start working right away, don't wait for old tabs to close
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_FILES)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // take over pages that are already open
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only handle our own files (not links to Stanford's sites, etc.)
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // "no-cache" = always double-check with GitHub that the file is current
      const fresh = await fetch(request, { cache: 'no-cache' });
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (offline) {
      const saved = await cache.match(request, { ignoreSearch: true });
      if (saved) return saved;
      throw offline;
    }
  })());
});
