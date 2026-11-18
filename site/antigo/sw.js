/* Desativa o service worker da versão anterior (publicada em /antigo/).
   Ao ser instalado no lugar do antigo: apaga as caches da versão anterior (nunca as do app novo, «seringa-AAAA-...»),
   remove-se a si próprio e recarrega as páginas abertas, que passam a mostrar a página de transição. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return !/^seringa-\d{4}-/.test(k); }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (cs) { cs.forEach(function (c) { c.navigate(new URL("./", self.registration.scope).href).catch(function () {}); }); })
  );
});
