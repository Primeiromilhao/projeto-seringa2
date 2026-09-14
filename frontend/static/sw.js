const CACHE='seringa-v5';
const BASE='./';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll([BASE,'./index.html','./styles.css?v=4.0','./app.js?v=4.0','./manifest.webmanifest','./seringa-calendar.js?v=1'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(event.request,c));}return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match(BASE))));});
