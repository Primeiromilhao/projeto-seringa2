/* Seringa — service worker: funciona sem internet e avisa quando há versão nova.
   Para publicar uma atualização: mudar VERSAO (e o conteúdo) e enviar para o GitHub. */
const VERSAO = "seringa-2026-11-18-1";
const ARQUIVOS = ["./", "index.html", "app.css", "app.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "../conteudo.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "atualizar") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // conteúdo oficial: rede primeiro (avisos novos), cache se estiver offline
  if (url.pathname.endsWith("/conteudo.js")) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
