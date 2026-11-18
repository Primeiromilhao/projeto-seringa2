/* Página de transição da versão anterior (/antigo/).
   1) Permite baixar os dados que a versão anterior deixou no localStorage deste aparelho.
   2) Remove o service worker antigo (que ainda servia a versão anterior sem internet). */
(function () {
  "use strict";
  var estado = document.getElementById("estado");
  function chavesAntigas() {
    var ks = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k !== "seringa.v1" && /seringa|^sg_|^vs_/i.test(k)) ks.push(k); } } catch (e) { /* sem acesso */ }
    return ks;
  }
  var ks = chavesAntigas();
  estado.textContent = ks.length ? "Encontramos " + ks.length + " conjunto(s) de dados da versão anterior neste aparelho." : "Não encontramos dados da versão anterior neste aparelho.";
  document.getElementById("baixar").addEventListener("click", function () {
    var ks2 = chavesAntigas(); if (!ks2.length) { estado.textContent = "Não há dados da versão anterior para baixar neste aparelho."; return; }
    var dados = {}; ks2.forEach(function (k) { var v = localStorage.getItem(k); try { dados[k] = JSON.parse(v); } catch (e) { dados[k] = v; } });
    var blob = new Blob([JSON.stringify({ app: "seringa-versao-anterior", exportadoEm: new Date().toISOString(), dados: dados }, null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "seringa-versao-anterior.json";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    estado.textContent = "Cópia baixada. Guarde-a em local seguro: o arquivo não tem criptografia.";
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { if (/\/antigo\/$/.test(r.scope)) r.unregister(); });
    }).catch(function () { /* ignora */ });
  }
})();
