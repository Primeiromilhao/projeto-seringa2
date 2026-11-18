/* Seringa — app (PWA, offline, dados só no aparelho).
   Regras do produto: organiza, lembra e informa. NUNCA calcula, sugere ou avalia doses. Não diagnostica.
   Não interpreta imagens. Não usa IA. Avisos de sinais graves são textos fixos, sem triagem. */
(function () {
  "use strict";
  const C = window.SERINGA_CONTEUDO || { efeitos: [], alertas: [], avisos: [], sus: [], fontes: {}, medicamentos: {} };
  const CHAVE_LOCAL = "seringa.v1"; // formato antigo (localStorage), migrado para IndexedDB
  const LOCAIS = [
    ["abd-e", "Abdômen", "lado esquerdo"], ["abd-d", "Abdômen", "lado direito"],
    ["cox-e", "Coxa", "esquerda"], ["cox-d", "Coxa", "direita"],
    ["bra-e", "Braço", "esquerdo"], ["bra-d", "Braço", "direito"]
  ];
  // [id, nome, índice do aviso fixo da bula (só nos sinais de alerta)]
  const SINTOMAS = [
    ["enjoo", "Enjoo"], ["vomito", "Vômito"], ["diarreia", "Diarreia"], ["prisao", "Prisão de ventre"],
    ["refluxo", "Refluxo / azia"], ["cansaco", "Cansaço"], ["local", "Dor ou vermelhidão no local"],
    ["apetite", "Menos apetite"], ["outro", "Outro"],
    ["dor-forte", "Dor forte na barriga que não passa", 0],
    ["vomito-continuo", "Vômitos ou diarreia que não param", 3],
    ["alergia", "Inchaço no rosto/lábios ou falta de ar", 1]
  ];
  const INTENSIDADES = ["leve", "moderada", "forte"];
  const CATEGORIAS = [["glp1", "Caneta GLP-1 / GIP (diabetes ou obesidade)"], ["insulina", "Insulina"],
    ["fertilidade", "Fertilidade"], ["anticoagulante", "Anticoagulante"], ["vitamina", "Vitamina (ex.: B12)"], ["outro", "Outro"]];
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  // ---------- utilidades ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dataBR = d => new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const diaBR = d => new Date(d).toLocaleDateString("pt-BR");
  const horaBR = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  // datas "AAAA-MM-DD" do conteúdo: meio-dia local, para não mudar de dia em nenhum fuso (B2)
  const dataConteudo = s => new Date(s + "T12:00:00").toLocaleDateString("pt-BR");
  const diaChave = d => { const x = new Date(d); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); };
  const nomeLocal = k => { const l = LOCAIS.find(x => x[0] === k); return l ? `${l[1]} — ${l[2]}` : k; };
  const nomeSint = k => { const s = SINTOMAS.find(x => x[0] === k); return s ? s[1] : k; };
  const nomeCat = k => { const c = CATEGORIAS.find(x => x[0] === k); return c ? c[1] : ""; };
  const ehAlerta = k => { const s = SINTOMAS.find(x => x[0] === k); return !!s && s[2] !== undefined; };
  function paraInput(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); }
  function toast(t) { const el = $("#aviso-toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600); }
  function fonteHTML(ks) {
    return (ks || []).map(k => C.fontes[k]).filter(Boolean)
      .map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(" · ");
  }

  // ---------- armazenamento: IndexedDB com encriptação AES-GCM (Web Crypto) ----------
  // A chave é gerada no aparelho como NÃO-exportável e guardada no IndexedDB. Os registos ficam cifrados em repouso.
  // Limite (documentado na política): quem tiver acesso ao celular desbloqueado e ao app consegue ver os dados.
  const Armazem = (() => {
    let modo = "memoria", db = null, chave = null, fila = Promise.resolve();
    const abrir = () => new Promise((res, rej) => {
      const r = indexedDB.open("seringa", 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("kv")) r.result.createObjectStore("kv"); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("bloqueado"));
    });
    const tx = (mode, fn) => new Promise((res, rej) => {
      const t = db.transaction("kv", mode), req = fn(t.objectStore("kv")); let out;
      if (req) req.onsuccess = () => { out = req.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
    const novaChave = async () => { chave = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); await tx("readwrite", s => s.put(chave, "chave")); };
    function lerLocal() { try { const t = localStorage.getItem(CHAVE_LOCAL); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
    async function escrever(json) {
      if (modo === "idb") {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, new TextEncoder().encode(json));
        await tx("readwrite", s => s.put({ v: 1, iv, ct }, "estado"));
      } else if (modo === "local") localStorage.setItem(CHAVE_LOCAL, json);
    }
    async function iniciar() {
      try {
        if (!window.indexedDB || !window.crypto || !crypto.subtle) throw new Error("sem suporte");
        db = await abrir();
        chave = await tx("readonly", s => s.get("chave"));
        if (!chave) await novaChave();
        modo = "idb";
      } catch (e) {
        modo = "local"; try { localStorage.setItem("seringa.teste", "1"); localStorage.removeItem("seringa.teste"); } catch (x) { modo = "memoria"; }
        return lerLocal();
      }
      const reg = await tx("readonly", s => s.get("estado"));
      if (reg) {
        try {
          const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: reg.iv }, chave, reg.ct);
          return JSON.parse(new TextDecoder().decode(pt));
        } catch (e) { modo = "erro"; return null; } // nunca sobrescrever dados que não conseguimos ler
      }
      const antigo = lerLocal(); // migração do formato antigo (localStorage em claro)
      if (antigo) { await escrever(JSON.stringify(antigo)); try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* ignora */ } }
      return antigo;
    }
    function guardar(d) {
      const json = JSON.stringify(d);
      fila = fila.then(() => escrever(json)).catch(() => toast("Não consegui salvar no aparelho."));
      return fila;
    }
    async function apagar() {
      await fila;
      try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* ignora */ }
      if (db) { await tx("readwrite", s => { s.delete("estado"); return s.delete("chave"); }); await novaChave(); if (modo === "erro") modo = "idb"; }
    }
    return { iniciar, guardar, apagar, get modo() { return modo; }, pronto: () => fila };
  })();
  window.SeringaArmazem = { modo: () => Armazem.modo, pronto: () => Armazem.pronto() }; // usado pelos testes automáticos

  function vazio() { return { aviso: false, meds: [], aplicacoes: [], sintomas: [], pesos: [], duvidas: "" }; }
  let D = vazio();
  function gravar() { if (Armazem.modo === "erro") return toast("Os dados não puderam ser lidos; nada foi alterado."); Armazem.guardar(D); }

  // Validação de dados importados (cópia de segurança): só aceita campos conhecidos, com tipos e limites.
  function validarCopia(obj) {
    const d = obj && obj.app === "seringa" ? obj.dados : obj;
    if (!d || typeof d !== "object" || !Array.isArray(d.meds)) throw new Error("formato");
    const arr = k => Array.isArray(d[k]) ? d[k] : [];
    const iso = s => typeof s === "string" && !isNaN(new Date(s).getTime());
    const txt = (s, n) => typeof s === "string" ? s.slice(0, n) : "";
    const meds = arr("meds").filter(m => m && txt(m.nome, 80).trim() && Number.isInteger(m.intervalo) && m.intervalo >= 1 && m.intervalo <= 60 && iso(m.primeira))
      .slice(0, 1).map(m => ({ id: txt(m.id, 40) || id(), nome: txt(m.nome, 80).trim(), categoria: CATEGORIAS.some(c => c[0] === m.categoria) ? m.categoria : "",
        intervalo: m.intervalo, primeira: new Date(m.primeira).toISOString(), hora: /^\d\d:\d\d$/.test(m.hora) ? m.hora : "09:00",
        ajustadoEm: iso(m.ajustadoEm) ? new Date(m.ajustadoEm).toISOString() : undefined }));
    return {
      aviso: true, meds,
      aplicacoes: arr("aplicacoes").filter(a => a && iso(a.quando) && LOCAIS.some(l => l[0] === a.local)).map(a => ({ id: txt(a.id, 40) || id(), medId: txt(a.medId, 40),
        quando: new Date(a.quando).toISOString(), criadoEm: iso(a.criadoEm) ? new Date(a.criadoEm).toISOString() : new Date(a.quando).toISOString(), local: a.local, nota: txt(a.nota, 200) })),
      sintomas: arr("sintomas").filter(s => s && iso(s.quando) && SINTOMAS.some(x => x[0] === s.tipo)).map(s => ({ id: txt(s.id, 40) || id(),
        quando: new Date(s.quando).toISOString(), tipo: s.tipo, intensidade: INTENSIDADES.includes(s.intensidade) ? s.intensidade : "", nota: txt(s.nota, 200) })),
      pesos: arr("pesos").filter(p => p && iso(p.quando) && typeof p.kg === "number" && p.kg >= 20 && p.kg <= 400).map(p => ({ id: txt(p.id, 40) || id(), quando: new Date(p.quando).toISOString(), kg: Math.round(p.kg * 10) / 10 })),
      duvidas: txt(d.duvidas, 2000)
    };
  }

  // ---------- regras do lembrete (só agenda o que a pessoa indicou; nada é decidido pelo app) ----------
  const med = () => D.meds[0];
  const ordenadas = () => D.aplicacoes.slice().sort((a, b) => b.quando.localeCompare(a.quando));
  const ultimaAplic = () => ordenadas()[0];
  function proxima() {
    const m = med(); if (!m) return null;
    const u = ultimaAplic();
    // A data indicada pela pessoa vale se foi definida depois do último registo (B3); senão conta a partir da última aplicação.
    if (!u || new Date(m.ajustadoEm || 0) >= new Date(u.criadoEm || u.quando)) return new Date(m.primeira);
    const d = new Date(u.quando); d.setDate(d.getDate() + m.intervalo);
    const [h, mi] = (m.hora || "09:00").split(":"); d.setHours(+h, +mi, 0, 0);
    return d;
  }
  const locaisRecentes = n => ordenadas().slice(0, n).map(a => a.local);
  const ultimoUso = k => { const a = ordenadas().find(x => x.local === k); return a ? a.quando : null; };
  function descFreq(m) {
    if (m.intervalo === 7) { const p = proxima(); return `uma vez por semana (próxima: ${DIAS[p.getDay()]})`; }
    if (m.intervalo === 1) return "todos os dias";
    return `a cada ${m.intervalo} dias`;
  }
  // Conteúdo revisado só para o medicamento configurado (B6)
  function guiaDoMed() {
    const m = med(); if (!m) return null;
    const n = m.nome.toLowerCase();
    const k = Object.keys(C.medicamentos || {}).find(k => C.medicamentos[k].termos.some(t => n.includes(t)));
    return k || null;
  }

  // ---------- ecrãs ----------
  const ECRAS = {};
  const SEM_MED = ["config", "efeitos", "mais", "sus", "avisos", "privacidade", "sobre"];
  let calMes = 0;
  function ir(nome, arg) {
    if (!Object.prototype.hasOwnProperty.call(ECRAS, nome) || typeof ECRAS[nome] !== "function") nome = "hoje"; // B1
    if (!D.aviso) nome = "boasvindas";
    else if (!med() && !SEM_MED.includes(nome)) nome = "config";
    $("#ecra").innerHTML = ECRAS[nome](arg);
    document.querySelectorAll(".abas button").forEach(b => {
      const at = b.dataset.ecra === nome; b.classList.toggle("ativa", at);
      if (at) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    if (ECRAS[nome].depois) ECRAS[nome].depois(arg);
    $("#ecra").focus({ preventScroll: true });
  }

  ECRAS.boasvindas = () => `
    <h1>Bem-vindo(a) ao Seringa</h1>
    <div class="cartao destaque">
      <p><strong>Seu tratamento organizado, com informação de fonte oficial.</strong></p>
      <p>Registre cada aplicação em segundos, lembre-se da próxima, varie o local, anote como se sente e leve tudo à consulta.</p>
    </div>
    <div class="cartao">
      <p>✅ O Seringa <strong>organiza, lembra e informa</strong>.</p>
      <p>⛔ O Seringa <strong>não calcula nem orienta doses</strong>, não faz diagnóstico e <strong>não substitui o médico</strong>.
        Use o medicamento somente com prescrição e acompanhamento profissional.</p>
      <p>🔒 Seus dados ficam <strong>só neste celular</strong>, salvos de forma criptografada. Você pode baixar uma cópia ou apagá-los quando quiser.
        <a href="#" data-ir="privacidade">Saiba mais</a></p>
    </div>
    <button class="btn" id="aceitar">Entendi, começar</button>`;
  ECRAS.boasvindas.depois = () => $("#aceitar").onclick = () => {
    D.aviso = true; gravar();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
    ir("config");
  };

  ECRAS.config = () => {
    const m = med() || {};
    const amanha = new Date(Date.now() + 864e5); amanha.setHours(9, 0, 0, 0);
    const prox = m.id ? paraInput(proxima()) : paraInput(amanha);
    const outro = m.id && ![1, 7].includes(m.intervalo);
    return `
    <h1>${m.id ? "Meu medicamento" : "Vamos configurar"}</h1>
    <p class="suave">Preencha conforme o que seu médico prescreveu. O Seringa apenas usa estes dados para lembrar você.</p>
    <div class="cartao">
      <label for="c-nome">Nome do medicamento</label>
      <input id="c-nome" list="sug" placeholder="Ex.: Mounjaro" maxlength="80" autocomplete="off" value="${esc(m.nome || "")}">
      <datalist id="sug"><option value="Mounjaro"><option value="Ozempic"><option value="Wegovy"><option value="Insulina"></datalist>
      <label for="c-cat">Tipo (opcional)</label>
      <select id="c-cat"><option value="">—</option>${CATEGORIAS.map(c => `<option value="${c[0]}" ${m.categoria === c[0] ? "selected" : ""}>${esc(c[1])}</option>`).join("")}</select>
      <label for="c-freq">Com que frequência aplica?</label>
      <select id="c-freq">
        <option value="7" ${m.intervalo === 7 || !m.id ? "selected" : ""}>Uma vez por semana</option>
        <option value="1" ${m.intervalo === 1 ? "selected" : ""}>Todos os dias</option>
        <option value="outro" ${outro ? "selected" : ""}>A cada X dias</option>
      </select>
      <div id="c-x" ${outro ? "" : "hidden"}>
        <label for="c-int">A cada quantos dias?</label>
        <input id="c-int" type="number" inputmode="numeric" min="2" max="60" value="${outro ? m.intervalo : 14}">
      </div>
      <label for="c-prox">Quando é a próxima aplicação?</label>
      <input id="c-prox" type="datetime-local" value="${prox}">
      <p class="suave">Depois de cada registro, o Seringa conta a próxima data a partir da aplicação registrada. Se mudar a data aqui, ela passa a valer.</p>
    </div>
    <button class="btn" id="c-gravar">Salvar</button>
    ${m.id ? `<button class="btn sec" data-ir="mais">Voltar</button>` : ""}`;
  };
  ECRAS.config.depois = () => {
    const inicial = $("#c-prox").value;
    $("#c-freq").onchange = e => $("#c-x").hidden = e.target.value !== "outro";
    $("#c-gravar").onclick = () => {
      const nome = $("#c-nome").value.trim();
      if (!nome) return toast("Escreva o nome do medicamento.");
      const f = $("#c-freq").value;
      const intervalo = f === "outro" ? Math.max(2, Math.min(60, parseInt($("#c-int").value, 10) || 14)) : +f;
      const p = $("#c-prox").value;
      if (!p) return toast("Indique a data da próxima aplicação.");
      const ant = med(), u = ultimaAplic(), mudouData = !ant || p !== inicial;
      if (mudouData && u && new Date(p) <= new Date(u.quando)) return toast(`A próxima aplicação tem de ser depois da última registrada (${diaBR(u.quando)}).`);
      const m = ant || { id: id() };
      Object.assign(m, { nome, intervalo, categoria: $("#c-cat").value });
      if (mudouData) Object.assign(m, { primeira: new Date(p).toISOString(), hora: p.slice(11, 16), ajustadoEm: new Date().toISOString() });
      D.meds = [m]; gravar();
      toast(ant && mudouData ? "Salvo ✓ Se usa o lembrete no calendário, baixe-o de novo." : "Salvo ✓");
      ir("hoje");
    };
  };

  function alertaHTML(tipo) {
    if (!ehAlerta(tipo)) return "";
    const idx = SINTOMAS.find(x => x[0] === tipo)[2];
    if (guiaDoMed() === "mounjaro") {
      return `<div class="alerta" role="alert"><strong>⚠ Atenção:</strong> ${esc(C.alertas[idx] || C.alertaGeral)}
        <p class="fonte">Fonte: ${fonteHTML(["bula"])}</p></div>`;
    }
    return `<div class="alerta" role="alert"><strong>⚠ Atenção:</strong> ${esc(C.alertaGeral || "Procure atendimento médico. Em urgência, ligue 192 (SAMU).")}
      <p class="fonte">${fonteHTML(["bulario"])}</p></div>`;
  }

  ECRAS.hoje = () => {
    const m = med(), p = proxima(), u = ultimaAplic(), agora = new Date();
    const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
    const p0 = new Date(p); p0.setHours(0, 0, 0, 0);
    const dias = Math.round((p0 - hoje0) / 864e5);
    const quando = dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : dias > 1 ? `Em ${dias} dias` : "Data prevista já passou";
    const alertaRecente = D.sintomas.find(s => ehAlerta(s.tipo) && (agora - new Date(s.quando)) < 3 * 864e5);
    return `
    <h1>Olá!</h1>
    ${alertaRecente ? alertaHTML(alertaRecente.tipo) : ""}
    <div class="cartao destaque">
      <p class="suave">Próxima aplicação — ${esc(m.nome)}</p>
      <p class="grande">${quando}</p>
      <p>${dataBR(p)} às ${horaBR(p)}</p>
      ${dias < 0 ? `<p class="suave">Se já aplicou, registre para manter o histórico certo.</p>` : ""}
    </div>
    <button class="btn" data-ir="registrar">➕ Registrar aplicação</button>
    <div class="cartao">
      <p><strong>Última aplicação</strong></p>
      ${u ? `<p>${dataBR(u.quando)} às ${horaBR(u.quando)}</p><p>Local: <strong>${esc(nomeLocal(u.local))}</strong></p>
        <p class="suave">Na próxima, escolha um local diferente (a bula orienta alternar).</p>` : `<p class="suave">Ainda não registrou nenhuma aplicação.</p>`}
    </div>
    <div class="linha-btn">
      <button class="btn sec" data-ir="calendario">📅 Calendário</button>
      <button class="btn sec" data-ir="sintomas">📝 Como estou</button>
    </div>
    <p class="suave">${esc(m.nome)}: ${descFreq(m)}. <button class="link-txt" data-ir="config">Alterar</button></p>`;
  };

  ECRAS.registrar = () => {
    const rec = locaisRecentes(2);
    return `
    <h1>Registrar aplicação</h1>
    <p><strong>${esc(med().nome)}</strong></p>
    <p class="legenda">Mapa do corpo: toque onde aplicou. Tracejado = usado nas 2 últimas aplicações.</p>
    <div class="corpo" role="group" aria-label="Local da aplicação">
      ${LOCAIS.map(l => { const uu = ultimoUso(l[0]); return `<button class="local ${rec.includes(l[0]) ? "recente" : ""}" data-local="${l[0]}" aria-pressed="false">
        <span>${l[1]}</span><small>${l[2]}</small><small class="uso">${rec[0] === l[0] ? "último local" : uu ? "usado em " + diaBR(uu) : "não usado"}</small></button>`; }).join("")}
    </div>
    <label for="r-quando">Quando?</label>
    <input id="r-quando" type="datetime-local" value="${paraInput(new Date())}">
    <label for="r-nota">Observação (opcional)</label>
    <input id="r-nota" placeholder="Ex.: aplicação tranquila" maxlength="200">
    <button class="btn" id="r-ok">Confirmar</button>`;
  };
  ECRAS.registrar.depois = () => {
    let escolhido = null;
    document.querySelectorAll(".local").forEach(b => b.onclick = () => {
      document.querySelectorAll(".local").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); escolhido = b.dataset.local;
    });
    $("#r-ok").onclick = () => {
      if (!escolhido) return toast("Toque no local onde aplicou.");
      const q = $("#r-quando").value;
      if (!q) return toast("Indique a data e a hora.");
      if (new Date(q) > new Date(Date.now() + 5 * 6e4)) return toast("A data não pode ser no futuro.");
      D.aplicacoes.push({ id: id(), medId: med().id, quando: new Date(q).toISOString(), criadoEm: new Date().toISOString(), local: escolhido, nota: $("#r-nota").value.trim() });
      gravar(); toast("Aplicação registrada ✓"); ir("hoje");
    };
  };

  ECRAS.sintomas = () => `
    <h1>Como estou</h1>
    <p class="suave">Anote o que sente. Ajuda você e o seu médico a acompanhar o tratamento. Os itens com ⚠ mostram um aviso para procurar atendimento.</p>
    <label id="l-sint">O que está sentindo?</label>
    <div class="chips" role="group" aria-labelledby="l-sint">
      ${SINTOMAS.map(s => `<button class="chip ${s[2] !== undefined ? "chip-alerta" : ""}" data-s="${s[0]}" aria-pressed="false">${s[2] !== undefined ? "⚠ " : ""}${esc(s[1])}</button>`).join("")}
    </div>
    <div id="s-alerta"></div>
    <label id="l-int">Intensidade</label>
    <div class="chips" role="group" aria-labelledby="l-int">
      ${INTENSIDADES.map(i => `<button class="chip" data-i="${i}" aria-pressed="false">${i}</button>`).join("")}
    </div>
    <label for="s-nota">Nota (opcional)</label>
    <input id="s-nota" maxlength="200" placeholder="Ex.: depois do almoço">
    <button class="btn" id="s-ok">Salvar</button>
    <h2>Últimos registros</h2>
    <div class="cartao">${linhaTempo(8)}</div>`;
  ECRAS.sintomas.depois = () => {
    let s = null, i = null;
    document.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      document.querySelectorAll("[data-s]").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); s = b.dataset.s; $("#s-alerta").innerHTML = alertaHTML(s);
    });
    document.querySelectorAll("[data-i]").forEach(b => b.onclick = () => {
      document.querySelectorAll("[data-i]").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); i = b.dataset.i;
    });
    $("#s-ok").onclick = () => {
      if (!s) return toast("Escolha o que está sentindo.");
      D.sintomas.push({ id: id(), quando: new Date().toISOString(), tipo: s, intensidade: i || "", nota: $("#s-nota").value.trim() });
      gravar(); toast("Anotado ✓"); ir("sintomas");
      if (ehAlerta(s)) $("#s-alerta").innerHTML = alertaHTML(s);
    };
  };

  function itensLinha() {
    return [
      ...D.aplicacoes.map(a => ({ q: a.quando, t: `💉 Aplicação — ${nomeLocal(a.local)}`, n: a.nota, tipo: "aplicacoes", id: a.id })),
      ...D.sintomas.map(s => ({ q: s.quando, t: `📝 ${nomeSint(s.tipo)}${s.intensidade ? " (" + s.intensidade + ")" : ""}`, n: s.nota, tipo: "sintomas", id: s.id })),
      ...D.pesos.map(p => ({ q: p.quando, t: `⚖ Peso: ${String(p.kg).replace(".", ",")} kg`, n: "", tipo: "pesos", id: p.id }))
    ].sort((a, b) => b.q.localeCompare(a.q));
  }
  function linhaTempo(n, apagar) {
    const itens = itensLinha().slice(0, n || 9999);
    if (!itens.length) return `<p class="suave">Nada registrado ainda.</p>`;
    return `<ul class="lista">${itens.map(x => `<li><span>${esc(x.t)}${x.n ? `<br><span class="suave">${esc(x.n)}</span>` : ""}</span>
      <span class="suave dir">${diaBR(x.q)}<br>${horaBR(x.q)}${apagar ? `<br><button class="mini" data-del="${esc(x.tipo)}:${esc(x.id)}">apagar</button>` : ""}</span></li>`).join("")}</ul>`;
  }

  ECRAS.calendario = () => {
    const base = new Date(); base.setDate(1); base.setHours(12, 0, 0, 0); base.setMonth(base.getMonth() + calMes);
    const ano = base.getFullYear(), mes = base.getMonth();
    const ini = new Date(ano, mes, 1), fim = new Date(ano, mes + 1, 0, 23, 59, 59);
    const ap = {}, si = {}, prev = {};
    D.aplicacoes.forEach(a => { const k = diaChave(a.quando); (ap[k] = ap[k] || []).push(a); });
    D.sintomas.forEach(s => { const k = diaChave(s.quando); (si[k] = si[k] || []).push(s); });
    // datas previstas: a próxima e as seguintes, no intervalo indicado pela pessoa
    const m = med(); let p = new Date(proxima());
    for (let i = 0; i < 400 && p <= fim; i++) { if (p >= ini) prev[diaChave(p)] = new Date(p); p.setDate(p.getDate() + m.intervalo); }
    const hojeK = diaChave(new Date());
    let cel = "";
    for (let i = 0; i < ini.getDay(); i++) cel += `<div class="dia vazio" aria-hidden="true"></div>`;
    for (let d = 1; d <= fim.getDate(); d++) {
      const k = ano + "-" + (mes + 1) + "-" + d, partes = [];
      if (ap[k]) partes.push(`${ap[k].length} aplicação(ões)`); if (prev[k]) partes.push("aplicação prevista"); if (si[k]) partes.push(`${si[k].length} sintoma(s)`);
      cel += `<div class="dia ${k === hojeK ? "hoje" : ""} ${ap[k] ? "com-ap" : ""} ${prev[k] ? "previsto" : ""}" aria-label="${d} de ${MESES[mes]}${partes.length ? ": " + partes.join(", ") : ""}">
        <span class="n">${d}</span><span class="marcas" aria-hidden="true">${ap[k] ? "💉" : ""}${prev[k] && !ap[k] ? "⏰" : ""}${si[k] ? "•" : ""}</span></div>`;
    }
    const doMes = itensLinha().filter(x => { const q = new Date(x.q); return q >= ini && q <= fim; });
    const prevLista = Object.values(prev).sort((a, b) => a - b);
    return `
    <h1>Calendário</h1>
    <div class="cal-topo">
      <button class="btn sec cal-nav" id="cal-ant" aria-label="Mês anterior">‹</button>
      <h2 class="cal-mes" aria-live="polite">${MESES[mes][0].toUpperCase() + MESES[mes].slice(1)} de ${ano}</h2>
      <button class="btn sec cal-nav" id="cal-seg" aria-label="Mês seguinte">›</button>
    </div>
    <div class="cartao">
      <div class="cal" role="grid" aria-label="Dias de ${MESES[mes]}">
        ${["D", "S", "T", "Q", "Q", "S", "S"].map(x => `<div class="sem" aria-hidden="true">${x}</div>`).join("")}${cel}
      </div>
      <p class="legenda">💉 aplicação registrada · ⏰ aplicação prevista (conforme o que você indicou) · • sintoma anotado</p>
    </div>
    ${prevLista.length ? `<h2>Previstas neste mês</h2><div class="cartao"><ul class="lista">${prevLista.map(d => `<li><span>⏰ ${dataBR(d)}</span><span class="suave">${horaBR(d)}</span></li>`).join("")}</ul></div>` : ""}
    <h2>Registros deste mês</h2>
    <div class="cartao">${doMes.length ? `<ul class="lista">${doMes.map(x => `<li><span>${esc(x.t)}</span><span class="suave dir">${diaBR(x.q)}<br>${horaBR(x.q)}</span></li>`).join("")}</ul>` : `<p class="suave">Nada registrado neste mês.</p>`}</div>
    ${calMes !== 0 ? `<button class="btn sec" id="cal-hoje">Voltar ao mês atual</button>` : ""}`;
  };
  ECRAS.calendario.depois = () => {
    $("#cal-ant").onclick = () => { calMes--; ir("calendario"); };
    $("#cal-seg").onclick = () => { calMes++; ir("calendario"); };
    if ($("#cal-hoje")) $("#cal-hoje").onclick = () => { calMes = 0; ir("calendario"); };
  };

  ECRAS.efeitos = () => {
    const g = guiaDoMed(), m = med();
    if (m && !g) return `
      <h1>Efeitos e cuidados</h1>
      <div class="cartao">
        <p>Ainda não temos um guia revisado para <strong>${esc(m.nome)}</strong>.</p>
        <p>Consulte a bula do seu medicamento e converse com o seu médico sobre o que pode acontecer e quando procurar atendimento.</p>
        <p class="fonte">${fonteHTML(["bulario"])}</p>
      </div>
      <div class="alerta"><strong>Em urgência:</strong> ligue 192 (SAMU) ou procure o pronto atendimento mais próximo.</div>
      <p class="suave">Pode anotar o que sente em «Sintomas» para mostrar ao médico.</p>`;
    return `
    <h1>Efeitos e cuidados</h1>
    <p class="suave">${m ? "" : "Guia disponível: "}<strong>${esc(C.medicamentos.mounjaro.nome)}</strong>. Informação da bula e de fontes oficiais. Não substitui o médico.</p>
    <div class="alerta"><strong>Procure atendimento se:</strong><ul>${C.alertas.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>
    ${C.efeitos.map(e => `<div class="cartao">
      <h2>${e.icone} ${esc(e.titulo)}</h2>
      <p>${esc(e.oque)}</p>
      ${e.fazer && e.fazer.length ? `<p><strong>O que fazer no Seringa e na consulta:</strong></p><ul>${e.fazer.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      ${e.alerta ? `<p><strong>⚠</strong> ${esc(e.alerta)}</p>` : ""}
      <p class="fonte">Fonte: ${fonteHTML(e.fonte)}</p></div>`).join("")}
    <p class="fonte">Conteúdo revisto em ${dataConteudo(C.versao)}.</p>`;
  };

  ECRAS.mais = () => `
    <h1>Mais</h1>
    <div class="menu">
      <button class="item" data-ir="historico">📋 Histórico completo</button>
      <button class="item" data-ir="calendario">📅 Calendário</button>
      <button class="item" data-ir="relatorio">📄 Relatório para a consulta</button>
      <button class="item" data-ir="peso">⚖ Peso</button>
      <button class="item" id="m-ics">⏰ Lembrete no calendário do celular</button>
      <button class="item" data-ir="config">💊 Meu medicamento</button>
      <button class="item" data-ir="sus">🏥 Guia SUS</button>
      <button class="item" data-ir="avisos">📢 Avisos e novidades</button>
      <button class="item" data-ir="privacidade">🔒 Privacidade e meus dados</button>
      <button class="item" data-ir="sobre">ⓘ Sobre e aviso legal</button>
    </div>
    <p class="suave">O lembrete é um evento no calendário do seu celular, com alarme na hora prevista. Se mudar a data ou aplicar em outro dia, baixe-o de novo para ele acompanhar.</p>
    <p class="suave">Versão do conteúdo: ${dataConteudo(C.versao)}</p>`;
  ECRAS.mais.depois = () => $("#m-ics").onclick = baixarICS;

  function baixarICS() {
    const m = med(); if (!m) return toast("Configure o medicamento primeiro.");
    const p = proxima();
    const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const limpa = s => String(s).replace(/[\\;,]/g, c => "\\" + c).replace(/[\r\n]+/g, " ");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seringa//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      `UID:${m.id}@seringa`, `SEQUENCE:${Math.floor(Date.now() / 1000)}`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(p)}`, `DTEND:${f(new Date(p.getTime() + 15 * 6e4))}`,
      `RRULE:FREQ=DAILY;INTERVAL=${m.intervalo}`, `SUMMARY:Aplicação — ${limpa(m.nome)} (Seringa)`,
      "DESCRIPTION:Lembrete criado pelo Seringa conforme a frequência que você indicou. Depois de aplicar\\, registre no app.",
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Hora da aplicação (Seringa)", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    descarregar(new Blob([ics], { type: "text/calendar" }), "lembrete-seringa.ics");
    toast("Abra o arquivo para adicionar ao calendário ✓");
  }
  function descarregar(blob, nome) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  ECRAS.historico = () => `
    <h1>Histórico</h1>
    <p class="suave">Tudo o que registrou, do mais recente para o mais antigo.</p>
    <div class="cartao">${linhaTempo(0, true)}</div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.historico.depois = () => document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (!b.dataset.conf) { b.dataset.conf = 1; b.textContent = "confirmar?"; return; }
    const [tipo, rid] = b.dataset.del.split(":");
    if (!["aplicacoes", "sintomas", "pesos"].includes(tipo)) return;
    D[tipo] = D[tipo].filter(x => x.id !== rid); gravar(); toast("Apagado."); ir("historico");
  });

  ECRAS.relatorio = () => {
    const m = med(), ap = D.aplicacoes.slice().sort((a, b) => a.quando.localeCompare(b.quando));
    const desde = new Date(Date.now() - 90 * 864e5);
    const sint = D.sintomas.filter(s => new Date(s.quando) >= desde);
    const cont = {}; sint.forEach(s => cont[s.tipo] = (cont[s.tipo] || 0) + 1);
    return `
    <h1>Relatório para a consulta</h1>
    <p class="suave no-print">Mostre no celular ou toque em «Salvar em PDF / imprimir».</p>
    <div class="cartao">
      <p><strong>Medicamento:</strong> ${esc(m.nome)}${m.categoria ? " (" + esc(nomeCat(m.categoria)) + ")" : ""} — ${esc(descFreq(m))}, conforme informado pelo paciente</p>
      <p><strong>Aplicações registradas:</strong> ${ap.length}${ap.length ? ` (de ${diaBR(ap[0].quando)} a ${diaBR(ap[ap.length - 1].quando)})` : ""}</p>
      <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    </div>
    <h2>Últimas aplicações</h2>
    <div class="cartao"><table class="tabela"><thead><tr><th>Data</th><th>Local</th><th>Obs.</th></tr></thead><tbody>
      ${ap.slice(-12).reverse().map(a => `<tr><td>${new Date(a.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td>${esc(nomeLocal(a.local))}</td><td>${esc(a.nota)}</td></tr>`).join("") || "<tr><td colspan=3>—</td></tr>"}
    </tbody></table>${ap.length > 12 ? `<p class="suave">Mostrando as 12 mais recentes de ${ap.length}. O histórico completo está no app.</p>` : ""}</div>
    <h2>Sintomas anotados (últimos 90 dias)</h2>
    <div class="cartao">${Object.keys(cont).length ? `<ul>${Object.entries(cont).map(([k, v]) => `<li>${esc(nomeSint(k))}: ${v} registro(s)</li>`).join("")}</ul>` : "<p>Nenhum.</p>"}
      ${linhaTempo(15)}</div>
    ${D.pesos.length ? `<h2>Peso</h2><div class="cartao"><ul>${D.pesos.slice(-8).map(p => `<li>${diaBR(p.quando)}: ${String(p.kg).replace(".", ",")} kg</li>`).join("")}</ul></div>` : ""}
    <h2>Minhas dúvidas para o médico</h2>
    <div class="cartao"><label for="duvidas" class="so-leitor">Minhas dúvidas</label><textarea id="duvidas" maxlength="2000" placeholder="Escreva aqui suas perguntas...">${esc(D.duvidas || "")}</textarea></div>
    <p class="suave">Registros feitos pelo próprio paciente no app Seringa. Não constitui avaliação clínica.</p>
    <button class="btn no-print" id="imprimir">Salvar em PDF / imprimir</button>
    <button class="btn sec no-print" data-ir="mais">Voltar</button>`;
  };
  ECRAS.relatorio.depois = () => {
    $("#duvidas").oninput = e => { D.duvidas = e.target.value.slice(0, 2000); gravar(); };
    $("#imprimir").onclick = () => window.print();
  };

  ECRAS.peso = () => `
    <h1>Peso</h1>
    <div class="cartao">
      <label for="p-kg">Peso de hoje (kg)</label>
      <input id="p-kg" type="text" inputmode="decimal" placeholder="Ex.: 82,5">
      <button class="btn" id="p-ok">Salvar</button>
    </div>
    <div class="cartao"><ul class="lista">${D.pesos.slice().reverse().map(p => `<li><span>${String(p.kg).replace(".", ",")} kg</span><span class="suave">${diaBR(p.quando)}</span></li>`).join("") || `<li class="suave">Sem registros.</li>`}</ul></div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.peso.depois = () => $("#p-ok").onclick = () => {
    const kg = parseFloat(String($("#p-kg").value).replace(",", "."));
    if (!(kg >= 20 && kg <= 400)) return toast("Indique um peso válido.");
    D.pesos.push({ id: id(), quando: new Date().toISOString(), kg: Math.round(kg * 10) / 10 }); gravar(); toast("Salvo ✓"); ir("peso");
  };

  ECRAS.sus = () => `
    <h1>Guia SUS</h1>
    <div class="cartao">${C.sus.map(p => `<p>${esc(p)}</p>`).join("")}<p class="fonte">Fonte: ${fonteHTML(["ms"])}</p></div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.avisos = () => `
    <h1>Avisos e novidades</h1>
    ${C.avisos.slice().sort((a, b) => b.data.localeCompare(a.data)).map(a => `<div class="cartao"><p class="suave">${dataConteudo(a.data)}</p>
      <p><strong>${esc(a.titulo)}</strong></p><p>${esc(a.texto)}</p>${a.fonte ? `<p class="fonte">Fonte: ${fonteHTML([a.fonte])}</p>` : ""}</div>`).join("")}
    <button class="btn sec" data-ir="mais">Voltar</button>`;

  ECRAS.privacidade = () => {
    const modo = Armazem.modo;
    const estado = modo === "idb" ? "Salvos no aparelho (IndexedDB), criptografados com uma chave criada neste aparelho."
      : modo === "local" ? "Este navegador não permite salvar com criptografia: os dados estão no aparelho, mas sem criptografia."
      : modo === "erro" ? "Não foi possível ler os dados salvos. Nada foi apagado." : "Este navegador não permite salvar dados: os registros serão perdidos ao fechar.";
    return `
    <h1>Privacidade e meus dados</h1>
    <div class="cartao">
      <p><strong>Estado:</strong> ${esc(estado)}</p>
    </div>
    <div class="cartao">
      <h2>O que o Seringa guarda</h2>
      <p>Só o que você escreve: nome e frequência do medicamento, aplicações (data, hora, local, observação), sintomas, peso e as suas dúvidas para o médico. Não pedimos nome, CPF, endereço, e-mail nem telefone.</p>
      <h2>Para quê</h2>
      <p>Exclusivamente para organizar o seu tratamento no seu celular: lembrar, mostrar o histórico e montar o relatório para a consulta.</p>
      <h2>Onde ficam</h2>
      <p>Apenas neste aparelho. O Seringa não tem servidor de dados: não envia, não vende e não compartilha os seus dados de saúde, e não tem publicidade nem rastreadores. A BFAVORE não tem acesso aos seus registros.</p>
      <h2>Segurança</h2>
      <p>Os registros são salvos com criptografia (AES-GCM), com uma chave que não sai deste aparelho. Isto protege contra a leitura direta dos arquivos do navegador, mas <strong>quem usar o seu celular desbloqueado consegue abrir o app e ver os registros</strong>. Use bloqueio de tela.</p>
      <h2>Os seus direitos</h2>
      <p>Pode, a qualquer momento, baixar uma cópia de todos os seus dados, restaurá-la em outro aparelho e apagar tudo.</p>
      <p class="suave">Atenção: a cópia baixada é um arquivo comum (sem criptografia). Guarde-a em local seguro. Se limpar os dados do navegador ou trocar de celular sem cópia, os registros são perdidos. Backup na nuvem ainda não existe.</p>
    </div>
    <button class="btn sec" id="v-exp">Baixar uma cópia dos meus dados</button>
    <label class="btn sec" for="v-imp">Restaurar uma cópia</label>
    <input type="file" id="v-imp" accept="application/json,.json" class="so-leitor">
    <button class="btn perigo" id="v-del">Apagar todos os meus dados</button>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  };
  ECRAS.privacidade.depois = () => {
    $("#v-exp").onclick = () => {
      const copia = { app: "seringa", formato: 1, exportadoEm: new Date().toISOString(), dados: D };
      descarregar(new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" }), "seringa-meus-dados.json");
    };
    $("#v-imp").onchange = async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try {
        if (f.size > 5e6) throw new Error("grande");
        const novo = validarCopia(JSON.parse(await f.text()));
        const temDados = D.aplicacoes.length || D.sintomas.length || D.pesos.length;
        if (temDados && !confirm("Restaurar a cópia vai substituir os registros atuais deste aparelho. Continuar?")) { e.target.value = ""; return; }
        D = Object.assign(vazio(), novo); gravar(); toast(`Cópia restaurada ✓ (${D.aplicacoes.length} aplicações)`); ir("hoje");
      } catch (x) { toast("Este arquivo não é uma cópia válida do Seringa."); e.target.value = ""; }
    };
    $("#v-del").onclick = async e => {
      if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = "Tocar de novo para apagar tudo"; return; }
      D = vazio(); await Armazem.apagar(); toast("Dados apagados."); ir("boasvindas");
    };
  };
  ECRAS.sobre = () => `
    <h1>Sobre o Seringa</h1>
    <div class="cartao">
      <p>O Seringa ajuda quem usa medicamentos injetáveis a organizar o tratamento e a lidar com as mudanças do dia a dia, com informação de fonte oficial. Um produto BFAVORE.</p>
      <p><strong>Aviso:</strong> o Seringa não calcula nem orienta doses, não faz diagnóstico, não interpreta imagens e não substitui o médico. Use o medicamento somente com prescrição e acompanhamento profissional. Em caso de urgência, ligue 192 (SAMU).</p>
      <p><a href="../">Visitar o site do Seringa</a></p>
    </div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;

  // ---------- navegação ----------
  document.addEventListener("click", ev => {
    const a = ev.target.closest("[data-ir]");
    if (a) { ev.preventDefault(); ir(a.dataset.ir); return; }
    const b = ev.target.closest(".abas button");
    if (b) ir(b.dataset.ecra);
  });
  $("#btn-ajuda").onclick = () => ir(D.aviso ? "sobre" : "boasvindas");

  // ---------- offline + atualização ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(reg => {
      const mostrar = w => { $("#atualizar").hidden = false; $("#btn-atualizar").onclick = () => w.postMessage("atualizar"); };
      if (reg.waiting && navigator.serviceWorker.controller) mostrar(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) mostrar(w); });
      });
    }).catch(() => { /* sem SW: o app continua a funcionar online */ });
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recarregou && $("#atualizar").hidden === false) { recarregou = true; location.reload(); } });
  }

  // ---------- arranque ----------
  Armazem.iniciar().then(dados => {
    if (dados) { try { D = Object.assign(vazio(), dados); } catch (e) { D = vazio(); } }
    document.body.classList.remove("a-carregar");
    if (Armazem.modo === "erro") { D.aviso = true; ir("privacidade"); toast("Não foi possível ler os dados salvos."); return; }
    ir(location.hash.slice(1) || "hoje");
  });
})();
