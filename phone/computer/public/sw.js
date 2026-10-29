/* Cache application files, never private social responses or API content. */
const CACHE='synthia-computer-resonance-anchored-v2';
const SHELL=['/computer/','/computer/resonance-social.css','/computer/resonance-social.js','/computer/canonical-birth-profile.js','/computer/birth-anchor-bridge.js','/computer/manifest.webmanifest','/computer/synthia-192.png','/computer/synthia-512.png'];
self.addEventListener('install', e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/uploads/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&SHELL.includes(u.pathname)){const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return r}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))
});
