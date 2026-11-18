/* Site do Seringa — mostra o conteúdo oficial partilhado com o app (conteudo.js). */
(function () {
  "use strict";
  var C = window.SERINGA_CONTEUDO; if (!C) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fonte(ks) { return ks.map(function (k) { var f = C.fontes[k]; return f ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nome) + "</a>" : ""; }).filter(Boolean).join(" · "); }
  function data(s) { return new Date(s + "T12:00:00").toLocaleDateString("pt-BR"); }
  function lista(xs) { return "<ul>" + xs.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>"; }
  document.getElementById("alertas").innerHTML = "<strong>⚠ Procure atendimento se:</strong>" + lista(C.alertas);
  document.getElementById("lista-efeitos").innerHTML = C.efeitos.map(function (e) {
    return '<div class="card"><h3>' + esc(e.icone) + " " + esc(e.titulo) + "</h3><p>" + esc(e.oque) + "</p>" +
      (e.fazer && e.fazer.length ? "<p><b>O que fazer:</b></p>" + lista(e.fazer) : "") +
      (e.alerta ? '<p class="ponto">⚠ ' + esc(e.alerta) + "</p>" : "") + "</div>";
  }).join("");
  document.getElementById("fontes-efeitos").innerHTML = "Fontes: " + fonte(["bula", "lilly"]) + ". Revisto em " + data(C.versao) + ".";
  document.getElementById("lista-sus").innerHTML = C.sus.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
  document.getElementById("fonte-sus").innerHTML = "Fonte: " + fonte(["ms"]);
  document.getElementById("lista-avisos").innerHTML = C.avisos.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).map(function (a) {
    return '<div class="aviso"><time datetime="' + esc(a.data) + '">' + data(a.data) + "</time><h3>" + esc(a.titulo) + "</h3><p>" + esc(a.texto) + "</p>" +
      (a.fonte ? '<p class="fonte">Fonte: ' + fonte([a.fonte]) + "</p>" : "") + "</div>";
  }).join("");
  document.getElementById("versao").textContent = data(C.versao);
})();
