/* SynthIMG service worker — serves installed image files from Cache Storage. */
const CACHE_NAME = 'synthimg-v1';
const PREFIX = '/__synthimg/';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(event.request);
    if (hit) return hit;

    // SPA-style fallback to the image's index.html if a client-side route is
    // requested and the exact file does not exist.
    const parts = url.pathname.slice(PREFIX.length).split('/');
    const digest = parts.shift();
    const fallback = new URL(`${PREFIX}${digest}/index.html`, url.origin).href;
    const index = await cache.match(fallback);
    if (index) return index;

    return new Response('Synth image resource not found', { status: 404 });
  })());
});
