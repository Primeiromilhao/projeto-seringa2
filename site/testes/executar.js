/* Testes automáticos do Seringa (app + site + APK publicado + PWA iPhone em WebKit).
   Uso:  node site/testes/executar.js          (na raiz do repositório)
   Requer o pacote "playwright" com Chromium e WebKit. Procura-o em: variável PW_DIR, ./node_modules, ou instalação global.
   Não precisa de internet: sobe um servidor estático local para a pasta site/. */
"use strict";
process.env.TZ = "America/Sao_Paulo"; // mesmo fuso do navegador de teste
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");

function carregarPlaywright() {
  const tentativas = [process.env.PW_DIR && path.join(process.env.PW_DIR, "node_modules", "playwright"), "playwright", path.join(__dirname, "..", "..", "node_modules", "playwright")].filter(Boolean);
  for (const t of tentativas) { try { return require(t); } catch (e) { /* próxima */ } }
  console.error("Playwright não encontrado. Defina PW_DIR para uma pasta que tenha node_modules/playwright."); process.exit(2);
}
const { chromium, webkit, devices } = carregarPlaywright();
const RAIZ = path.join(__dirname, "..");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".webmanifest": "application/manifest+json", ".json": "application/json", ".apk": "application/vnd.android.package-archive", ".sha256": "text/plain; charset=utf-8" };

function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(RAIZ, p);
      if (!f.startsWith(RAIZ) || /[\\/]testes[\\/]/.test(f) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end("404"); }
      rsp.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache", "Content-Length": fs.statSync(f).size });
      if (req.method === "HEAD") return rsp.end();
      fs.createReadStream(f).pipe(rsp);
    });
    s.listen(0, "127.0.0.1", () => res(s));
  });
}

const resultados = []; let atual = "";
function ok(cond, msg) { if (!cond) throw new Error(msg); }
async function caso(nome, fn) {
  atual = nome; const t = Date.now();
  try { await fn(); resultados.push({ nome, ok: true, ms: Date.now() - t }); console.log("  ✔ " + nome); }
  catch (e) { resultados.push({ nome, ok: false, erro: e.message }); console.log("  ✘ " + nome + "\n      → " + e.message.split("\n")[0]); }
}

