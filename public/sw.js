const CACHE = 'synthai-computer-v1';
const APP = [
  '/',
  '/index.html',
  '/computer.css',
  '/computer-app.mjs',
  '/computer.html',
  '/computer-diagnostic.mjs',
  '/manifest.webmanifest',
  '/synthai-icon.svg',
  '/computer-runtime/BrowserComputerRuntime.mjs',
  '/computer-runtime/core/kernel.mjs',
  '/computer-runtime/runtime/storage.mjs',
  '/computer-runtime/runtime/execution.mjs',
  '/computer-runtime/runtime/experience.mjs',
  '/computer-runtime/runtime/json-file-persistence.mjs',
  '/computer-runtime/runtime/projects.mjs',
  '/computer-runtime/runtime/shells.mjs',
  '/computer-runtime/adapters/GitHubWorkspaceAdapter.mjs',
  '/computer-runtime/adapters/SystemAdapters.mjs',
  '/computer-runtime/micros/MicroRegistry.mjs'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('/index.html');
      throw new Error('offline and resource is not cached');
    }))
  );
});
