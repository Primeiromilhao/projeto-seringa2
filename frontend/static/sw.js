[Reading 63 lines from start (total: 63 lines, 0 remaining)]

const CACHE = 'seringa-v21-navegacao-limpa';
const BASE = './';
const ASSETS = [
  BASE,
  './index.html',
  './icon-512.png?v=20260921',
  './icon-192.png?v=20260921',
  './icon-512.png?v=20260921',
  './apple-touch-icon.png?v=20260921',
  './manifest.webmanifest',
  './inicio.html',
  './perfil.html',
  './relatorio.html',
  './app.html',
  './acesso.html',
  './hall-entrada.html',
  './styles.css?v=4.0',
  './app.js?v=4.0',
  './manifest.webmanifest',
  './theme.css?v=9',
  './theme.js?v=9',
  './seringa-modules.css?v=4',
  './seringa-modules.js?v=3',
  './seringa-home.js?v=2',
  './seringa-calendar.js?v=1',
  './seringa-pos-contacto.js?v=1',
  './modulo-cronico.html',
  './modulo-fertilidade.html',
  './modulo-biologicas.html',
  './modulo-intramuscular.html',
  './modulo-diabetes.html',
  './modulo-fisioterapia.html',
  './modulo-estetica.html',
  './modulo-corporal.html',
  './modulo-desmame.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(err => console.warn('SW cache all warning:', err))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(r => {
        if (r.ok) {
          const c = r.clone();
          caches.open(CACHE).then(x => x.put(event.request, c));
        }
        return r;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match(BASE)))
  );
});

[executed on device: PrimeiroMilhao (eaf5822a-1f64-40e2-b3c3-dffde84d6562)]