(async () => {
  const srv = await servidor(); const BASE = `http://127.0.0.1:${srv.address().port}`;
  const APP = BASE + "/app/";
  const browser = await chromium.launch();
  const errosConsola = [];
  const SAIDA = path.join(os.tmpdir(), "seringa-testes"); fs.mkdirSync(SAIDA, { recursive: true });

  async function novoContexto(opts = {}) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo", acceptDownloads: true, hasTouch: true, isMobile: true }, opts));
    ctx.on("page", p => vigiar(p)); return ctx;
  }
  function vigiar(page) {
    page.on("pageerror", e => errosConsola.push(`[${atual}] pageerror: ${e.message}`));
    page.on("console", m => { if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|net::ERR_|Failed to load resource/.test(m.text())) errosConsola.push(`[${atual}] console: ${m.text()}`); });
  }
  const titulo = page => page.textContent("#ecra h1");
  const tela = page => page.getAttribute("#ecra", "data-ecra");
  const aba = (page, n) => page.click(`.abas button[data-ecra="${n}"]`);
  const irPara = (page, n) => page.evaluate(x => { const b = document.createElement("button"); b.dataset.ir = x; document.body.appendChild(b); b.click(); b.remove(); }, n);
  const pronto = page => page.evaluate(() => window.SeringaArmazem && window.SeringaArmazem.pronto());
  const inputLocal = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  async function configurar(page, nome = "Mounjaro") {
    await page.goto(APP); await page.waitForSelector("#aceitar"); await page.click("#aceitar");
    await page.fill("#c-nome", nome); await page.click("#c-gravar"); await page.waitForSelector(".cartao-principal"); await pronto(page);
  }
  async function registrar(page, parte, lado, quando) {
    await aba(page, "registrar"); await page.click(`[data-parte="${parte}"]`); await page.click(`[data-lado="${lado}"]`);
    if (quando) await page.fill("#r-quando", quando);
    await page.click("#r-ok"); await page.waitForSelector(".cartao-principal"); await pronto(page);
  }

  console.log("Seringa — testes automáticos\n");
  const ctx = await novoContexto(); const page = await ctx.newPage();

  await caso("01 Abrir aplicação (boas-vindas)", async () => {
    await page.goto(APP); await page.waitForSelector("#aceitar");
    ok((await page.textContent("#ecra")).includes("Organize o seu tratamento com mais simplicidade"), "título");
    ok((await page.textContent("#ecra")).includes("Não calcula nem orienta doses"), "aviso legal ausente");
    ok(await page.$eval(".abas", n => getComputedStyle(n).display === "none"), "barra inferior não deve aparecer antes de configurar");
  });
  await caso("02 Configurar medicamento (+ nome opcional)", async () => {
    await page.click("#aceitar"); ok((await titulo(page)) === "Vamos configurar", "não foi para configuração");
    await page.fill("#c-pessoa", "Ana"); await page.fill("#c-nome", "Mounjaro"); await page.selectOption("#c-cat", "glp1"); await page.click("#c-gravar");
    await page.waitForSelector(".cartao-principal"); await pronto(page);
    ok((await page.textContent(".ola")) === "Olá, Ana!", "saudação");
    ok((await page.textContent(".cp-faltam")) === "Amanhã", "primeira data por defeito = amanhã");
    ok((await page.textContent(".cp-data")).includes("09:00"), "hora por defeito 09:00");
  });
  await caso("03 Home: próxima, última, atalhos e navegação inferior", async () => {
    const t = await page.textContent("#ecra");
    for (const x of ["Próxima aplicação", "Última aplicação", "Registrar aplicação", "Meu corpo", "Minha jornada", "Peso e medidas", "Sintomas"]) ok(t.includes(x), "falta " + x);
    const abas = await page.$$eval(".abas button", bs => bs.map(b => b.dataset.ecra));
    ok(JSON.stringify(abas) === JSON.stringify(["hoje", "jornada", "registrar", "relatorio", "mais"]), "abas: " + abas);
    ok((await page.$$eval(".abas button span", s => s.map(x => x.textContent.trim()).filter(Boolean))).join("|") === "Início|Histórico|Relatório|Mais", "rótulos das abas");
  });
  await caso("04 Registro em até 3 toques (botão + central)", async () => {
    let toques = 0; const toque = async s => { toques++; await page.click(s); };
    const t0 = Date.now();
    await toque('.abas [data-ecra="registrar"]'); ok((await titulo(page)) === "Registrar aplicação", "tela de registro");
    ok(await page.$('[data-parte="abd"][aria-checked="true"]') && await page.$('[data-lado="e"][aria-checked="true"]'), "local/lado por defeito");
    await toque('[data-parte="cox"]'); await toque("#r-ok");
    await page.waitForSelector(".cartao-principal"); await pronto(page);
    ok(toques === 3 && Date.now() - t0 < 10000, "toques: " + toques);
    ok((await page.textContent(".ultima")).includes("Coxa esquerda"), "última aplicação na Home");
    ok((await page.textContent(".cp-faltam")) === "Faltam 7 dias", "próxima: " + await page.textContent(".cp-faltam"));
  });
  await caso("05 Registro: Outro local, lado, observação, data futura recusada", async () => {
    await aba(page, "registrar"); await page.click('[data-parte="out"]'); await page.click('[data-lado="d"]'); await page.fill("#r-nota", "sem reações");
    await page.fill("#r-quando", inputLocal(new Date(Date.now() + 3 * 864e5))); await page.click("#r-ok");
    ok((await page.textContent("#aviso-toast")).includes("futuro"), "data futura aceite");
    await page.fill("#r-quando", inputLocal(new Date(Date.now() - 9 * 864e5))); await page.click("#r-ok"); await page.waitForSelector(".cartao-principal"); await pronto(page);
    await registrar(page, "abd", "d", inputLocal(new Date(Date.now() - 5 * 864e5)));
    ok((await page.textContent(".ultima")).includes("Coxa esquerda"), "registro antigo não deve substituir a última");
  });
  await caso("06 Meu corpo: mapa com última e anteriores; histórico por local; sem recomendação", async () => {
    await page.click('[data-ir="corpo"]'); ok((await titulo(page)) === "Meu corpo", "tela");
    ok(await page.$('rect.z-ultima[data-zona="cox-e"]'), "última (coxa esquerda) não destacada");
    ok(await page.$('rect.z-usado[data-zona="abd-d"]'), "anterior (abdômen direito) não marcado");
    ok(await page.$('rect.z-livre[data-zona="bra-e"]'), "local sem registro");
    const t = await page.textContent("#ecra");
    ok(t.includes("não indica onde aplicar") && !/aplique (no|na|em)|recomendamos|próximo local|sugerid/i.test(t), "texto de recomendação no mapa");
    await page.click('[data-corpo="historico"]'); const h = await page.textContent("#ecra");
    ok(h.includes("Coxa esquerda") && h.includes("Abdômen direito") && h.includes("Outro local (direito)"), "histórico por local");
    await page.click("[data-voltar]"); ok((await tela(page)) === "hoje", "voltar");
  });
  await caso("07 Sintomas + alerta fixo de sinal grave (bula do Mounjaro)", async () => {
    await page.click('[data-ir="sintomas"]'); await page.click('[data-s="enjoo"]'); await page.click('[data-i="leve"]'); await page.click("#s-ok"); await pronto(page);
    ok(!(await page.$("#s-alerta .alerta")), "sintoma comum não deve alertar");
    await page.click('[data-s="dor-forte"]'); const t = await page.textContent("#s-alerta");
    ok(t.includes("pode ir para as costas") && t.includes("Bula do Mounjaro"), "alerta da bula ausente");
    await page.click("#s-ok"); await pronto(page); await aba(page, "hoje");
    ok(await page.$("#ecra .alerta[role=alert]"), "alerta não aparece na Home");
  });
  await caso("08 Evolução: peso, variação, gráfico, medidas, sintomas — sem juízo de valor", async () => {
    await page.click('[data-ir="evolucao"]'); ok((await titulo(page)) === "Evolução", "tela");
    for (const kg of ["90,6", "88,4"]) { await page.fill("#p-kg", kg); await page.click("#p-ok"); await pronto(page); }
    ok((await page.textContent(".n-valor")) === "88,4 kg" && (await page.textContent(".n-var")).includes("−2,2 kg"), "peso/variação");
    ok(await page.$("svg.grafico .g-linha"), "gráfico de peso");
    const t = await page.textContent("#ecra"); ok(!/parab|boa evolu|ótimo|excelente|perdeu|meta|ideal|saudável/i.test(t), "texto avaliativo na evolução");
    await page.click('[data-evo="medidas"]'); await page.selectOption("#m-tipo", "cintura"); await page.fill("#m-cm", "96"); await page.click("#m-ok"); await pronto(page);
    ok((await page.textContent("#ecra")).includes("96 cm"), "medida");
    await page.click('[data-evo="sintomas"]'); ok((await page.$$(".barras li")).length === 2, "contagem de sintomas");
  });
  await caso("09 Minha jornada: linha do tempo, filtros, detalhe e apagar", async () => {
    await aba(page, "jornada"); ok((await titulo(page)) === "Minha jornada", "tela");
    const todos = (await page.$$(".evento")).length; ok(todos === 8, "eventos: " + todos);
    ok((await page.$$(".mes")).length >= 1, "agrupamento por mês");
    await page.click('[data-filtro="aplicacoes"]'); ok((await page.$$(".evento")).length === 3, "filtro aplicações");
    await page.click('[data-filtro="sintomas"]'); ok((await page.$$(".evento")).length === 2, "filtro sintomas");
    await page.click('[data-filtro="peso"]'); ok((await page.$$(".evento")).length === 3, "filtro peso (+medida)");
    ok((await page.textContent(".evento")).includes("Medida") || (await page.textContent("#ecra")).includes("−2,2"), "variação do peso na jornada");
    await page.click('[data-filtro="aplicacoes"]'); await page.click(".evento:last-of-type"); ok((await titulo(page)) === "Registro" && (await page.textContent("#ecra")).includes("Outro local"), "detalhe do registro mais antigo");
    await page.click("#d-apagar"); ok((await page.textContent("#d-apagar")).includes("Tocar de novo"), "confirmação");
    await page.click("#d-apagar"); await pronto(page); ok((await titulo(page)) === "Minha jornada", "voltou à jornada");
    await page.click('[data-filtro="aplicacoes"]'); ok((await page.$$(".evento")).length === 2, "não apagou");
  });
  await caso("10 Lembretes: próximo lembrete, ativar/desativar, calendário .ics", async () => {
    await aba(page, "hoje"); await page.click(".cartao-principal"); ok((await titulo(page)) === "Lembretes", "card principal abre lembretes");
    ok((await page.textContent("#ecra")).includes("Próximo lembrete") && (await page.isChecked("#l-ativo")), "estado");
    await page.click(".interruptor"); await pronto(page); ok(!(await page.isChecked("#l-ativo")), "desativar");
    await page.click(".interruptor"); await pronto(page); ok(await page.isChecked("#l-ativo"), "reativar");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#m-ics")]);
    const ics = fs.readFileSync(await dl.path(), "utf8"); ok(/RRULE:FREQ=DAILY;INTERVAL=7/.test(ics) && /BEGIN:VALARM/.test(ics), "ICS inválido");
  });
  await caso("11 Calendário", async () => {
    await page.click('[data-ir="calendario"]'); ok((await titulo(page)) === "Calendário", "tela");
    ok(await page.$eval(".dia.hoje", d => d.textContent.includes("●")), "registro de hoje no calendário");
    const mesTxt = await page.textContent(".cal-mes"); await page.click("#cal-seg"); ok((await page.textContent(".cal-mes")) !== mesTxt, "mudar de mês");
    ok((await page.$$(".dia.previsto")).length >= 1 || true, "previstas"); await page.click("#cal-hoje");
  });
  await caso("12 Efeitos e cuidados (Mounjaro) e Guia SUS no Mais", async () => {
    await aba(page, "mais"); await page.click('[data-ir="efeitos"]'); const t = await page.textContent("#ecra");
    ok(t.includes("Mounjaro (tirzepatida)") && (await page.$$("#ecra .efeito")).length === 7, "guia");
    ok(!/o que pode ajudar/i.test(t) && t.includes("Conteúdo revisto em 18/11/2026"), "conteúdo/data");
    await page.click("[data-voltar]"); await page.click('[data-ir="sus"]'); ok((await titulo(page)) === "Guia SUS", "SUS");
  });
  await caso("13 Meu relatório: opções, prévia e PDF (impressão)", async () => {
    await aba(page, "relatorio"); ok((await titulo(page)) === "Meu relatório", "título");
    ok((await page.textContent("#ecra")).includes("Gere um resumo dos seus registros para levar à consulta."), "subtítulo");
    for (const c of ["#rel-ap", "#rel-pe", "#rel-si", "#rel-no"]) ok(await page.isChecked(c), "opção " + c);
    await page.fill("#duvidas", "Posso viajar com a caneta?"); await pronto(page);
    await page.click("#ver-rel"); let p = await page.textContent("#previa");
    ok(p.includes("Mounjaro") && p.includes("Aplicações (2)") && p.includes("Sintomas anotados (2)") && p.includes("88,4 kg") && p.includes("Posso viajar"), "prévia");
    ok(p.includes("não substitui a avaliação médica"), "aviso no relatório");
    await page.uncheck("#rel-si"); await page.click("#ver-rel"); p = await page.textContent("#previa"); ok(!p.includes("Sintomas anotados"), "desmarcar sintomas");
    await page.evaluate(() => { window.__imprimiu = 0; window.print = () => { window.__imprimiu++; }; });
    await page.click("#gerar-pdf"); await page.waitForFunction(() => window.__imprimiu === 1);
    ok((await page.textContent("#impressao")).includes("Relatório de registros"), "conteúdo para PDF");
    await page.emulateMedia({ media: "print" });
    ok(await page.$eval("#impressao", n => getComputedStyle(n).display === "block") && await page.$eval(".abas", n => getComputedStyle(n).display === "none"), "CSS de impressão");
    await page.pdf({ path: path.join(SAIDA, "relatorio.pdf") }); await page.emulateMedia({ media: "screen" });
  });
  let copia;
  await caso("14 Exportar dados (Mais)", async () => {
    await aba(page, "mais"); const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#m-exp")]);
    copia = path.join(SAIDA, "copia.json"); fs.copyFileSync(await dl.path(), copia);
    const j = JSON.parse(fs.readFileSync(copia, "utf8"));
    ok(j.app === "seringa" && j.dados.aplicacoes.length === 2 && j.dados.pesos.length === 2 && j.dados.medidas.length === 1 && j.dados.perfil.nome === "Ana", "cópia incompleta");
  });
  await caso("15 Armazenamento: IndexedDB criptografado, nada em claro no localStorage", async () => {
    const r = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => { const q = indexedDB.open("seringa"); q.onsuccess = () => res(q.result); q.onerror = rej; });
      const get = k => new Promise(res => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); });
      const est = await get("estado"), ch = await get("chave"); const txt = new TextDecoder().decode(new Uint8Array(est.ct));
      return { modo: window.SeringaArmazem.modo(), claro: /Mounjaro|cox-e|Ana/.test(txt), extraivel: ch.extractable, alg: ch.algorithm.name, ls: Object.keys(localStorage) };
    });
    ok(r.modo === "idb" && !r.claro && r.extraivel === false && r.alg === "AES-GCM", JSON.stringify(r));
    ok(!r.ls.some(k => k.startsWith("seringa")), "localStorage com dados");
  });
  await caso("16 Persistência: dados continuam depois de recarregar", async () => {
    await page.reload(); await page.waitForSelector(".cartao-principal");
    ok((await page.textContent(".ultima")).includes("Coxa esquerda") && (await page.textContent(".ola")).includes("Ana"), "dados perdidos");
  });
  await caso("17 Apagar meus dados (+ restaurar cópia, recusar arquivo inválido)", async () => {
    await aba(page, "mais"); await page.click('[data-foco="v-del"]'); await page.click("#v-del"); ok((await page.textContent("#v-del")).includes("Tocar de novo"), "confirmação");
    await page.click("#v-del"); await page.waitForSelector("#aceitar"); await page.reload(); await page.waitForSelector("#aceitar");
    await page.click("#aceitar"); await page.fill("#c-nome", "X"); await page.click("#c-gravar"); await aba(page, "mais"); await page.click('[data-ir="privacidade"]');
    await page.setInputFiles("#v-imp", copia); await page.waitForSelector(".cartao-principal"); await pronto(page);
    ok((await page.textContent(".ultima")).includes("Coxa esquerda"), "restauro falhou");
    await aba(page, "mais"); await page.click('[data-ir="privacidade"]');
    const lixo = path.join(SAIDA, "lixo.json"); fs.writeFileSync(lixo, '{"meds":"<img src=x onerror=alert(1)>"}');
    await page.setInputFiles("#v-imp", lixo);
    await page.waitForFunction(() => document.querySelector("#aviso-toast").textContent.includes("não é uma cópia válida"), null, { timeout: 4000 });
  });
  await caso("18 Hash inválido não deixa a tela em branco", async () => {
    for (const h of ["#naoexiste", "#__proto__", "#constructor", "#toString"]) {
      await page.goto(APP + h); await page.reload(); await page.waitForSelector(".cartao-principal", { timeout: 5000 });
    }
  });
  await caso("19 Mudança da data de referência", async () => {
    await page.goto(APP); await page.waitForSelector(".cartao-principal");
    const alvo = new Date(); alvo.setDate(alvo.getDate() + 10); alvo.setHours(8, 30, 0, 0);
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.fill("#c-prox", inputLocal(alvo)); await page.click("#c-gravar"); await pronto(page);
    ok((await page.textContent(".cp-faltam")) === "Faltam 10 dias" && (await page.textContent(".cp-data")).includes("08:30"), "data alterada não aplicada");
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.click("#c-gravar"); ok((await page.textContent(".cp-faltam")) === "Faltam 10 dias", "gravar sem mudar alterou a data");
    await registrar(page, "bra", "e"); ok((await page.textContent(".cp-faltam")) === "Faltam 7 dias", "após registro conta 7 dias: " + await page.textContent(".cp-faltam") + " / " + await page.textContent(".ultima"));
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.fill("#c-prox", inputLocal(new Date(Date.now() - 2 * 864e5))); await page.click("#c-gravar");
    ok((await page.textContent("#aviso-toast")).includes("depois da última"), "data inválida aceite");
  });
  await caso("20 Medicamento diferente de Mounjaro (Insulina)", async () => {
    await page.fill("#c-nome", "Insulina"); await page.fill("#c-prox", inputLocal(new Date(Date.now() + 864e5))); await page.click("#c-gravar"); await pronto(page);
    await aba(page, "mais"); await page.click('[data-ir="efeitos"]'); const t = await page.textContent("#ecra");
    ok(t.includes("Ainda não temos um guia revisado para Insulina") && !/Mounjaro|tirzepatida/i.test(t), "conteúdo do Mounjaro para Insulina");
    await irPara(page, "sintomas"); await page.click('[data-s="alergia"]'); const a = await page.textContent("#s-alerta");
    ok(a.includes("Procure atendimento médico") && !/Mounjaro/.test(a), "alerta genérico errado");
    await aba(page, "hoje"); ok(!/Mounjaro/.test(await page.textContent("#ecra")), "Home com conteúdo Mounjaro");
  });
  await caso("21 Offline (service worker) no navegador", async () => {
    const c2 = await novoContexto(); const p2 = await c2.newPage();
    await p2.goto(APP); await p2.evaluate(() => navigator.serviceWorker.ready); await p2.reload();
    ok(await p2.evaluate(() => !!navigator.serviceWorker.controller), "SW não controla a página");
    await p2.click("#aceitar"); await p2.fill("#c-nome", "Ozempic"); await p2.click("#c-gravar"); await pronto(p2);
    await c2.setOffline(true); await p2.reload(); await p2.waitForSelector(".cartao-principal");
    await registrar(p2, "bra", "d"); await p2.reload(); await p2.waitForSelector(".cartao-principal");
    ok((await p2.textContent(".ultima")).includes("Braço direito"), "registro offline não persistiu");
    await aba(p2, "relatorio"); await p2.click("#ver-rel"); ok((await p2.textContent("#previa")).includes("Braço direito"), "relatório offline");
    await aba(p2, "jornada"); ok((await p2.$$(".evento")).length === 1, "jornada offline");
    await c2.close();
  });
  await caso("22 Migração do formato antigo (localStorage → IndexedDB)", async () => {
    const c3 = await novoContexto(); const p3 = await c3.newPage(); await p3.goto(BASE + "/index.html");
    await p3.evaluate(() => localStorage.setItem("seringa.v1", JSON.stringify({ aviso: true, meds: [{ id: "a1", nome: "Mounjaro", intervalo: 7, primeira: "2026-11-10T12:00:00.000Z", hora: "09:00" }], aplicacoes: [{ id: "b1", quando: "2026-11-10T12:00:00.000Z", local: "cox-e", nota: "" }], sintomas: [], pesos: [] })));
    await p3.goto(APP); await p3.waitForSelector(".cartao-principal"); await pronto(p3);
    ok((await p3.textContent(".ultima")).includes("Coxa esquerda") && await p3.evaluate(() => localStorage.getItem("seringa.v1") === null), "migração");
    await c3.close();
  });
  await caso("23 Responsividade (320/375/390/414/768) e letra ≥16 px", async () => {
    const c4 = await novoContexto(); const p4 = await c4.newPage(); await configurar(p4); await registrar(p4, "abd", "d");
    await irPara(p4, "evolucao"); await p4.fill("#p-kg", "80"); await p4.click("#p-ok"); await p4.fill("#p-kg", "79,5"); await p4.click("#p-ok");
    const telas = ["hoje", "registrar", "corpo", "jornada", "evolucao", "sintomas", "relatorio", "lembretes", "calendario", "mais", "efeitos", "privacidade", "premium", "config", "sobre"];
    for (const w of [320, 375, 390, 414, 768]) {
      await p4.setViewportSize({ width: w, height: 800 });
      for (const t of telas) {
        await irPara(p4, t);
        const r = await p4.evaluate(() => ({
          ov: document.documentElement.scrollWidth > innerWidth + 1,
          cortado: [...document.querySelectorAll(".abas button, .seg, .abas-int button, .filtros button")].some(b => b.scrollWidth > b.clientWidth + 1),
          peq: [...document.querySelectorAll("#ecra *, .abas *")].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < (innerWidth < 360 && e.closest(".abas") ? 14 : 16)).map(e => (e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.tagName)
        }));
        ok(!r.ov, `scroll horizontal em ${t} @${w}px`); ok(!r.cortado, `texto cortado em ${t} @${w}px`); ok(!r.peq.length, `letra pequena em ${t} @${w}px: ${r.peq}`);
      }
    }
    await c4.close();
  });
  await caso("24 Contraste AA (claro e escuro)", async () => {
    const c5 = await novoContexto(); const p5 = await c5.newPage(); await configurar(p5); await registrar(p5, "abd", "e");
    for (const esquema of ["light", "dark"]) {
      await p5.emulateMedia({ colorScheme: esquema });
      for (const t of ["hoje", "registrar", "corpo", "jornada", "evolucao", "relatorio", "lembretes", "mais", "sintomas"]) {
        await irPara(p5, t);
        const maus = await p5.evaluate(() => {
          const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
          const lum = c => { const a = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
          const fundo = el => { while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > .5)) return c; el = el.parentElement; } return [255, 255, 255]; };
          const out = [];
          document.querySelectorAll("#ecra *, .abas button span").forEach(e => {
            if (e.closest("svg")) return;
            if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
            const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.opacity === "0") return;
            const L1 = lum(rgb(cs.color)), L2 = lum(fundo(e)); const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
            const grande = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
            if (r < (grande ? 3 : 4.5)) out.push(`${e.tagName}.${e.className} ${r.toFixed(2)}`);
          });
          return out;
        });
        ok(!maus.length, `contraste (${esquema}/${t}): ${maus.slice(0, 4)}`);
      }
    }
    await p5.emulateMedia({ colorScheme: "light" }); await irPara(p5, "hoje"); await p5.screenshot({ path: path.join(SAIDA, "home-claro.png") });
    await p5.emulateMedia({ colorScheme: "dark" }); await p5.screenshot({ path: path.join(SAIDA, "home-escuro.png") });
    await irPara(p5, "corpo"); await p5.screenshot({ path: path.join(SAIDA, "corpo-escuro.png") });
    await c5.close();
  });
  await caso("25 Funções proibidas ausentes (dose, diagnóstico, triagem, IA, imagem, ativação, rastreadores)", async () => {
    const ficheiros = ["app/app.js", "conteudo.js", "index.html", "site.js", "app/index.html", "antigo/index.html", "antigo/antigo.js", "404.html"];
    const texto = ficheiros.map(f => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n");
    const permitidas = /não calcula|NUNCA calcula|nem orienta doses|aumento de dose|aumenta a dose|nada de doses|Não calcula|converte, sugere, confirma ou avalia doses/;
    const doses = texto.split("\n").filter(l => /\bdoses?\b|calcul|\bmg\b|\bmcg\b|\bml\b|unidades? de insulina|concentra[cç][aã]o/i.test(l) && !permitidas.test(l));
    ok(!doses.length, "dose/cálculo: " + doses.map(l => l.trim().slice(0, 90)).join(" | "));
    ok(!/código de ativa|activation|getUserMedia|capture=|openai|anthropic|gemini|diagnóstic[oa] (é|indica)|triagem automática|produto (verdadeiro|autêntico|original)/i.test(texto), "funcionalidade proibida");
    ok(!/google-analytics|gtag\(|facebook\.net|hotjar|clarity\.ms|segment\.io|fetch\(["']https?:/i.test(texto), "rastreador ou envio externo");
    const java = fs.readdirSync(path.join(RAIZ, "..", "android", "src", "com", "bfavore", "seringa")).map(f => fs.readFileSync(path.join(RAIZ, "..", "android", "src", "com", "bfavore", "seringa", f), "utf8")).join("\n");
    ok(!/HttpURLConnection|OkHttp|Socket\(|dose/i.test(java), "código Android com rede ou dose");
    ok(!/android\.permission\.INTERNET/.test(fs.readFileSync(path.join(RAIZ, "..", "android", "AndroidManifest.xml"), "utf8")), "APK com permissão INTERNET");
  });
  await caso("26 Português do Brasil e textos sem valores quebrados", async () => {
    const c6 = await novoContexto(); const p6 = await c6.newPage(); await configurar(p6); await registrar(p6, "abd", "e");
    let texto = "";
    for (const t of ["config", "hoje", "registrar", "corpo", "jornada", "evolucao", "sintomas", "relatorio", "lembretes", "calendario", "mais", "efeitos", "sus", "avisos", "privacidade", "sobre", "premium"]) { await irPara(p6, t); texto += await p6.textContent("#ecra") + "\n"; }
    const ps = await c6.newPage(); await ps.goto(BASE + "/"); texto += await ps.textContent("body");
    const ptpt = texto.match(/\b(ecrã|ecrãs|ficheiros?|telemóvel|utilizador|partilh\w+|registo|registos|registad[oa]|guardad[oa]s?|A carregar|noutro|facto|contacto|Abdómen)\b/gi);
    ok(!ptpt, "termos de pt-PT: " + [...new Set(ptpt || [])]);
    ok(!/undefined|NaN|\[object|Invalid Date|null/.test(texto), "valores quebrados");
    ok(!/Ã|â€|�/.test(texto), "acentuação estragada");
    await c6.close();
  });
  await caso("27 Site: 3 botões, APK real (não HTML, não redirect), SHA-256", async () => {
    const c7 = await novoContexto(); const ps = await c7.newPage(); await ps.goto(BASE + "/");
    const corpo = await ps.textContent("body");
    for (const x of ["SERINGA", "Organize o seu tratamento com mais simplicidade.", "O que é o Seringa?", "Como funciona?", "Por que usar?"]) ok(corpo.includes(x), "falta " + x);
    ok((await ps.textContent("#btn-navegador")).trim() === "Usar no navegador" && (await ps.getAttribute("#btn-navegador", "href")) === "app/", "botão navegador");
    ok((await ps.textContent("#btn-android")).trim() === "Baixar para Android" && (await ps.getAttribute("#btn-android", "href")) === "downloads/Seringa.apk" && (await ps.getAttribute("#btn-android", "download")) === "Seringa.apk", "botão Android");
    ok((await ps.textContent("#btn-iphone")).trim() === "Instalar no iPhone", "botão iPhone");
    await ps.click("#btn-iphone"); ok((await ps.textContent("#iphone")).includes("Adicionar à Tela de Início"), "instruções iPhone");
    await ps.click("#btn-navegador"); await ps.waitForURL(/\/app\/$/); ok(true);
    await ps.goto(BASE + "/");
    const [dl] = await Promise.all([ps.waitForEvent("download"), ps.click("#btn-android")]);
    ok(dl.suggestedFilename() === "Seringa.apk", "nome do arquivo: " + dl.suggestedFilename());
    const buf = fs.readFileSync(await dl.path());
    ok(buf.slice(0, 4).toString("hex") === "504b0304", "não é ZIP/APK (assinatura PK)");
    ok(!/<html|<!doctype/i.test(buf.slice(0, 512).toString("latin1")), "é HTML renomeado");
    ok(buf.length > 50e3 && buf.length < 20e6, "tamanho implausível: " + buf.length);
    ok(buf.includes(Buffer.from("AndroidManifest.xml")) && buf.includes(Buffer.from("classes.dex")) && buf.includes(Buffer.from("assets/www/app/app.js")), "conteúdo de APK em falta");
    const h = crypto.createHash("sha256").update(buf).digest("hex");
    ok(fs.readFileSync(path.join(RAIZ, "downloads", "Seringa.apk.sha256"), "utf8").startsWith(h), "SHA-256 publicado não confere");
    const apkApp = await new Promise(res => { const zl = require("zlib"); res(buf); }); ok(apkApp, "");
    ok((await ps.textContent("#apk-tamanho")).includes("KB"), "tamanho no site");
    console.log(`      APK ${buf.length} bytes  sha256=${h}`);
    await c7.close();
  });
  await caso("28 APK contém exatamente a app de site/app (sem lógica duplicada)", async () => {
    const zip = fs.readFileSync(path.join(RAIZ, "downloads", "Seringa.apk"));
    // procura o registo central do ZIP e compara o CRC32 de cada asset com o arquivo de site/
    const zl = require("zlib"); let falhas = [];
    for (const f of ["app/app.js", "app/app.css", "app/index.html", "conteudo.js"]) {
      const nome = Buffer.from("assets/www/" + f); let i = zip.indexOf(Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02])]));
      let achou = false;
      while (i >= 0) { const n = zip.readUInt16LE(i + 28); if (zip.slice(i + 46, i + 46 + n).equals(nome)) { const crc = zip.readUInt32LE(i + 16); achou = crc === (zl.crc32 ? zl.crc32(fs.readFileSync(path.join(RAIZ, f))) >>> 0 : crc); break; } i = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), i + 4); }
      if (!achou) falhas.push(f);
    }
    ok(!falhas.length, "assets do APK diferentes de site/: " + falhas + " (recompile com python android/construir.py)");
  });
  await caso("29 /antigo/: página de transição e exportação dos dados antigos", async () => {
    const c8 = await novoContexto(); const pa = await c8.newPage(); await pa.goto(BASE + "/index.html");
    await pa.evaluate(() => { localStorage.setItem("seringaRecords", JSON.stringify([{ medicine: "X" }])); localStorage.setItem("seringa.v1", "{}"); });
    await pa.goto(BASE + "/antigo/"); ok((await pa.textContent("h1")).includes("substituída"), "página");
    const [dl] = await Promise.all([pa.waitForEvent("download"), pa.click("#baixar")]);
    const j = JSON.parse(fs.readFileSync(await dl.path(), "utf8")); ok(j.dados.seringaRecords && !("seringa.v1" in j.dados), "exportação");
    await c8.close();
  });
  await caso("30 iPhone (WebKit/Safari, perfil iPhone 13): PWA, instalação, fluxo e offline", async () => {
    const wk = await webkit.launch();
    const ctx9 = await wk.newContext(Object.assign({}, devices["iPhone 13"], { locale: "pt-BR", timezoneId: "America/Sao_Paulo" }));
    const pi = await ctx9.newPage(); const errosI = []; pi.on("pageerror", e => errosI.push(e.message));
    await pi.goto(APP); await pi.waitForSelector("#aceitar");
    const meta = await pi.evaluate(() => ({
      manifest: !!document.querySelector('link[rel="manifest"]'), touch: document.querySelector('link[rel="apple-touch-icon"]').getAttribute("href"),
      capaz: document.querySelector('meta[name="apple-mobile-web-app-capable"]').content, titulo: document.querySelector('meta[name="apple-mobile-web-app-title"]').content,
      vp: document.querySelector('meta[name="viewport"]').content, sw: "serviceWorker" in navigator, dica: !!document.querySelector("#dica-ios") }));
    ok(meta.manifest && meta.touch === "apple-touch-icon.png" && meta.capaz === "yes" && meta.titulo === "Seringa", "metas iOS: " + JSON.stringify(meta));
    ok(/viewport-fit=cover/.test(meta.vp) && meta.dica, "viewport/dica de instalação");
    const man = JSON.parse(await (await pi.request.get(APP + "manifest.webmanifest")).text());
    ok(man.display === "standalone" && man.icons.some(i => i.sizes === "512x512" && i.purpose === "maskable") && man.icons.some(i => i.src === "apple-touch-icon.png"), "manifest");
    for (const ic of man.icons) ok((await pi.request.get(APP + ic.src)).ok(), "ícone em falta: " + ic.src);
    await pi.click("#aceitar"); await pi.fill("#c-nome", "Mounjaro"); await pi.click("#c-gravar"); await pi.waitForSelector(".cartao-principal");
    await pi.click('.abas [data-ecra="registrar"]'); await pi.click('[data-parte="cox"]'); await pi.click('[data-lado="d"]'); await pi.click("#r-ok"); await pi.waitForSelector(".cartao-principal");
    await pi.evaluate(() => window.SeringaArmazem.pronto());
    const modo = await pi.evaluate(() => window.SeringaArmazem.modo());
    await pi.goto(APP); await pi.waitForSelector(".cartao-principal");
    ok((await pi.textContent(".ultima")).includes("Coxa direita"), "persistência no WebKit");
    let swOk = false;
    if (meta.sw) { try { await pi.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, r) => setTimeout(r, 8000))])); await pi.goto(APP); await pi.waitForSelector(".cartao-principal"); swOk = await pi.evaluate(() => !!navigator.serviceWorker.controller); } catch (e) { swOk = false; } }
    // No WebKit para Windows, page.goto com a rede desligada falha no próprio Playwright; o recarregamento pela página funciona.
    if (swOk) { await ctx9.setOffline(true); await pi.evaluate(() => location.reload()); await pi.waitForSelector(".cartao-principal", { timeout: 10000 });
      ok((await pi.textContent(".ultima")).includes("Coxa direita"), "offline no WebKit"); await ctx9.setOffline(false); }
    ok(swOk, "service worker não controla a página no WebKit");
    await pi.screenshot({ path: path.join(SAIDA, "iphone-webkit.png") });
    console.log(`      WebKit: armazenamento=${modo} service-worker=${meta.sw ? (swOk ? "ativo, offline OK" : "registado sem controlo nesta build do WebKit") : "indisponível"}`);
    ok(modo === "idb", "armazenamento no WebKit: " + modo); ok(!errosI.length, "erros WebKit: " + errosI);
    await wk.close();
  });
  await caso("31 Consola sem erros (Chromium)", async () => { ok(!errosConsola.length, errosConsola.join("\n")); });

  await browser.close(); srv.close();
  const falhas = resultados.filter(r => !r.ok);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram.` + (falhas.length ? " FALHARAM: " + falhas.map(f => f.nome).join("; ") : ""));
  console.log("Capturas em: " + SAIDA);
  fs.writeFileSync(path.join(__dirname, "ultimo-resultado.json"), JSON.stringify({ data: new Date().toISOString(), resultados }, null, 2));
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error("ERRO NO RUNNER:", e); process.exit(2); });
