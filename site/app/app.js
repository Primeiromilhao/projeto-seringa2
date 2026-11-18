/* Seringa — app (PWA, offline, dados só no aparelho).
   Regras do produto: organiza, lembra e informa. NUNCA calcula, sugere ou avalia doses. Não diagnostica. */
(function () {
  "use strict";
  const C = window.SERINGA_CONTEUDO || { efeitos: [], alertas: [], avisos: [], sus: [], fontes: {} };
  const CHAVE = "seringa.v1";
  const LOCAIS = [
    ["abd-e", "Abdômen", "lado esquerdo"], ["abd-d", "Abdômen", "lado direito"],
    ["cox-e", "Coxa", "esquerda"], ["cox-d", "Coxa", "direita"],
    ["bra-e", "Braço", "esquerdo"], ["bra-d", "Braço", "direito"]
  ];
  const SINTOMAS = [
    ["enjoo", "Enjoo"], ["vomito", "Vômito"], ["diarreia", "Diarreia"], ["prisao", "Prisão de ventre"],
    ["refluxo", "Refluxo / azia"], ["cansaco", "Cansaço"], ["local", "Dor ou vermelhidão no local"],
    ["apetite", "Menos apetite"], ["outro", "Outro"],
    ["dor-forte", "Dor forte na barriga que não passa", 0],
    ["vomito-continuo", "Vômitos ou diarreia que não param", 3],
    ["alergia", "Inchaço no rosto/lábios ou falta de ar", 1]
  ];
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  // ---------- dados (no aparelho) ----------
  function vazio() { return { aviso: false, meds: [], aplicacoes: [], sintomas: [], pesos: [] }; }
  let D;
  try { D = Object.assign(vazio(), JSON.parse(localStorage.getItem(CHAVE) || "{}")); } catch (e) { D = vazio(); }
  function gravar() { try { localStorage.setItem(CHAVE, JSON.stringify(D)); } catch (e) { toast("Não consegui guardar no aparelho."); } }
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- utilidades ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dataBR = d => new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const horaBR = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nomeLocal = k => { const l = LOCAIS.find(x => x[0] === k); return l ? `${l[1]} — ${l[2]}` : k; };
  const nomeSint = k => { const s = SINTOMAS.find(x => x[0] === k); return s ? s[1] : k; };
  function paraInput(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); }
  function toast(t) { const el = $("#aviso-toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2600); }
  function fonteHTML(ks) {
    return (ks || []).map(k => C.fontes[k]).filter(Boolean)
      .map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>`).join(" · ");
  }

  // ---------- regras do lembrete (só agenda o que a pessoa indicou) ----------
  const med = () => D.meds[0];
  function ultimaAplic() { return D.aplicacoes.slice().sort((a, b) => b.quando.localeCompare(a.quando))[0]; }
  function proxima() {
    const m = med(); if (!m) return null;
    const u = ultimaAplic();
    if (!u) return new Date(m.primeira);
    const d = new Date(u.quando); d.setDate(d.getDate() + m.intervalo);
    const [h, mi] = (m.hora || "09:00").split(":"); d.setHours(+h, +mi, 0, 0);
    return d;
  }
  function locaisRecentes(n) { return D.aplicacoes.slice().sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, n).map(a => a.local); }
  function descFreq(m) {
    if (m.intervalo === 7) return `toda ${DIAS[new Date(m.primeira).getDay()]}`;
    if (m.intervalo === 1) return "todos os dias";
    return `a cada ${m.intervalo} dias`;
  }

  // ---------- ecrãs ----------
  const ECRAS = {};
  let atual = "hoje";
  function ir(nome, arg) {
    if (!D.aviso) nome = "boasvindas";
    else if (!med() && !["config", "efeitos", "mais", "sus", "avisos", "privacidade", "sobre"].includes(nome)) nome = "config";
    atual = nome;
    $("#ecra").innerHTML = ECRAS[nome](arg);
    document.querySelectorAll(".abas button").forEach(b => b.classList.toggle("ativa", b.dataset.ecra === nome));
    window.scrollTo(0, 0);
    if (ECRAS[nome].depois) ECRAS[nome].depois(arg);
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
      <p>🔒 Seus dados ficam <strong>só neste celular</strong>. Você pode apagá-los quando quiser.</p>
    </div>
    <button class="btn" id="aceitar">Entendi, começar</button>`;
  ECRAS.boasvindas.depois = () => $("#aceitar").onclick = () => { D.aviso = true; gravar(); ir("config"); };

  ECRAS.config = () => {
    const m = med() || {};
    const prox = m.primeira ? paraInput(m.primeira) : paraInput(new Date(Date.now() + 864e5));
    return `
    <h1>${m.id ? "Meu medicamento" : "Vamos configurar"}</h1>
    <p class="suave">Preencha conforme o que seu médico prescreveu. O Seringa apenas usa estes dados para lembrar você.</p>
    <div class="cartao">
      <label for="c-nome">Nome do medicamento</label>
      <input id="c-nome" list="sug" placeholder="Ex.: Mounjaro" value="${esc(m.nome || "")}">
      <datalist id="sug"><option value="Mounjaro"><option value="Ozempic"><option value="Wegovy"><option value="Insulina"></datalist>
      <label for="c-freq">Com que frequência aplica?</label>
      <select id="c-freq">
        <option value="7" ${m.intervalo === 7 || !m.id ? "selected" : ""}>Uma vez por semana</option>
        <option value="1" ${m.intervalo === 1 ? "selected" : ""}>Todos os dias</option>
        <option value="outro" ${m.id && ![1, 7].includes(m.intervalo) ? "selected" : ""}>A cada X dias</option>
      </select>
      <div id="c-x" ${m.id && ![1, 7].includes(m.intervalo) ? "" : "hidden"}>
        <label for="c-int">A cada quantos dias?</label>
        <input id="c-int" type="number" min="2" max="60" value="${m.id && ![1, 7].includes(m.intervalo) ? m.intervalo : 14}">
      </div>
      <label for="c-prox">${ultimaAplic() ? "Data e hora de referência" : "Quando é a próxima aplicação?"}</label>
      <input id="c-prox" type="datetime-local" value="${prox}">
      <p class="suave">Se já aplicou hoje, registre a aplicação depois — a próxima data passa a contar a partir dela.</p>
    </div>
    <button class="btn" id="c-gravar">Guardar</button>
    ${m.id ? `<button class="btn sec" data-ir="mais">Voltar</button>` : ""}`;
  };
  ECRAS.config.depois = () => {
    $("#c-freq").onchange = e => $("#c-x").hidden = e.target.value !== "outro";
    $("#c-gravar").onclick = () => {
      const nome = $("#c-nome").value.trim();
      if (!nome) return toast("Escreva o nome do medicamento.");
      const f = $("#c-freq").value;
      const intervalo = f === "outro" ? Math.max(2, Math.min(60, parseInt($("#c-int").value, 10) || 14)) : +f;
      const p = $("#c-prox").value;
      if (!p) return toast("Indique a data da próxima aplicação.");
      const prim = new Date(p);
      const m = med() || { id: id() };
      Object.assign(m, { nome, intervalo, primeira: prim.toISOString(), hora: p.slice(11, 16) });
      D.meds = [m]; gravar(); toast("Guardado ✓"); ir("hoje");
    };
  };

  ECRAS.hoje = () => {
    const m = med(), p = proxima(), u = ultimaAplic(), agora = new Date();
    const dias = Math.round((new Date(p).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
    const quando = dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : dias > 1 ? `Em ${dias} dias` : "Data prevista já passou";
    const alertaRecente = D.sintomas.find(s => SINTOMAS.find(x => x[0] === s.tipo && x[2] !== undefined) && (agora - new Date(s.quando)) < 3 * 864e5);
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
      <button class="btn sec" data-ir="sintomas">📝 Como estou</button>
      <button class="btn sec" data-ir="efeitos">💡 Efeitos</button>
    </div>
    <p class="suave">${esc(m.nome)}: ${descFreq(m)}. <a href="#" data-ir="config">Alterar</a></p>`;
  };

  ECRAS.registrar = () => {
    const rec = locaisRecentes(2);
    return `
    <h1>Registrar aplicação</h1>
    <p><strong>${esc(med().nome)}</strong></p>
    <label>Onde aplicou? <span class="legenda">(tracejado = usado recentemente)</span></label>
    <div class="corpo" role="group" aria-label="Local da aplicação">
      ${LOCAIS.map(l => `<button class="local ${rec.includes(l[0]) ? "recente" : ""}" data-local="${l[0]}" aria-pressed="false">
        ${l[1]}<small>${l[2]}${rec[0] === l[0] ? " · último" : ""}</small></button>`).join("")}
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
      D.aplicacoes.push({ id: id(), medId: med().id, quando: new Date(q).toISOString(), local: escolhido, nota: $("#r-nota").value.trim() });
      gravar(); toast("Aplicação registrada ✓"); ir("hoje");
    };
  };

  function alertaHTML(tipo) {
    const s = SINTOMAS.find(x => x[0] === tipo);
    if (!s || s[2] === undefined) return "";
    return `<div class="alerta" role="alert"><strong>⚠ Atenção:</strong> ${esc(C.alertas[s[2]] || "Procure atendimento médico.")}
      <p class="fonte">Fonte: ${fonteHTML(["bula"])}</p></div>`;
  }

  ECRAS.sintomas = () => `
    <h1>Como estou</h1>
    <p class="suave">Anote o que sente. Ajuda você e o seu médico a acompanhar o tratamento.</p>
    <label>O que está sentindo?</label>
    <div class="chips" role="group" aria-label="Sintoma">
      ${SINTOMAS.map(s => `<button class="chip" data-s="${s[0]}" aria-pressed="false">${s[2] !== undefined ? "⚠ " : ""}${s[1]}</button>`).join("")}
    </div>
    <div id="s-alerta"></div>
    <label>Intensidade</label>
    <div class="chips" role="group" aria-label="Intensidade">
      ${["leve", "moderada", "forte"].map(i => `<button class="chip" data-i="${i}" aria-pressed="false">${i}</button>`).join("")}
    </div>
    <label for="s-nota">Nota (opcional)</label>
    <input id="s-nota" maxlength="200" placeholder="Ex.: depois do almoço">
    <button class="btn" id="s-ok">Guardar</button>
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
      if (SINTOMAS.find(x => x[0] === s)[2] !== undefined) $("#s-alerta").innerHTML = alertaHTML(s);
    };
  };

  function linhaTempo(n) {
    const itens = [
      ...D.aplicacoes.map(a => ({ q: a.quando, t: `💉 Aplicação — ${nomeLocal(a.local)}`, n: a.nota })),
      ...D.sintomas.map(s => ({ q: s.quando, t: `📝 ${nomeSint(s.tipo)}${s.intensidade ? " (" + s.intensidade + ")" : ""}`, n: s.nota })),
      ...D.pesos.map(p => ({ q: p.quando, t: `⚖ Peso: ${String(p.kg).replace(".", ",")} kg`, n: "" }))
    ].sort((a, b) => b.q.localeCompare(a.q)).slice(0, n || 9999);
    if (!itens.length) return `<p class="suave">Nada registrado ainda.</p>`;
    return `<ul class="lista">${itens.map(x => `<li><span>${esc(x.t)}${x.n ? `<br><span class="suave">${esc(x.n)}</span>` : ""}</span>
      <span class="suave">${new Date(x.q).toLocaleDateString("pt-BR")}<br>${horaBR(x.q)}</span></li>`).join("")}</ul>`;
  }

  ECRAS.efeitos = () => `
    <h1>Efeitos e cuidados</h1>
    <p class="suave">Mounjaro (tirzepatida). Informação da bula e de fontes oficiais. Não substitui o médico.</p>
    <div class="alerta"><strong>Procure atendimento se:</strong><ul>${C.alertas.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>
    ${C.efeitos.map(e => `<div class="cartao">
      <h2>${e.icone} ${esc(e.titulo)}</h2>
      <p>${esc(e.oque)}</p>
      ${e.ajuda.length ? `<p><strong>O que pode ajudar:</strong></p><ul>${e.ajuda.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      ${e.alerta ? `<p><strong>⚠</strong> ${esc(e.alerta)}</p>` : ""}
      <p class="fonte">Fonte: ${fonteHTML(e.fonte)}</p></div>`).join("")}
    <p class="fonte">Conteúdo revisto em ${new Date(C.versao).toLocaleDateString("pt-BR")}.</p>`;

  ECRAS.mais = () => `
    <h1>Mais</h1>
    <div class="cartao"><ul class="lista">
      <li><a href="#" data-ir="historico">📅 Histórico completo</a></li>
      <li><a href="#" data-ir="relatorio">📄 Relatório para a consulta</a></li>
      <li><a href="#" data-ir="peso">⚖ Peso</a></li>
      <li><a href="#" id="m-ics">⏰ Lembrete no calendário do celular</a></li>
      <li><a href="#" data-ir="config">💊 Meu medicamento</a></li>
      <li><a href="#" data-ir="sus">🏥 Guia SUS</a></li>
      <li><a href="#" data-ir="avisos">📢 Avisos e novidades</a></li>
      <li><a href="#" data-ir="privacidade">🔒 Privacidade e meus dados</a></li>
      <li><a href="#" data-ir="sobre">ⓘ Sobre e aviso legal</a></li>
    </ul></div>
    <p class="suave">Versão do conteúdo: ${esc(C.versao)}</p>`;
  ECRAS.mais.depois = () => $("#m-ics").onclick = ev => { ev.preventDefault(); baixarICS(); };

  function baixarICS() {
    const m = med(); if (!m) return toast("Configure o medicamento primeiro.");
    const p = proxima();
    const f = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const fim = new Date(p.getTime() + 15 * 6e4);
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seringa//PT-BR", "BEGIN:VEVENT",
      `UID:${m.id}@seringa`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(p)}`, `DTEND:${f(fim)}`,
      `RRULE:FREQ=DAILY;INTERVAL=${m.intervalo}`, `SUMMARY:Aplicação — ${m.nome} (Seringa)`,
      "DESCRIPTION:Lembrete criado pelo Seringa. Depois de aplicar\\, registre no app.",
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:Hora da aplicação", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    descarregar(new Blob([ics], { type: "text/calendar" }), "lembrete-seringa.ics");
    toast("Abra o arquivo para adicionar ao calendário ✓");
  }
  function descarregar(blob, nome) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  ECRAS.historico = () => `
    <h1>Histórico</h1>
    <div class="cartao"><ul class="lista">${D.aplicacoes.slice().sort((a, b) => b.quando.localeCompare(a.quando)).map(a =>
      `<li><span>💉 ${dataBR(a.quando)} ${horaBR(a.quando)}<br><span class="suave">${esc(nomeLocal(a.local))}${a.nota ? " · " + esc(a.nota) : ""}</span></span>
       <button class="mini" data-del="${a.id}" aria-label="Apagar">apagar</button></li>`).join("") || `<li class="suave">Sem aplicações registradas.</li>`}</ul></div>
    <h2>Sintomas e peso</h2><div class="cartao">${linhaTempo()}</div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.historico.depois = () => document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if (b.dataset.conf) { D.aplicacoes = D.aplicacoes.filter(a => a.id !== b.dataset.del); gravar(); ir("historico"); }
    else { b.dataset.conf = 1; b.textContent = "confirmar?"; }
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
      <p><strong>Medicamento:</strong> ${esc(m.nome)} — ${descFreq(m)} (conforme informado pelo paciente)</p>
      <p><strong>Aplicações registradas:</strong> ${ap.length}${ap.length ? ` (de ${new Date(ap[0].quando).toLocaleDateString("pt-BR")} a ${new Date(ap[ap.length - 1].quando).toLocaleDateString("pt-BR")})` : ""}</p>
      <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    </div>
    <h2>Últimas aplicações</h2>
    <div class="cartao"><table class="tabela"><tr><th>Data</th><th>Local</th><th>Obs.</th></tr>
      ${ap.slice(-12).reverse().map(a => `<tr><td>${new Date(a.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td>${esc(nomeLocal(a.local))}</td><td>${esc(a.nota)}</td></tr>`).join("") || "<tr><td colspan=3>—</td></tr>"}
    </table></div>
    <h2>Sintomas anotados (últimos 90 dias)</h2>
    <div class="cartao">${Object.keys(cont).length ? `<ul>${Object.entries(cont).map(([k, v]) => `<li>${esc(nomeSint(k))}: ${v} registro(s)</li>`).join("")}</ul>` : "<p>Nenhum.</p>"}
      ${linhaTempo(15)}</div>
    ${D.pesos.length ? `<h2>Peso</h2><div class="cartao"><ul>${D.pesos.slice(-8).map(p => `<li>${new Date(p.quando).toLocaleDateString("pt-BR")}: ${String(p.kg).replace(".", ",")} kg</li>`).join("")}</ul></div>` : ""}
    <h2>Minhas dúvidas para o médico</h2>
    <div class="cartao"><textarea id="duvidas" placeholder="Escreva aqui suas perguntas...">${esc(D.duvidas || "")}</textarea></div>
    <p class="suave">Registros feitos pelo próprio paciente no app Seringa. Não constitui avaliação clínica.</p>
    <button class="btn no-print" onclick="window.print()">Salvar em PDF / imprimir</button>
    <button class="btn sec no-print" data-ir="mais">Voltar</button>`;
  };
  ECRAS.relatorio.depois = () => $("#duvidas").oninput = e => { D.duvidas = e.target.value; gravar(); };

  ECRAS.peso = () => `
    <h1>Peso</h1>
    <div class="cartao">
      <label for="p-kg">Peso de hoje (kg)</label>
      <input id="p-kg" type="text" inputmode="decimal" placeholder="Ex.: 82,5">
      <button class="btn" id="p-ok">Guardar</button>
    </div>
    <div class="cartao"><ul class="lista">${D.pesos.slice().reverse().map(p => `<li><span>${String(p.kg).replace(".", ",")} kg</span><span class="suave">${new Date(p.quando).toLocaleDateString("pt-BR")}</span></li>`).join("") || `<li class="suave">Sem registros.</li>`}</ul></div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.peso.depois = () => $("#p-ok").onclick = () => {
    const kg = parseFloat(String($("#p-kg").value).replace(",", "."));
    if (!(kg >= 20 && kg <= 400)) return toast("Indique um peso válido.");
    D.pesos.push({ id: id(), quando: new Date().toISOString(), kg: Math.round(kg * 10) / 10 }); gravar(); toast("Guardado ✓"); ir("peso");
  };

  ECRAS.sus = () => `
    <h1>Guia SUS</h1>
    <div class="cartao">${C.sus.map(p => `<p>${esc(p)}</p>`).join("")}<p class="fonte">Fonte: ${fonteHTML(["ms"])}</p></div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.avisos = () => `
    <h1>Avisos e novidades</h1>
    ${C.avisos.slice().sort((a, b) => b.data.localeCompare(a.data)).map(a => `<div class="cartao"><p class="suave">${new Date(a.data + "T12:00").toLocaleDateString("pt-BR")}</p>
      <p><strong>${esc(a.titulo)}</strong></p><p>${esc(a.texto)}</p>${a.fonte ? `<p class="fonte">Fonte: ${fonteHTML([a.fonte])}</p>` : ""}</div>`).join("")}
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.privacidade = () => `
    <h1>Privacidade e meus dados</h1>
    <div class="cartao">
      <p>Tudo o que registra fica <strong>apenas neste celular</strong>. O Seringa não envia seus dados de saúde para nenhum servidor, não os vende e não usa publicidade.</p>
      <p>Se trocar de celular ou limpar os dados do navegador, os registros são perdidos — faça uma cópia antes.</p>
    </div>
    <button class="btn sec" id="v-exp">Baixar uma cópia dos meus dados</button>
    <button class="btn perigo" id="v-del">Apagar todos os meus dados</button>
    <button class="btn sec" data-ir="mais">Voltar</button>`;
  ECRAS.privacidade.depois = () => {
    $("#v-exp").onclick = () => descarregar(new Blob([JSON.stringify(D, null, 2)], { type: "application/json" }), "seringa-meus-dados.json");
    $("#v-del").onclick = e => {
      if (!e.target.dataset.conf) { e.target.dataset.conf = 1; e.target.textContent = "Tocar de novo para apagar tudo"; return; }
      D = vazio(); gravar(); toast("Dados apagados."); ir("boasvindas");
    };
  };
  ECRAS.sobre = () => `
    <h1>Sobre o Seringa</h1>
    <div class="cartao">
      <p>O Seringa ajuda quem usa medicamentos injetáveis a organizar o tratamento e a lidar com as mudanças do dia a dia, com informação de fonte oficial.</p>
      <p><strong>Aviso:</strong> o Seringa não calcula nem orienta doses, não faz diagnóstico e não substitui o médico. Use o medicamento somente com prescrição e acompanhamento profissional. Em caso de urgência, ligue 192 (SAMU).</p>
      <p><a href="../">Visitar o site do Seringa</a></p>
    </div>
    <button class="btn sec" data-ir="mais">Voltar</button>`;

  // ---------- navegação ----------
  document.addEventListener("click", ev => {
    const a = ev.target.closest("[data-ir]");
    if (a) { ev.preventDefault(); ir(a.dataset.ir); }
    const b = ev.target.closest(".abas button");
    if (b) ir(b.dataset.ecra);
  });
  $("#btn-ajuda").onclick = () => ir(D.aviso ? "sobre" : "boasvindas");

  // ---------- offline + atualização ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(reg => {
      const mostrar = w => { $("#atualizar").hidden = false; $("#btn-atualizar").onclick = () => w.postMessage("atualizar"); };
      if (reg.waiting) mostrar(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) mostrar(w); });
      });
    }).catch(() => {});
    let recarregou = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recarregou) { recarregou = true; location.reload(); } });
  }

  ir(location.hash.slice(1) || "hoje");
})();
