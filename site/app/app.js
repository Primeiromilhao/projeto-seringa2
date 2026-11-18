/* Seringa — app (PWA, offline, dados só no aparelho). Fonte única: site/app/ (navegador, iPhone e APK Android).
   Regras do produto: organiza, lembra e informa. NUNCA calcula, converte, sugere, confirma ou avalia doses.
   Não diagnostica, não faz triagem, não interpreta imagens, não usa IA, não recomenda tratamento nem local de aplicação.
   Avisos de sinais graves são textos fixos da bula, sem combinação de sintomas. */
(function () {
  "use strict";
  const C = window.SERINGA_CONTEUDO || { efeitos: [], alertas: [], avisos: [], sus: [], fontes: {}, medicamentos: {} };
  const VERSAO_APP = "1.1.0";
  const CHAVE_LOCAL = "seringa.v1"; // formato antigo (localStorage), migrado para IndexedDB

  // ---------- vocabulário ----------
  const PARTES = [["abd", "Abdômen"], ["cox", "Coxa"], ["bra", "Braço"], ["out", "Outro"]];
  const LADOS = [["e", "Esquerdo"], ["d", "Direito"]];
  const LOCAIS = PARTES.flatMap(p => LADOS.map(l => p[0] + "-" + l[0]));
  const nomeLocal = k => {
    const [p, l] = String(k).split("-"), parte = (PARTES.find(x => x[0] === p) || [, "Local"])[1];
    if (p === "out") return "Outro local" + (l ? (l === "e" ? " (esquerdo)" : " (direito)") : "");
    const fem = p === "cox";
    return parte + " " + (l === "e" ? (fem ? "esquerda" : "esquerdo") : (fem ? "direita" : "direito"));
  };
  // [id, nome, índice do aviso fixo da bula (só nos sinais de alerta)]
  const SINTOMAS = [
    ["enjoo", "Náusea / enjoo"], ["vomito", "Vômito"], ["diarreia", "Diarreia"], ["prisao", "Prisão de ventre"],
    ["refluxo", "Refluxo / azia"], ["cansaco", "Cansaço"], ["local", "Dor ou vermelhidão no local"],
    ["apetite", "Menos apetite"], ["outro", "Outro"],
    ["dor-forte", "Dor forte na barriga que não passa", 0],
    ["vomito-continuo", "Vômitos ou diarreia que não param", 3],
    ["alergia", "Inchaço no rosto/lábios ou falta de ar", 1]
  ];
  const INTENSIDADES = ["leve", "moderada", "forte"];
  const MEDIDAS = [["cintura", "Cintura"], ["quadril", "Quadril"], ["braco", "Braço"], ["coxa", "Coxa"]];
  const CATEGORIAS = [["glp1", "Caneta GLP-1 / GIP (diabetes ou obesidade)"], ["insulina", "Insulina"],
    ["fertilidade", "Fertilidade"], ["anticoagulante", "Anticoagulante"], ["vitamina", "Vitamina (ex.: B12)"], ["outro", "Outro"]];
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const DIAS_C = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const MESES_C = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  // ---------- utilidades ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const diaBR = d => new Date(d).toLocaleDateString("pt-BR");
  const horaBR = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dataCurta = d => { const x = new Date(d); return `${DIAS_C[x.getDay()]}, ${x.getDate()} de ${MESES_C[x.getMonth()]}`; };
  const dataHora = d => `${dataCurta(d)} • ${horaBR(d)}`;
  const mesAno = d => { const x = new Date(d); return MESES[x.getMonth()][0].toUpperCase() + MESES[x.getMonth()].slice(1) + " de " + x.getFullYear(); };
  const dataConteudo = s => new Date(s + "T12:00:00").toLocaleDateString("pt-BR"); // meio-dia local: sem desvio de fuso
  const diaChave = d => { const x = new Date(d); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); };
  const num = (v, c) => String(Math.round(v * 10) / 10).replace(".", ",") + (c ? " " + c : "");
  const sinal = v => (v > 0 ? "+" : v < 0 ? "−" : "") + num(Math.abs(v));
  const nomeSint = k => { const s = SINTOMAS.find(x => x[0] === k); return s ? s[1] : k; };
  const nomeCat = k => { const c = CATEGORIAS.find(x => x[0] === k); return c ? c[1] : ""; };
  const nomeMedida = k => { const m = MEDIDAS.find(x => x[0] === k); return m ? m[1] : k; };
  const ehAlerta = k => { const s = SINTOMAS.find(x => x[0] === k); return !!s && s[2] !== undefined; };
  function paraInput(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); }
  function toast(t) { const el = $("#aviso-toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2800); }
  function fonteHTML(ks) {
    return (ks || []).map(k => C.fontes[k]).filter(Boolean)
      .map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(" · ");
  }

  // ---------- ícones (desenho próprio, traço) ----------
  const P = {
    casa: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    historico: '<path d="M8 3h8l1 2h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2z"/><path d="M8 12l2.5 2.5L16 9"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    relatorio: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
    corpo: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    jornada: '<path d="M6 20v-6M12 20V8M18 20V4"/>',
    balanca: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8 10a5 5 0 0 1 8 0"/><path d="M12 10l1.5-2"/>',
    pulso: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    sino: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    livro: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
    megafone: '<path d="M3 10v4h4l7 4V6l-7 4z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    exportar: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    importar: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
    lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    direita: '<path d="M9 6l6 6-6 6"/>',
    voltar: '<path d="M15 6l-6 6 6 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    seringa: '<path d="M18 2l4 4M20 4l-4 4"/><path d="M15 5l4 4L9 19l-4 1 1-4z"/><path d="M11 9l2 2M8 12l2 2M5 19l-3 3"/>',
    pilula: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="M8 8l8 8"/>',
    hospital: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 8v6M9 11h6"/>',
    estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    regua: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    sobre: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17v.5"/>'
  };
  const ico = (n, cls) => `<svg class="ico ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n] || ""}</svg>`;

  // ---------- armazenamento: IndexedDB com criptografia AES-GCM (Web Crypto) ----------
  // A chave é gerada no aparelho como NÃO-exportável e guardada no IndexedDB. Os registros ficam cifrados em repouso.
  // Limite (documentado na Privacidade): quem tiver acesso ao celular desbloqueado e ao app consegue ver os dados.
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

  // ---------- plataforma: navegador, app Android (ponte nativa) ou iPhone (PWA) ----------
  // No Android, a ponte "SeringaAndroid" dá acesso a recursos do sistema (salvar arquivo, calendário, notificação,
  // imprimir/PDF). Não decide nada sobre o tratamento.
  const NATIVO = window.SeringaAndroid && typeof window.SeringaAndroid.plataforma === "function" ? window.SeringaAndroid : null;
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const INSTALADO = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if (NATIVO) document.documentElement.classList.add("nativo-android");
  // Android com WebView antigo: o sistema está escuro mas a página não recebe prefers-color-scheme: dark.
  // Ativa as mesmas regras escuras da folha de estilo (CSSOM, sem estilos inline).
  try {
    if (NATIVO && typeof NATIVO.modoNoturno === "function" && NATIVO.modoNoturno() && !matchMedia("(prefers-color-scheme: dark)").matches) {
      Array.from(document.styleSheets).forEach(folha => {
        const escuras = Array.from(folha.cssRules).filter(r => r.media && /prefers-color-scheme:\s*dark/.test(r.media.mediaText));
        escuras.forEach(m => Array.from(m.cssRules).forEach(r => folha.insertRule(r.cssText, folha.cssRules.length)));
      });
      document.documentElement.classList.add("escuro-forcado");
    }
  } catch (e) { /* mantém o tema claro */ }

  function vazio() { return { aviso: false, perfil: { nome: "" }, prefs: { lembretes: true }, meds: [], aplicacoes: [], sintomas: [], pesos: [], medidas: [], duvidas: "" }; }
  let D = vazio();
  function normalizar(d) {
    const v = Object.assign(vazio(), d || {});
    v.perfil = Object.assign({ nome: "" }, v.perfil); v.prefs = Object.assign({ lembretes: true }, v.prefs);
    ["meds", "aplicacoes", "sintomas", "pesos", "medidas"].forEach(k => { if (!Array.isArray(v[k])) v[k] = []; });
    return v;
  }
  function gravar() { if (Armazem.modo === "erro") return toast("Os dados não puderam ser lidos; nada foi alterado."); Armazem.guardar(D); sincronizarLembrete(); }
  // Android: notificação local na data/hora da próxima aplicação, obtida só a partir do que a pessoa indicou.
  function sincronizarLembrete() {
    if (!NATIVO) return;
    try {
      const m = med(), p = m && proxima();
      if (D.prefs.lembretes && p && p.getTime() > Date.now()) NATIVO.agendarLembrete(p.getTime(), "Seringa — lembrete", `Hora da aplicação de ${m.nome}, conforme você indicou. Depois de aplicar, registre no app.`);
      else NATIVO.cancelarLembrete();
    } catch (e) { /* sem ponte */ }
  }

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
    return normalizar({
      aviso: true, meds,
      perfil: { nome: txt(d.perfil && d.perfil.nome, 40).trim() },
      prefs: { lembretes: !(d.prefs && d.prefs.lembretes === false) },
      aplicacoes: arr("aplicacoes").filter(a => a && iso(a.quando) && LOCAIS.includes(a.local)).map(a => ({ id: txt(a.id, 40) || id(), medId: txt(a.medId, 40),
        quando: new Date(a.quando).toISOString(), criadoEm: iso(a.criadoEm) ? new Date(a.criadoEm).toISOString() : new Date(a.quando).toISOString(), local: a.local, nota: txt(a.nota, 200) })),
      sintomas: arr("sintomas").filter(s => s && iso(s.quando) && SINTOMAS.some(x => x[0] === s.tipo)).map(s => ({ id: txt(s.id, 40) || id(),
        quando: new Date(s.quando).toISOString(), tipo: s.tipo, intensidade: INTENSIDADES.includes(s.intensidade) ? s.intensidade : "", nota: txt(s.nota, 200) })),
      pesos: arr("pesos").filter(p => p && iso(p.quando) && typeof p.kg === "number" && p.kg >= 20 && p.kg <= 400).map(p => ({ id: txt(p.id, 40) || id(), quando: new Date(p.quando).toISOString(), kg: Math.round(p.kg * 10) / 10 })),
      medidas: arr("medidas").filter(m => m && iso(m.quando) && MEDIDAS.some(x => x[0] === m.tipo) && typeof m.cm === "number" && m.cm >= 10 && m.cm <= 300)
        .map(m => ({ id: txt(m.id, 40) || id(), quando: new Date(m.quando).toISOString(), tipo: m.tipo, cm: Math.round(m.cm * 10) / 10 })),
      duvidas: txt(d.duvidas, 2000)
    });
  }

  // ---------- regras do lembrete (só agenda o que a pessoa indicou; nada é decidido pelo app) ----------
  const med = () => D.meds[0];
  const ordenadas = () => D.aplicacoes.slice().sort((a, b) => b.quando.localeCompare(a.quando) || String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
  const ultimaAplic = () => ordenadas()[0];
  function proxima() {
    const m = med(); if (!m) return null;
    const u = ultimaAplic();
    // A data indicada pela pessoa vale se foi definida depois do registro mais recente; senão conta a partir da última aplicação.
    const ultimoCriado = D.aplicacoes.reduce((mx, a) => Math.max(mx, new Date(a.criadoEm || a.quando).getTime()), 0);
    if (!u || new Date(m.ajustadoEm || 0).getTime() >= ultimoCriado) return new Date(m.primeira);
    const d = new Date(u.quando); d.setDate(d.getDate() + m.intervalo);
    const [h, mi] = (m.hora || "09:00").split(":"); d.setHours(+h, +mi, 0, 0);
    return d;
  }
  function descFreq(m) {
    if (m.intervalo === 7) { const p = proxima(); return `uma vez por semana (próxima: ${DIAS[p.getDay()]})`; }
    if (m.intervalo === 1) return "todos os dias";
    return `a cada ${m.intervalo} dias`;
  }
  function faltam(p) {
    const h0 = new Date(); h0.setHours(0, 0, 0, 0); const p0 = new Date(p); p0.setHours(0, 0, 0, 0);
    const d = Math.round((p0 - h0) / 864e5);
    return d === 0 ? "É hoje" : d === 1 ? "Amanhã" : d > 1 ? `Faltam ${d} dias` : "Data prevista já passou";
  }
  function guiaDoMed() { // conteúdo revisado só para o medicamento configurado
    const m = med(); if (!m) return null;
    const n = m.nome.toLowerCase();
    return Object.keys(C.medicamentos || {}).find(k => C.medicamentos[k].termos.some(t => n.includes(t))) || null;
  }

  // ---------- navegação ----------
  const ECRAS = {};
  const SEM_MED = ["config", "efeitos", "mais", "sus", "avisos", "privacidade", "sobre", "premium"];
  const ABA = { hoje: "hoje", corpo: "hoje", evolucao: "hoje", sintomas: "hoje", lembretes: "hoje", calendario: "hoje",
    jornada: "jornada", detalhe: "jornada", registrar: "registrar", relatorio: "relatorio" };
  let calMes = 0, atual = "", pilha = [];
  function ir(nome, arg, semPilha) {
    if (!Object.prototype.hasOwnProperty.call(ECRAS, nome) || typeof ECRAS[nome] !== "function") nome = "hoje";
    if (!D.aviso) nome = "boasvindas";
    else if (!med() && !SEM_MED.includes(nome)) nome = "config";
    if (!semPilha && atual && atual !== nome) pilha.push([atual, ECRAS[atual] && ECRAS[atual].arg]);
    if (["hoje", "jornada", "registrar", "relatorio", "mais", "boasvindas"].includes(nome) && !semPilha) pilha = nome === "hoje" ? [] : [["hoje"]];
    if (pilha.length > 20) pilha = pilha.slice(-20);
    atual = nome; ECRAS[nome].arg = arg;
    $("#ecra").innerHTML = ECRAS[nome](arg);
    $("#ecra").dataset.ecra = nome;
    const aba = ABA[nome] || "mais";
    $$(".abas button").forEach(b => { const at = b.dataset.ecra === aba; b.classList.toggle("ativa", at); if (at) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.body.classList.toggle("sem-abas", nome === "boasvindas" || (nome === "config" && !med()));
    window.scrollTo(0, 0);
    if (ECRAS[nome].depois) ECRAS[nome].depois(arg);
    $("#ecra").focus({ preventScroll: true });
  }
  function voltar() { const v = pilha.pop(); if (v) ir(v[0], v[1], true); else ir("hoje", null, true); }
  const cab = (titulo, semVoltar) => `<header class="cab">${semVoltar ? "<span></span>" : `<button class="voltar" data-voltar aria-label="Voltar">${ico("voltar")}</button>`}<h1>${esc(titulo)}</h1><span></span></header>`;
  const linhaMenu = (icone, texto, attrs, extra) => `<button class="linha" ${attrs}>${ico(icone, "lico")}<span class="ltxt">${texto}</span>${extra || ""}${ico("direita", "seta")}</button>`;

  // ================= BOAS-VINDAS E CONFIGURAÇÃO =================
  ECRAS.boasvindas = () => `
    <div class="logo-grande">${ico("seringa", "logo-ico")}<span>Seringa</span></div>
    <h1 class="titulo-grande">Organize o seu tratamento com mais simplicidade.</h1>
    <div class="cartao">
      <p class="item-ico">${ico("check")}<span>Registre cada aplicação em segundos e saiba sempre quando é a próxima.</span></p>
      <p class="item-ico">${ico("corpo")}<span>Veja no mapa do corpo onde você já registrou aplicações.</span></p>
      <p class="item-ico">${ico("jornada")}<span>Acompanhe a sua jornada: aplicações, sintomas, peso e medidas.</span></p>
      <p class="item-ico">${ico("relatorio")}<span>Leve um relatório organizado para a consulta.</span></p>
    </div>
    <div class="cartao aviso-legal">
      <p>O Seringa <strong>organiza, lembra e informa</strong>. <strong>Não calcula nem orienta doses</strong>, não faz diagnóstico e <strong>não substitui o médico</strong>. Use o medicamento somente com prescrição e acompanhamento profissional.</p>
      <p>${ico("escudo", "mini-ico")} Seus dados ficam <strong>só neste aparelho</strong>, salvos com criptografia. <button class="link-txt" data-ir="privacidade">Saiba mais</button></p>
    </div>
    ${IOS && !INSTALADO && !NATIVO ? `<div class="cartao destaque" id="dica-ios">
      <p><strong>Use como app no iPhone</strong></p>
      <p>No Safari, toque em <strong>Compartilhar</strong> (quadrado com seta) e em <strong>Adicionar à Tela de Início</strong>. Depois abra o Seringa pelo ícone.</p>
      <p class="suave">O app instalado guarda os dados separados desta aba do Safari: comece a registrar já no app instalado.</p>
    </div>` : ""}
    <button class="btn" id="aceitar">Começar</button>`;
  ECRAS.boasvindas.depois = () => $("#aceitar").onclick = () => {
    D.aviso = true; gravar();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
    try { if (NATIVO) NATIVO.pedirNotificacoes(); } catch (e) { /* opcional */ }
    ir("config");
  };

  ECRAS.config = () => {
    const m = med() || {};
    const amanha = new Date(Date.now() + 864e5); amanha.setHours(9, 0, 0, 0);
    const prox = m.id ? paraInput(proxima()) : paraInput(amanha);
    const outro = m.id && ![1, 7].includes(m.intervalo);
    return `${m.id ? cab("Meu medicamento") : `<header class="cab"><span></span><h1>Vamos configurar</h1><span></span></header>`}
    <p class="suave">Preencha conforme o que o seu médico prescreveu. O Seringa só usa estes dados para lembrar você.</p>
    <div class="cartao form">
      <label for="c-pessoa">Como quer ser chamado(a)? <span class="opc">(opcional)</span></label>
      <input id="c-pessoa" maxlength="40" autocomplete="off" placeholder="Ex.: Ana" value="${esc(D.perfil.nome)}">
      <label for="c-nome">Nome do medicamento</label>
      <input id="c-nome" list="sug" placeholder="Ex.: Mounjaro" maxlength="80" autocomplete="off" value="${esc(m.nome || "")}">
      <datalist id="sug"><option value="Mounjaro"><option value="Ozempic"><option value="Wegovy"><option value="Insulina"></datalist>
      <label for="c-cat">Tipo <span class="opc">(opcional)</span></label>
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
      <p class="suave">Depois de cada registro, a próxima data passa a contar a partir da aplicação registrada. Se mudar a data aqui, ela passa a valer.</p>
    </div>
    <div class="cartao premium-nota">${ico("estrela", "mini-ico")} <span>Vários medicamentos e perfis da família chegam no <strong>Seringa Premium</strong>. <button class="link-txt" data-ir="premium">Saiba mais</button></span></div>
    <button class="btn" id="c-gravar">Salvar</button>`;
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
      if (!p) return toast("Informe a data da próxima aplicação.");
      const ant = med(), u = ultimaAplic(), mudouData = !ant || p !== inicial;
      if (mudouData && u && new Date(p) <= new Date(u.quando)) return toast(`A próxima aplicação tem de ser depois da última registrada (${diaBR(u.quando)}).`);
      const m = ant || { id: id() };
      Object.assign(m, { nome, intervalo, categoria: $("#c-cat").value });
      if (mudouData) Object.assign(m, { primeira: new Date(p).toISOString(), hora: p.slice(11, 16), ajustadoEm: new Date().toISOString() });
      D.meds = [m]; D.perfil.nome = $("#c-pessoa").value.trim().slice(0, 40); gravar();
      toast(ant && mudouData ? "Salvo ✓ Se usa o lembrete no calendário, adicione-o de novo." : "Salvo ✓");
      ir("hoje");
    };
  };

  // ================= INÍCIO =================
  function alertaHTML(tipo) {
    if (!ehAlerta(tipo)) return "";
    const idx = SINTOMAS.find(x => x[0] === tipo)[2];
    if (guiaDoMed() === "mounjaro") {
      return `<div class="alerta" role="alert">${ico("alerta", "mini-ico")}<div><strong>Atenção:</strong> ${esc(C.alertas[idx] || C.alertaGeral)}
        <p class="fonte">Fonte: ${fonteHTML(["bula"])}</p></div></div>`;
    }
    return `<div class="alerta" role="alert">${ico("alerta", "mini-ico")}<div><strong>Atenção:</strong> ${esc(C.alertaGeral || "Procure atendimento médico. Em urgência, ligue 192 (SAMU).")}
      <p class="fonte">${fonteHTML(["bulario"])}</p></div></div>`;
  }

  ECRAS.hoje = () => {
    const m = med(), p = proxima(), u = ultimaAplic(), agora = new Date();
    const alertaRecente = D.sintomas.find(s => ehAlerta(s.tipo) && (agora - new Date(s.quando)) < 3 * 864e5);
    return `
    <header class="topo-home"><div class="logo">${ico("seringa", "logo-ico")}<span>Seringa</span></div></header>
    <h1 class="ola">Olá${D.perfil.nome ? ", " + esc(D.perfil.nome) : ""}!</h1>
    ${alertaRecente ? alertaHTML(alertaRecente.tipo) : ""}
    <button class="cartao-principal" data-ir="lembretes" aria-label="Próxima aplicação: ${esc(dataHora(p))}. Abrir lembretes">
      ${ico("calendario", "cp-ico")}
      <span class="cp-txt"><span class="cp-rotulo">Próxima aplicação</span>
      <span class="cp-data">${esc(dataHora(p))}</span>
      <span class="cp-faltam">${faltam(p)}</span></span>
    </button>
    <div class="cartao ultima">
      ${ico("check", "ul-ico")}
      <div><p class="rotulo">Última aplicação</p>
      ${u ? `<p class="forte">${esc(dataCurta(u.quando))}</p><p>${esc(nomeLocal(u.local))}</p>` : `<p class="suave">Ainda não registrou nenhuma aplicação.</p>`}</div>
    </div>
    <button class="btn" data-ir="registrar" id="h-registrar">Registrar aplicação</button>
    <div class="grade">
      <button class="bloco" data-ir="corpo">${ico("corpo")}<span>Meu corpo</span></button>
      <button class="bloco" data-ir="jornada">${ico("jornada")}<span>Minha jornada</span></button>
      <button class="bloco" data-ir="evolucao">${ico("balanca")}<span>Peso e medidas</span></button>
      <button class="bloco" data-ir="sintomas">${ico("pulso")}<span>Sintomas</span></button>
    </div>
    <p class="suave centro">${esc(m.nome)}: ${esc(descFreq(m))}. <button class="link-txt" data-ir="config">Alterar</button></p>`;
  };

  // ================= REGISTRAR APLICAÇÃO =================
  ECRAS.registrar = () => {
    const u = ultimaAplic();
    return `${cab("Registrar aplicação")}
    <p class="suave">${esc(med().nome)}${u ? ` · última: ${esc(nomeLocal(u.local))}, ${esc(dataCurta(u.quando))}` : ""}</p>
    <label for="r-quando" class="rot">Data e hora</label>
    <div class="campo-ico">${ico("calendario")}<input id="r-quando" type="datetime-local" value="${paraInput(new Date())}"></div>
    <p class="rot" id="l-parte">Local da aplicação</p>
    <div class="segmentos s4" role="radiogroup" aria-labelledby="l-parte">
      ${PARTES.map((p, i) => `<button class="seg" role="radio" data-parte="${p[0]}" aria-checked="${i === 0}">${p[1]}</button>`).join("")}
    </div>
    <p class="rot" id="l-lado">Lado</p>
    <div class="segmentos s2" role="radiogroup" aria-labelledby="l-lado">
      ${LADOS.map((l, i) => `<button class="seg" role="radio" data-lado="${l[0]}" aria-checked="${i === 0}">${l[1]}</button>`).join("")}
    </div>
    <label for="r-nota" class="rot">Observações <span class="opc">(opcional)</span></label>
    <textarea id="r-nota" maxlength="200" placeholder="Ex.: sem reações hoje."></textarea>
    <button class="btn" id="r-ok">Salvar</button>`;
  };
  function segmentos(attr) {
    $$(`[data-${attr}]`).forEach(b => b.onclick = () => { $$(`[data-${attr}]`).forEach(x => x.setAttribute("aria-checked", "false")); b.setAttribute("aria-checked", "true"); });
    return () => { const s = $(`[data-${attr}][aria-checked="true"]`); return s ? s.dataset[attr] : null; };
  }
  ECRAS.registrar.depois = () => {
    const parte = segmentos("parte"), lado = segmentos("lado");
    $("#r-ok").onclick = () => {
      const q = $("#r-quando").value;
      if (!q) return toast("Informe a data e a hora.");
      if (new Date(q) > new Date(Date.now() + 5 * 6e4)) return toast("A data não pode ser no futuro.");
      const local = parte() + "-" + lado();
      if (!LOCAIS.includes(local)) return toast("Escolha o local da aplicação.");
      D.aplicacoes.push({ id: id(), medId: med().id, quando: new Date(q).toISOString(), criadoEm: new Date().toISOString(), local, nota: $("#r-nota").value.trim() });
      gravar(); toast("Aplicação registrada ✓"); ir("hoje");
    };
  };

  // ================= MEU CORPO =================
  // Só apresenta os registros da própria pessoa. Não recomenda onde aplicar.
  const ZONAS = { // vista de frente: o lado esquerdo da pessoa aparece à direita do desenho
    "abd-d": [76, 150, 22, 36], "abd-e": [102, 150, 22, 36],
    "cox-d": [74, 236, 22, 52], "cox-e": [104, 236, 22, 52],
    "bra-d": [44, 104, 13, 42], "bra-e": [143, 104, 13, 42]
  };
  function svgCorpo() {
    const ord = ordenadas(), ult = ord[0] && ord[0].local, usados = new Set(ord.map(a => a.local));
    const z = Object.keys(ZONAS).map(k => { const [x, y, w, h] = ZONAS[k];
      const cls = k === ult ? "z-ultima" : usados.has(k) ? "z-usado" : "z-livre";
      return `<rect class="zona ${cls}" data-zona="${k}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"><title>${esc(nomeLocal(k))}</title></rect>`; }).join("");
    return `<svg class="corpo-svg" viewBox="0 0 200 400" role="img" aria-label="Mapa do corpo com os locais registrados">
      <g class="silhueta" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
        <circle cx="100" cy="38" r="22"/>
        <path d="M92 59v12M108 59v12"/>
        <path d="M72 78Q100 68 128 78L134 112L130 200L132 214Q100 228 68 214L70 200L66 112Z"/>
        <path d="M72 80Q58 84 54 100L44 168L40 214L50 216L58 172L67 122"/>
        <path d="M128 80Q142 84 146 100L156 168L160 214L150 216L142 172L133 122"/>
        <path d="M70 212L72 300L77 386L95 386L98 300L100 232"/>
        <path d="M130 212L128 300L123 386L105 386L102 300L100 232"/>
      </g>${z}</svg>`;
  }
  ECRAS.corpo = (aba) => {
    aba = aba === "historico" ? "historico" : "mapa";
    const ord = ordenadas(), ult = ord[0];
    const porLocal = LOCAIS.map(k => ({ k, lista: ord.filter(a => a.local === k) })).filter(x => x.lista.length);
    return `${cab("Meu corpo")}
    <div class="abas-int" role="tablist">
      <button role="tab" data-corpo="mapa" aria-selected="${aba === "mapa"}">Mapa</button>
      <button role="tab" data-corpo="historico" aria-selected="${aba === "historico"}">Histórico</button>
    </div>
    ${aba === "mapa" ? `
    <div class="mapa">
      ${svgCorpo()}
      <ul class="legenda-mapa">
        <li><span class="bolinha b-ultima"></span><span>Última aplicação${ult ? `<br><small>${esc(diaBR(ult.quando).slice(0, 5))}</small>` : ""}</span></li>
        <li><span class="bolinha b-usado"></span><span>Usado (anterior)</span></li>
        <li><span class="bolinha b-livre"></span><span>Sem registro</span></li>
      </ul>
    </div>
    ${ult ? `<div class="cartao"><p class="rotulo">Última aplicação</p><p class="forte">${esc(nomeLocal(ult.local))}</p><p class="suave">${esc(dataHora(ult.quando))}</p></div>` : `<div class="cartao"><p class="suave">Ainda não há aplicações registradas.</p></div>`}
    ${ord.some(a => a.local.startsWith("out")) ? `<p class="suave">«Outro local» não aparece no desenho; veja em Histórico.</p>` : ""}
    <div class="nota-info">${ico("info", "mini-ico")}<p>Este mapa mostra apenas os locais que você registrou, para ajudar a organizar a sua rotina. Ele não indica onde aplicar: siga a orientação do seu médico e da bula.</p></div>`
    : `${porLocal.length ? porLocal.map(x => `<div class="cartao">
        <p class="linha-tit"><strong>${esc(nomeLocal(x.k))}</strong><span class="pilula">${x.lista.length} ${x.lista.length === 1 ? "registro" : "registros"}</span></p>
        <ul class="lista">${x.lista.slice(0, 6).map(a => `<li><span>${esc(dataCurta(a.quando))}</span><span class="suave">${esc(horaBR(a.quando))}</span></li>`).join("")}</ul>
        ${x.lista.length > 6 ? `<p class="suave">e mais ${x.lista.length - 6}…</p>` : ""}</div>`).join("") : `<div class="cartao"><p class="suave">Ainda não há aplicações registradas.</p></div>`}`}`;
  };
  ECRAS.corpo.depois = () => $$("[data-corpo]").forEach(b => b.onclick = () => { ECRAS.corpo.arg = b.dataset.corpo; $("#ecra").innerHTML = ECRAS.corpo(b.dataset.corpo); ECRAS.corpo.depois(); });

  // ================= MINHA JORNADA (linha do tempo) =================
  function eventos() {
    const pesosOrd = D.pesos.slice().sort((a, b) => a.quando.localeCompare(b.quando));
    return [
      ...D.aplicacoes.map(a => ({ tipo: "aplicacoes", id: a.id, q: a.quando, ico: "seringa", cor: "c-ap", t: "Aplicação registrada", s: nomeLocal(a.local), n: a.nota })),
      ...D.sintomas.map(s => ({ tipo: "sintomas", id: s.id, q: s.quando, ico: "pulso", cor: ehAlerta(s.tipo) ? "c-alerta" : "c-si", t: nomeSint(s.tipo) + (s.intensidade ? " — " + s.intensidade : ""), s: ehAlerta(s.tipo) ? "Sinal de alerta anotado" : "Sintoma anotado", n: s.nota })),
      ...pesosOrd.map((p, i) => ({ tipo: "pesos", id: p.id, q: p.quando, ico: "balanca", cor: "c-pe", t: "Peso: " + num(p.kg, "kg"), s: i ? `(${sinal(p.kg - pesosOrd[i - 1].kg)} kg)` : "Primeiro registro", n: "" })),
      ...D.medidas.map(m => ({ tipo: "medidas", id: m.id, q: m.quando, ico: "regua", cor: "c-pe", t: `${nomeMedida(m.tipo)}: ${num(m.cm, "cm")}`, s: "Medida anotada", n: "" }))
    ].sort((a, b) => b.q.localeCompare(a.q));
  }
  ECRAS.jornada = (filtro) => {
    filtro = ["aplicacoes", "sintomas", "peso"].includes(filtro) ? filtro : "tudo";
    const evs = eventos().filter(e => filtro === "tudo" || e.tipo === filtro || (filtro === "peso" && (e.tipo === "pesos" || e.tipo === "medidas")));
    let mes = "", html = "";
    evs.forEach(e => {
      const m = mesAno(e.q); if (m !== mes) { mes = m; html += `<h2 class="mes">${esc(m)}</h2>`; }
      html += `<button class="evento" data-detalhe="${esc(e.tipo)}:${esc(e.id)}">
        <span class="ev-data">${esc(dataCurta(e.q))}</span>
        <span class="ev-corpo"><span class="ev-ico ${e.cor}">${ico(e.ico)}</span><span class="ev-txt"><strong>${esc(e.t)}</strong><span>${esc(e.s)}</span></span>${ico("direita", "seta")}</span>
      </button>`;
    });
    return `${cab("Minha jornada", true)}
    <div class="filtros" role="tablist" aria-label="Filtrar">
      ${[["tudo", "Tudo"], ["aplicacoes", "Aplicações"], ["sintomas", "Sintomas"], ["peso", "Peso"]].map(f => `<button role="tab" data-filtro="${f[0]}" aria-selected="${f[0] === filtro}">${f[1]}</button>`).join("")}
    </div>
    ${html || `<div class="cartao vazio-cartao"><p>Nada registrado ainda.</p><p class="suave">As aplicações, sintomas, peso e medidas que você registrar aparecem aqui, em ordem.</p></div>`}`;
  };
  ECRAS.jornada.depois = () => {
    $$("[data-filtro]").forEach(b => b.onclick = () => { ECRAS.jornada.arg = b.dataset.filtro; $("#ecra").innerHTML = ECRAS.jornada(b.dataset.filtro); ECRAS.jornada.depois(); });
    $$("[data-detalhe]").forEach(b => b.onclick = () => ir("detalhe", b.dataset.detalhe));
  };

  ECRAS.detalhe = (ref) => {
    const [tipo, rid] = String(ref || "").split(":");
    const e = ["aplicacoes", "sintomas", "pesos", "medidas"].includes(tipo) && eventos().find(x => x.tipo === tipo && x.id === rid);
    if (!e) return `${cab("Registro")}<div class="cartao"><p class="suave">Este registro já não existe.</p></div>`;
    return `${cab("Registro")}
    <div class="cartao detalhe">
      <span class="ev-ico grande ${e.cor}">${ico(e.ico)}</span>
      <h2>${esc(e.t)}</h2><p>${esc(e.s)}</p>
      <p class="suave">${esc(dataHora(e.q))}</p>
      ${e.n ? `<p class="nota">${esc(e.n)}</p>` : ""}
      ${tipo === "sintomas" && ehAlerta(D.sintomas.find(s => s.id === rid).tipo) ? alertaHTML(D.sintomas.find(s => s.id === rid).tipo) : ""}
    </div>
    <button class="btn perigo-sec" id="d-apagar" data-ref="${esc(tipo)}:${esc(rid)}">${ico("lixo", "mini-ico")} Apagar este registro</button>`;
  };
  ECRAS.detalhe.depois = () => { const b = $("#d-apagar"); if (!b) return; b.onclick = () => {
    if (!b.dataset.conf) { b.dataset.conf = 1; b.lastChild.textContent = " Tocar de novo para apagar"; return; }
    const [tipo, rid] = b.dataset.ref.split(":");
    D[tipo] = D[tipo].filter(x => x.id !== rid); gravar(); toast("Registro apagado."); voltar();
  }; };

  // ================= SINTOMAS =================
  ECRAS.sintomas = () => `${cab("Sintomas")}
    <p class="suave">Anote como se sente. Ajuda você e o seu médico a acompanhar o tratamento. Os itens com ⚠ mostram um aviso para procurar atendimento.</p>
    <p class="rot" id="l-sint">O que está sentindo?</p>
    <div class="chips" role="group" aria-labelledby="l-sint">
      ${SINTOMAS.map(s => `<button class="chip ${s[2] !== undefined ? "chip-alerta" : ""}" data-s="${s[0]}" aria-pressed="false">${s[2] !== undefined ? "⚠ " : ""}${esc(s[1])}</button>`).join("")}
    </div>
    <div id="s-alerta"></div>
    <p class="rot" id="l-int">Intensidade</p>
    <div class="segmentos s3" role="radiogroup" aria-labelledby="l-int">
      ${INTENSIDADES.map(i => `<button class="seg" role="radio" data-i="${i}" aria-checked="false">${i[0].toUpperCase() + i.slice(1)}</button>`).join("")}
    </div>
    <label for="s-nota" class="rot">Nota <span class="opc">(opcional)</span></label>
    <input id="s-nota" maxlength="200" placeholder="Ex.: depois do almoço">
    <button class="btn" id="s-ok">Salvar</button>
    <button class="btn sec" data-ir="jornada" data-jfiltro="sintomas">Ver sintomas anotados</button>`;
  ECRAS.sintomas.depois = () => {
    let s = null; const intens = segmentos("i");
    $$("[data-s]").forEach(b => b.onclick = () => {
      $$("[data-s]").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); s = b.dataset.s; $("#s-alerta").innerHTML = alertaHTML(s);
    });
    $("#s-ok").onclick = () => {
      if (!s) return toast("Escolha o que está sentindo.");
      D.sintomas.push({ id: id(), quando: new Date().toISOString(), tipo: s, intensidade: intens() || "", nota: $("#s-nota").value.trim() });
      gravar(); toast("Anotado ✓");
      const alerta = ehAlerta(s); ir("sintomas", null, true); if (alerta) $("#s-alerta").innerHTML = alertaHTML(s);
    };
  };

  // ================= EVOLUÇÃO (peso, medidas, sintomas) =================
  // Mostra apenas os números que a pessoa registrou. Sem metas, sem juízo de valor, sem interpretação.
  function grafico(pontos, unidade) {
    if (pontos.length < 2) return `<p class="suave centro">${pontos.length ? "Registre mais um valor para ver o gráfico." : "Sem registros ainda."}</p>`;
    const W = 320, H = 180, m = { e: 40, d: 12, t: 12, b: 30 };
    const xs = pontos.map(p => new Date(p.q).getTime()), ys = pontos.map(p => p.v);
    let y0 = Math.min(...ys), y1 = Math.max(...ys); if (y1 - y0 < 2) { y0 -= 1; y1 += 1; }
    const x0 = Math.min(...xs), x1 = Math.max(...xs) === x0 ? x0 + 1 : Math.max(...xs);
    const X = t => m.e + (t - x0) / (x1 - x0) * (W - m.e - m.d), Y = v => m.t + (y1 - v) / (y1 - y0) * (H - m.t - m.b);
    const linha = pontos.map((p, i) => (i ? "L" : "M") + X(xs[i]).toFixed(1) + " " + Y(p.v).toFixed(1)).join("");
    const area = linha + `L${X(xs[xs.length - 1]).toFixed(1)} ${H - m.b}L${X(xs[0]).toFixed(1)} ${H - m.b}Z`;
    const grade = [y0, (y0 + y1) / 2, y1].map(v => `<line x1="${m.e}" x2="${W - m.d}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="g-grade"/><text x="${m.e - 6}" y="${(Y(v) + 5).toFixed(1)}" class="g-txt" text-anchor="end">${esc(String(Math.round(v)))}</text>`).join("");
    const datas = [0, pontos.length - 1].map(i => `<text x="${X(xs[i]).toFixed(1)}" y="${H - 8}" class="g-txt" text-anchor="${i ? "end" : "start"}">${esc(new Date(xs[i]).getDate() + " " + MESES_C[new Date(xs[i]).getMonth()])}</text>`).join("");
    return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico dos valores registrados (${esc(unidade)})">${grade}<path d="${area}" class="g-area"/><path d="${linha}" class="g-linha"/>${pontos.map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4" class="g-ponto"/>`).join("")}${datas}</svg>`;
  }
  ECRAS.evolucao = (aba) => {
    aba = ["medidas", "sintomas"].includes(aba) ? aba : "peso";
    let corpo = "";
    if (aba === "peso") {
      const ps = D.pesos.slice().sort((a, b) => a.quando.localeCompare(b.quando)), u = ps[ps.length - 1], p0 = ps[0];
      corpo = `<div class="cartao numero">
        ${ico("balanca", "n-ico")}<p class="n-valor">${u ? esc(num(u.kg, "kg")) : "—"}</p>
        ${u && ps.length > 1 ? `<p class="n-var">${esc(sinal(u.kg - p0.kg))} kg</p><p class="suave">desde ${esc(dataCurta(p0.quando))} (primeiro registro)</p>` : `<p class="suave">${u ? "Primeiro registro: " + esc(dataCurta(u.quando)) : "Registre o seu peso para acompanhar."}</p>`}
      </div>
      <div class="cartao">${grafico(ps.map(p => ({ q: p.quando, v: p.kg })), "kg")}</div>
      <div class="cartao form linha-form">
        <label for="p-kg">Peso de hoje (kg)</label>
        <div class="lf"><input id="p-kg" type="text" inputmode="decimal" placeholder="Ex.: 82,5"><button class="btn curto" id="p-ok">Salvar</button></div>
      </div>
      <p class="suave">Os valores são apenas os que você registrou. O Seringa não avalia nem interpreta a sua evolução: converse com o seu médico.</p>`;
    } else if (aba === "medidas") {
      corpo = `<div class="cartao form">
        <label for="m-tipo">Medida</label>
        <select id="m-tipo">${MEDIDAS.map(m => `<option value="${m[0]}">${m[1]}</option>`).join("")}</select>
        <label for="m-cm">Valor (cm)</label>
        <div class="lf"><input id="m-cm" type="text" inputmode="decimal" placeholder="Ex.: 92"><button class="btn curto" id="m-ok">Salvar</button></div>
      </div>
      ${MEDIDAS.map(t => { const l = D.medidas.filter(x => x.tipo === t[0]).sort((a, b) => a.quando.localeCompare(b.quando)); if (!l.length) return "";
        const u = l[l.length - 1]; return `<div class="cartao"><p class="linha-tit"><strong>${t[1]}</strong><span>${esc(num(u.cm, "cm"))}</span></p>
        ${l.length > 1 ? `<p class="suave">${esc(sinal(u.cm - l[0].cm))} cm desde ${esc(dataCurta(l[0].quando))}</p>` : ""}${grafico(l.map(x => ({ q: x.quando, v: x.cm })), "cm")}</div>`; }).join("") || `<div class="cartao"><p class="suave">Nenhuma medida registrada.</p></div>`}`;
    } else {
      const desde = Date.now() - 30 * 864e5, cont = {};
      D.sintomas.filter(s => new Date(s.quando) >= desde).forEach(s => cont[s.tipo] = (cont[s.tipo] || 0) + 1);
      const mx = Math.max(1, ...Object.values(cont));
      corpo = `<div class="cartao"><p class="rotulo">Sintomas anotados nos últimos 30 dias</p>
        ${Object.keys(cont).length ? `<ul class="barras">${Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(nomeSint(k))}</span><span class="barra"><span class="barra-v w${Math.round(v / mx * 10)}"></span></span><strong>${v}</strong></li>`).join("")}</ul>` : `<p class="suave">Nenhum sintoma anotado.</p>`}
      </div><button class="btn sec" data-ir="sintomas">Anotar sintoma</button>`;
    }
    return `${cab("Evolução")}
    <div class="abas-int" role="tablist">
      ${[["peso", "Peso"], ["medidas", "Medidas"], ["sintomas", "Sintomas"]].map(a => `<button role="tab" data-evo="${a[0]}" aria-selected="${a[0] === aba}">${a[1]}</button>`).join("")}
    </div>${corpo}`;
  };
  ECRAS.evolucao.depois = (aba) => {
    $$("[data-evo]").forEach(b => b.onclick = () => { ECRAS.evolucao.arg = b.dataset.evo; $("#ecra").innerHTML = ECRAS.evolucao(b.dataset.evo); ECRAS.evolucao.depois(b.dataset.evo); });
    if ($("#p-ok")) $("#p-ok").onclick = () => {
      const kg = parseFloat(String($("#p-kg").value).replace(",", "."));
      if (!(kg >= 20 && kg <= 400)) return toast("Informe um peso válido.");
      D.pesos.push({ id: id(), quando: new Date().toISOString(), kg: Math.round(kg * 10) / 10 }); gravar(); toast("Salvo ✓"); ir("evolucao", "peso", true);
    };
    if ($("#m-ok")) $("#m-ok").onclick = () => {
      const cm = parseFloat(String($("#m-cm").value).replace(",", "."));
      if (!(cm >= 10 && cm <= 300)) return toast("Informe uma medida válida.");
      D.medidas.push({ id: id(), quando: new Date().toISOString(), tipo: $("#m-tipo").value, cm: Math.round(cm * 10) / 10 }); gravar(); toast("Salvo ✓"); ir("evolucao", "medidas", true);
    };
  };

  // ================= RELATÓRIO =================
  function htmlRelatorio(o) {
    const m = med(), desde = o.dias ? Date.now() - o.dias * 864e5 : 0, noPeriodo = x => new Date(x.quando).getTime() >= desde;
    const ap = D.aplicacoes.filter(noPeriodo).sort((a, b) => a.quando.localeCompare(b.quando));
    const si = D.sintomas.filter(noPeriodo).sort((a, b) => a.quando.localeCompare(b.quando));
    const pe = D.pesos.filter(noPeriodo).sort((a, b) => a.quando.localeCompare(b.quando));
    const me = D.medidas.filter(noPeriodo).sort((a, b) => a.quando.localeCompare(b.quando));
    const cont = {}; si.forEach(s => cont[s.tipo] = (cont[s.tipo] || 0) + 1);
    const locais = {}; ap.forEach(a => locais[a.local] = (locais[a.local] || 0) + 1);
    const periodo = o.dias ? `Últimos ${o.dias} dias` : "Todo o período";
    return `<div class="rel">
      <div class="rel-cab"><div class="logo">${ico("seringa", "logo-ico")}<span>Seringa</span></div><div><strong>Relatório de registros</strong><br>${esc(periodo)} · gerado em ${esc(new Date().toLocaleString("pt-BR"))}</div></div>
      <p><strong>Medicamento:</strong> ${esc(m.nome)}${m.categoria ? " (" + esc(nomeCat(m.categoria)) + ")" : ""} — ${esc(descFreq(m))}, conforme informado pelo paciente.</p>
      ${o.aplicacoes ? `<h3>Aplicações (${ap.length})</h3>
        ${ap.length ? `<p>${Object.entries(locais).map(([k, v]) => `${esc(nomeLocal(k))}: ${v}`).join(" · ")}</p>
        <table class="tabela"><thead><tr><th>Data</th><th>Local</th>${o.notas ? "<th>Obs.</th>" : ""}</tr></thead><tbody>
        ${ap.slice().reverse().map(a => `<tr><td>${esc(new Date(a.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }))}</td><td>${esc(nomeLocal(a.local))}</td>${o.notas ? `<td>${esc(a.nota)}</td>` : ""}</tr>`).join("")}</tbody></table>` : "<p>Nenhuma no período.</p>"}` : ""}
      ${o.peso ? `<h3>Peso e medidas</h3>
        ${pe.length ? `<p>${pe.map(p => `${esc(diaBR(p.quando))}: ${esc(num(p.kg, "kg"))}`).join(" · ")}</p>${pe.length > 1 ? `<p>Variação registrada no período: ${esc(sinal(pe[pe.length - 1].kg - pe[0].kg))} kg</p>` : ""}` : "<p>Sem registros de peso no período.</p>"}
        ${me.length ? `<p>${me.map(x => `${esc(diaBR(x.quando))} ${esc(nomeMedida(x.tipo))}: ${esc(num(x.cm, "cm"))}`).join(" · ")}</p>` : ""}` : ""}
      ${o.sintomas ? `<h3>Sintomas anotados (${si.length})</h3>
        ${si.length ? `<p>${Object.entries(cont).map(([k, v]) => `${esc(nomeSint(k))}: ${v}`).join(" · ")}</p>
        <ul>${si.slice().reverse().map(s => `<li>${esc(diaBR(s.quando))} — ${esc(nomeSint(s.tipo))}${s.intensidade ? " (" + esc(s.intensidade) + ")" : ""}${o.notas && s.nota ? ": " + esc(s.nota) : ""}</li>`).join("")}</ul>` : "<p>Nenhum no período.</p>"}` : ""}
      ${o.notas && D.duvidas ? `<h3>Dúvidas para o médico</h3><p class="pre">${esc(D.duvidas)}</p>` : ""}
      <p class="rel-rodape">Registros feitos pelo próprio paciente no app Seringa. Este relatório é apenas um resumo dos registros: não contém avaliação clínica e não substitui a avaliação médica.</p>
    </div>`;
  }
  ECRAS.relatorio = () => `${cab("Meu relatório", true)}
    <p class="sub">Gere um resumo dos seus registros para levar à consulta.</p>
    <label for="rel-periodo" class="rot">Período</label>
    <div class="campo-ico">${ico("calendario")}<select id="rel-periodo"><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="0">Todo o período</option></select></div>
    <p class="rot">Incluir no relatório</p>
    <div class="cartao checks">
      <label class="check"><input type="checkbox" id="rel-ap" checked><span>Aplicações</span></label>
      <label class="check"><input type="checkbox" id="rel-pe" checked><span>Peso e evolução</span></label>
      <label class="check"><input type="checkbox" id="rel-si" checked><span>Sintomas</span></label>
      <label class="check"><input type="checkbox" id="rel-no" checked><span>Observações</span></label>
    </div>
    <label for="duvidas" class="rot">Dúvidas para o médico <span class="opc">(opcional)</span></label>
    <textarea id="duvidas" maxlength="2000" placeholder="Escreva aqui as suas perguntas...">${esc(D.duvidas || "")}</textarea>
    <button class="btn" id="gerar-pdf">${ico("relatorio", "mini-ico")} Gerar PDF</button>
    <button class="btn sec" id="ver-rel">Ver na tela</button>
    <p class="suave">O PDF é criado no seu aparelho: escolha «Salvar como PDF» na janela que abrir. O relatório é apenas um resumo dos seus registros e não substitui a avaliação médica.</p>
    <div id="previa"></div>`;
  ECRAS.relatorio.depois = () => {
    const opcoes = () => ({ dias: +$("#rel-periodo").value, aplicacoes: $("#rel-ap").checked, peso: $("#rel-pe").checked, sintomas: $("#rel-si").checked, notas: $("#rel-no").checked });
    $("#duvidas").oninput = e => { D.duvidas = e.target.value.slice(0, 2000); gravar(); };
    $("#ver-rel").onclick = () => { $("#previa").innerHTML = `<div class="cartao">${htmlRelatorio(opcoes())}</div>`; $("#previa").scrollIntoView({ behavior: "smooth" }); };
    $("#gerar-pdf").onclick = () => {
      $("#impressao").innerHTML = htmlRelatorio(opcoes());
      document.title = "Relatorio-Seringa-" + new Date().toISOString().slice(0, 10);
      setTimeout(() => { if (NATIVO) NATIVO.imprimir(); else window.print(); setTimeout(() => { document.title = "Seringa"; }, 1000); }, 60);
    };
  };

  // ================= LEMBRETES =================
  ECRAS.lembretes = () => {
    const m = med(), p = proxima(), futura = p.getTime() > Date.now();
    return `${cab("Lembretes")}
    <div class="cartao">
      <label class="interruptor"><span>Ativar lembretes</span><input type="checkbox" role="switch" id="l-ativo" ${D.prefs.lembretes ? "checked" : ""}><span class="trilho"></span></label>
    </div>
    <div class="cartao">
      <p class="rotulo">Próximo lembrete</p>
      <p class="linha-ico">${ico("calendario")}<strong>${esc(dataHora(p))}</strong></p>
      <p class="suave">${esc(faltam(p))} · ${esc(m.nome)}, ${esc(descFreq(m))}, conforme você indicou.</p>
      <button class="link-txt" data-ir="config">Alterar data ou frequência</button>
    </div>
    <h2 class="sec-tit">Notificações</h2>
    ${NATIVO ? `<div class="cartao">
      <p class="linha-ico">${ico("sino")}<span>${D.prefs.lembretes && futura ? "O celular mostra uma notificação na data e hora acima." : D.prefs.lembretes ? "A data prevista já passou: registre a aplicação ou altere a data." : "Lembretes desativados."}</span></p>
      <p class="suave">A notificação acompanha automaticamente cada registro e cada mudança de data. Na tela de bloqueio não aparece o nome do medicamento.</p>
    </div>` : `<div class="cartao">
      <p class="linha-ico">${ico("sino")}<span>No ${IOS ? "iPhone" : "navegador"}, o lembrete é um evento com alarme no calendário do seu celular.</span></p>
      <p class="suave">Os navegadores não garantem notificações com o app fechado. Se mudar a data ou aplicar em outro dia, adicione o evento de novo.</p>
    </div>`}
    <button class="btn sec" id="m-ics">${ico("calendario", "mini-ico")} ${NATIVO ? "Adicionar ao calendário do celular" : "Adicionar ao calendário (.ics)"}</button>
    <button class="btn sec" data-ir="calendario">Ver calendário</button>`;
  };
  ECRAS.lembretes.depois = () => {
    $("#l-ativo").onchange = e => { D.prefs.lembretes = e.target.checked; gravar(); toast(e.target.checked ? "Lembretes ativados." : "Lembretes desativados."); ir("lembretes", null, true); };
    $("#m-ics").onclick = baixarICS;
  };
  function baixarICS() {
    const m = med(); if (!m) return toast("Configure o medicamento primeiro.");
    const p = proxima();
    if (NATIVO) {
      const ok = NATIVO.adicionarCalendario(p.getTime(), p.getTime() + 15 * 6e4, `Aplicação — ${m.nome} (Seringa)`,
        "Lembrete criado pelo Seringa conforme a frequência que você indicou. Depois de aplicar, registre no app.", `FREQ=DAILY;INTERVAL=${m.intervalo}`);
      return toast(ok ? "Confirme o evento no calendário ✓" : "Não encontrei um app de calendário neste celular.");
    }
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
    if (NATIVO) {
      const r = new FileReader();
      r.onload = () => { try { toast(NATIVO.salvarArquivo(nome, blob.type || "application/octet-stream", String(r.result).split(",")[1] || "")); } catch (e) { toast("Não consegui salvar o arquivo."); } };
      r.readAsDataURL(blob); return;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ================= CALENDÁRIO =================
  ECRAS.calendario = () => {
    const base = new Date(); base.setDate(1); base.setHours(12, 0, 0, 0); base.setMonth(base.getMonth() + calMes);
    const ano = base.getFullYear(), mes = base.getMonth();
    const ini = new Date(ano, mes, 1), fim = new Date(ano, mes + 1, 0, 23, 59, 59);
    const ap = {}, si = {}, prev = {};
    D.aplicacoes.forEach(a => { const k = diaChave(a.quando); (ap[k] = ap[k] || []).push(a); });
    D.sintomas.forEach(s => { const k = diaChave(s.quando); (si[k] = si[k] || []).push(s); });
    const m = med(); let p = new Date(proxima());
    for (let i = 0; i < 400 && p <= fim; i++) { if (p >= ini) prev[diaChave(p)] = new Date(p); p.setDate(p.getDate() + m.intervalo); }
    const hojeK = diaChave(new Date());
    let cel = "";
    for (let i = 0; i < ini.getDay(); i++) cel += `<div class="dia vazio" aria-hidden="true"></div>`;
    for (let d = 1; d <= fim.getDate(); d++) {
      const k = ano + "-" + (mes + 1) + "-" + d, partes = [];
      if (ap[k]) partes.push(`${ap[k].length} aplicação(ões)`); if (prev[k]) partes.push("aplicação prevista"); if (si[k]) partes.push(`${si[k].length} sintoma(s)`);
      cel += `<div class="dia ${k === hojeK ? "hoje" : ""} ${ap[k] ? "com-ap" : ""} ${prev[k] ? "previsto" : ""}" aria-label="${d} de ${MESES[mes]}${partes.length ? ": " + partes.join(", ") : ""}">
        <span class="n">${d}</span><span class="marcas" aria-hidden="true">${ap[k] ? "●" : ""}${si[k] ? "•" : ""}</span></div>`;
    }
    const prevLista = Object.values(prev).sort((a, b) => a - b);
    return `${cab("Calendário")}
    <div class="cal-topo">
      <button class="cal-nav" id="cal-ant" aria-label="Mês anterior">${ico("voltar")}</button>
      <h2 class="cal-mes" aria-live="polite">${MESES[mes][0].toUpperCase() + MESES[mes].slice(1)} de ${ano}</h2>
      <button class="cal-nav" id="cal-seg" aria-label="Mês seguinte">${ico("direita")}</button>
    </div>
    <div class="cartao">
      <div class="cal" role="grid" aria-label="Dias de ${MESES[mes]}">
        ${["D", "S", "T", "Q", "Q", "S", "S"].map(x => `<div class="sem" aria-hidden="true">${x}</div>`).join("")}${cel}
      </div>
      <p class="legenda"><span class="lg lg-ap"></span> aplicação registrada <span class="lg lg-prev"></span> prevista (conforme você indicou) <span class="lg lg-si"></span> sintoma</p>
    </div>
    ${prevLista.length ? `<div class="cartao"><p class="rotulo">Previstas neste mês</p><ul class="lista">${prevLista.map(d => `<li><span>${esc(dataCurta(d))}</span><span class="suave">${horaBR(d)}</span></li>`).join("")}</ul></div>` : ""}
    ${calMes !== 0 ? `<button class="btn sec" id="cal-hoje">Voltar ao mês atual</button>` : ""}`;
  };
  ECRAS.calendario.depois = () => {
    $("#cal-ant").onclick = () => { calMes--; ir("calendario", null, true); };
    $("#cal-seg").onclick = () => { calMes++; ir("calendario", null, true); };
    if ($("#cal-hoje")) $("#cal-hoje").onclick = () => { calMes = 0; ir("calendario", null, true); };
  };

  // ================= EFEITOS, SUS, AVISOS =================
  ECRAS.efeitos = () => {
    const g = guiaDoMed(), m = med();
    if (m && !g) return `${cab("Efeitos e cuidados")}
      <div class="cartao">
        <p>Ainda não temos um guia revisado para <strong>${esc(m.nome)}</strong>.</p>
        <p>Consulte a bula do seu medicamento e converse com o seu médico sobre o que pode acontecer e quando procurar atendimento.</p>
        <p class="fonte">${fonteHTML(["bulario"])}</p>
      </div>
      <div class="alerta">${ico("alerta", "mini-ico")}<div><strong>Em urgência:</strong> ligue 192 (SAMU) ou procure o pronto atendimento mais próximo.</div></div>`;
    return `${cab("Efeitos e cuidados")}
    <p class="suave">${m ? "" : "Guia disponível: "}<strong>${esc(C.medicamentos.mounjaro.nome)}</strong>. Informação da bula e de fontes oficiais. Não substitui o médico.</p>
    <div class="alerta">${ico("alerta", "mini-ico")}<div><strong>Procure atendimento se:</strong><ul>${C.alertas.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div></div>
    ${C.efeitos.map(e => `<div class="cartao efeito">
      <h2>${esc(e.titulo)}</h2>
      <p>${esc(e.oque)}</p>
      ${e.fazer && e.fazer.length ? `<p><strong>O que fazer no Seringa e na consulta:</strong></p><ul>${e.fazer.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      ${e.alerta ? `<p><strong>⚠</strong> ${esc(e.alerta)}</p>` : ""}
      <p class="fonte">Fonte: ${fonteHTML(e.fonte)}</p></div>`).join("")}
    <p class="fonte">Conteúdo revisto em ${dataConteudo(C.versao)}.</p>`;
  };
  ECRAS.sus = () => `${cab("Guia SUS")}
    <div class="cartao">${C.sus.map(p => `<p>${esc(p)}</p>`).join("")}<p class="fonte">Fonte: ${fonteHTML(["ms"])}</p></div>`;
  ECRAS.avisos = () => `${cab("Avisos e novidades")}
    ${C.avisos.slice().sort((a, b) => b.data.localeCompare(a.data)).map(a => `<div class="cartao"><p class="suave">${dataConteudo(a.data)}</p>
      <p><strong>${esc(a.titulo)}</strong></p><p>${esc(a.texto)}</p>${a.fonte ? `<p class="fonte">Fonte: ${fonteHTML([a.fonte])}</p>` : ""}</div>`).join("")}`;

  // ================= MAIS =================
  ECRAS.mais = () => `${cab("Mais", true)}
    <div class="menu">
      ${linhaMenu("livro", "Efeitos e cuidados", 'data-ir="efeitos"')}
      ${linhaMenu("hospital", "Guia SUS", 'data-ir="sus"')}
      ${linhaMenu("megafone", "Avisos e novidades", 'data-ir="avisos"')}
    </div>
    <div class="menu">
      ${linhaMenu("pilula", "Meu medicamento", 'data-ir="config"')}
      ${linhaMenu("sino", "Lembretes", 'data-ir="lembretes"')}
      ${linhaMenu("calendario", "Calendário", 'data-ir="calendario"')}
    </div>
    <div class="menu">
      ${linhaMenu("escudo", "Privacidade", 'data-ir="privacidade"')}
      ${linhaMenu("exportar", "Exportar dados", 'id="m-exp"')}
      ${linhaMenu("importar", "Restaurar uma cópia", 'data-ir="privacidade"')}
      ${linhaMenu("lixo", "Apagar meus dados", 'data-ir="privacidade" data-foco="v-del"')}
      ${linhaMenu("sobre", "Sobre o Seringa", 'data-ir="sobre"')}
    </div>
    <button class="cartao premium" data-ir="premium">${ico("estrela", "lico")}<span><strong>Seringa Premium</strong><br><span class="suave">Em breve: vários medicamentos, família e backup.</span></span>${ico("direita", "seta")}</button>
    <div class="assinatura">
      <div class="logo">${ico("seringa", "logo-ico")}<span>Seringa</span></div>
      <p class="marca-bf">BFAVORE</p>
      <p class="suave">Versão ${VERSAO_APP} · conteúdo de ${dataConteudo(C.versao)}</p>
    </div>`;
  ECRAS.mais.depois = () => { $("#m-exp").onclick = exportar; };
  function exportar() {
    const copia = { app: "seringa", formato: 2, exportadoEm: new Date().toISOString(), dados: D };
    descarregar(new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" }), "seringa-meus-dados.json");
  }

  ECRAS.premium = () => `${cab("Seringa Premium")}
    <div class="cartao destaque"><p><strong>O Seringa continua gratuito</strong> para organizar o seu tratamento: registro, lembretes, mapa do corpo, jornada, evolução, relatório e privacidade.</p></div>
    <div class="cartao">
      <p class="rotulo">Em preparação para o Premium</p>
      <p class="item-ico">${ico("pilula")}<span><strong>Vários medicamentos</strong> — cada um com o seu calendário e lembrete.</span></p>
      <p class="item-ico">${ico("corpo")}<span><strong>Família e cuidador</strong> — acompanhar o tratamento de outra pessoa, com perfis separados.</span></p>
      <p class="item-ico">${ico("escudo")}<span><strong>Backup criptografado</strong> — restaurar os registros num celular novo.</span></p>
      <p class="item-ico">${ico("relatorio")}<span><strong>Relatórios avançados</strong> — períodos e formatos personalizados para a consulta.</span></p>
    </div>
    <p class="suave">Ainda não está disponível e não há nada para pagar. Nenhuma função gratuita será bloqueada para criar o Premium.</p>`;

  // ================= PRIVACIDADE =================
  ECRAS.privacidade = () => {
    const modo = Armazem.modo;
    const estado = modo === "idb" ? "Salvos no aparelho (IndexedDB), criptografados com uma chave criada neste aparelho."
      : modo === "local" ? "Este navegador não permite salvar com criptografia: os dados estão no aparelho, mas sem criptografia."
      : modo === "erro" ? "Não foi possível ler os dados salvos. Nada foi apagado." : "Este navegador não permite salvar dados: os registros serão perdidos ao fechar.";
    return `${cab("Privacidade")}
    <div class="cartao"><p class="linha-ico">${ico("escudo")}<span><strong>Estado:</strong> ${esc(estado)}</span></p></div>
    <div class="cartao texto">
      <h2>O que o Seringa guarda</h2>
      <p>Só o que você escreve: nome e frequência do medicamento, aplicações (data, hora, local, observação), sintomas, peso, medidas, as suas dúvidas para o médico e, se quiser, como prefere ser chamado(a). Não pedimos CPF, endereço, e-mail nem telefone.</p>
      <h2>Para quê</h2>
      <p>Exclusivamente para organizar o seu tratamento no seu aparelho: lembrar, mostrar a jornada e montar o relatório para a consulta.</p>
      <h2>Onde ficam</h2>
      <p>Apenas neste aparelho. O Seringa não tem servidor de dados: não envia, não vende e não compartilha os seus dados de saúde, e não tem publicidade nem rastreadores. A BFAVORE não tem acesso aos seus registros.${NATIVO ? " O app Android nem sequer tem permissão de acesso à internet." : ""}</p>
      <h2>Segurança</h2>
      <p>Os registros são salvos com criptografia (AES-GCM), com uma chave que não sai deste aparelho. Isto protege contra a leitura direta dos arquivos do aparelho, mas <strong>quem usar o seu celular desbloqueado consegue abrir o app e ver os registros</strong>. Use bloqueio de tela.</p>
      <h2>Navegador, Android e iPhone</h2>
      <p>Cada instalação (o navegador, o app Android, o app no iPhone) guarda os seus próprios dados. <strong>Não há sincronização automática</strong> entre elas. Para passar os registros de uma para outra, use «Baixar uma cópia» e depois «Restaurar uma cópia».${NATIVO ? " No app Android, a cópia é salva na pasta Downloads/Seringa. Ao desinstalar o app, os dados dele são apagados." : ""}</p>
      <p class="suave">A cópia baixada é um arquivo comum (sem criptografia). Guarde-a em local seguro. Backup na nuvem ainda não existe.</p>
    </div>
    <button class="btn sec" id="v-exp">${ico("exportar", "mini-ico")} Baixar uma cópia dos meus dados</button>
    <label class="btn sec" for="v-imp">${ico("importar", "mini-ico")} Restaurar uma cópia</label>
    <input type="file" id="v-imp" accept="application/json,.json" class="so-leitor">
    <button class="btn perigo" id="v-del">${ico("lixo", "mini-ico")} <span>Apagar todos os meus dados</span></button>`;
  };
  ECRAS.privacidade.depois = () => {
    $("#v-exp").onclick = exportar;
    $("#v-imp").onchange = async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try {
        if (f.size > 5e6) throw new Error("grande");
        const novo = validarCopia(JSON.parse(await f.text()));
        const temDados = D.aplicacoes.length || D.sintomas.length || D.pesos.length || D.medidas.length;
        if (temDados && !confirm("Restaurar a cópia vai substituir os registros atuais deste aparelho. Continuar?")) { e.target.value = ""; return; }
        D = novo; gravar(); toast(`Cópia restaurada ✓ (${D.aplicacoes.length} aplicações)`); ir("hoje");
      } catch (x) { toast("Este arquivo não é uma cópia válida do Seringa."); e.target.value = ""; }
    };
    $("#v-del").onclick = async e => {
      const b = e.currentTarget;
      if (!b.dataset.conf) { b.dataset.conf = 1; b.lastElementChild.textContent = "Tocar de novo para apagar tudo"; return; }
      if (b.disabled) return;
      b.disabled = true; b.lastElementChild.textContent = "Apagando…";
      D = vazio(); await Armazem.apagar(); try { if (NATIVO) NATIVO.cancelarLembrete(); } catch (x) { /* sem ponte */ }
      toast("Dados apagados."); pilha = []; ir("boasvindas");
    };
  };
  ECRAS.sobre = () => `${cab("Sobre o Seringa")}
    <div class="cartao texto">
      <div class="logo">${ico("seringa", "logo-ico")}<span>Seringa</span></div>
      <p>O Seringa ajuda quem usa medicamentos injetáveis a organizar a jornada do tratamento: aplicações, lembretes, locais, sintomas, peso e relatório para a consulta, com informação de fonte oficial. Um produto <strong>BFAVORE</strong>.</p>
      <p><strong>Aviso:</strong> o Seringa não calcula nem orienta doses, não faz diagnóstico, não interpreta imagens e não substitui o médico. Use o medicamento somente com prescrição e acompanhamento profissional. Em caso de urgência, ligue 192 (SAMU).</p>
      <p class="suave">Versão ${VERSAO_APP}</p>
      <p><a href="../">Visitar o site do Seringa</a></p>
    </div>`;

  // ---------- eventos globais ----------
  document.addEventListener("click", ev => {
    if (ev.target.closest("[data-voltar]")) { ev.preventDefault(); voltar(); return; }
    const a = ev.target.closest("[data-ir]");
    if (a) { ev.preventDefault(); ir(a.dataset.ir, a.dataset.jfiltro || null); const f = a.dataset.foco && $("#" + a.dataset.foco); if (f) f.scrollIntoView({ block: "center" }); return; }
    const b = ev.target.closest(".abas button");
    if (b) ir(b.dataset.ecra);
  });
  // Botão «voltar» do Android: volta dentro do app antes de o fechar.
  window.SeringaVoltar = () => { if (D.aviso && med() && atual && atual !== "hoje") { voltar(); return true; } return false; };

  // ---------- offline + atualização ----------
  // No app Android os arquivos vêm do próprio APK (já funcionam offline); o service worker só é usado no navegador/iPhone.
  if (NATIVO && "serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  if ("serviceWorker" in navigator && !NATIVO) {
    // Só há «versão nova» se a página já abriu controlada por um service worker (na 1.ª visita não há o que atualizar).
    const controladoAoAbrir = !!navigator.serviceWorker.controller;
    let pediuAtualizar = false;
    navigator.serviceWorker.register("sw.js").then(reg => {
      const mostrar = w => { if (!controladoAoAbrir) return; $("#atualizar").hidden = false; $("#btn-atualizar").onclick = () => { pediuAtualizar = true; w.postMessage("atualizar"); }; };
      if (reg.waiting) mostrar(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => { if (w.state === "installed") mostrar(w); });
      });
    }).catch(() => { /* sem SW: o app continua a funcionar online */ });
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (pediuAtualizar) { pediuAtualizar = false; location.reload(); } });
  }

  // ---------- arranque ----------
  Armazem.iniciar().then(dados => {
    if (dados) { try { D = normalizar(dados); } catch (e) { D = vazio(); } }
    document.body.classList.remove("a-carregar");
    if (Armazem.modo === "erro") { D.aviso = true; ir("privacidade"); toast("Não foi possível ler os dados salvos."); return; }
    ir(location.hash.slice(1) || "hoje", null, true);
    sincronizarLembrete();
  });
})();
