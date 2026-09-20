const CACHE='seringa-v26-ui-profissional';
const BASE='./';
const ASSETS=[
 BASE,'./index.html','./inicio.html','./acesso.html','./app.html','./perfil.html','./relatorio.html','./calendario.html',
 './theme.css?v=12','./theme.js?v=12','./seringa-ui.css?v=3','./seringa-modules.css?v=4','./seringa-modules.js?v=3','./seringa-home.js?v=2',
 './seringa-calendar.js?v=1','./seringa-pos-contacto.js?v=1','./seringa-shield.js?v=2',
 './modulo-cronico.html','./modulo-fertilidade.html','./modulo-biologicas.html','./modulo-intramuscular.html','./modulo-diabetes.html','./modulo-fisioterapia.html','./modulo-estetica.html','./modulo-corporal.html','./modulo-desmame.html',
 './manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match(BASE))));
});