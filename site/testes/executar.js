/* Testes automáticos do Seringa (site + app PWA).
   Uso:  node testes/executar.js
   Requer o pacote "playwright" com Chromium instalado. Procura-o em: variável PW_DIR, ./node_modules, ou instalação global.
   Não precisa de internet: sobe um servidor estático local para a pasta do site. */
"use strict";
process.env.TZ = "America/Sao_Paulo"; // mesmo fuso do navegador de teste
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");

function carregarPlaywright() {
  const tentativas = [process.env.PW_DIR && path.join(process.env.PW_DIR, "node_modules", "playwright"), "playwright", path.join(__dirname, "..", "node_modules", "playwright")].filter(Boolean);
  for (const t of tentativas) { try { return require(t); } catch (e) { /* próxima */ } }
  console.error("Playwright não encontrado. Defina PW_DIR para uma pasta que tenha node_modules/playwright."); process.exit(2);
}
const { chromium } = carregarPlaywright();
const RAIZ = path.join(__dirname, "..");
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };

function servidor() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(RAIZ, p);
      if (!f.startsWith(RAIZ) || /[\\/]testes[\\/]/.test(f) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end("404"); }
      rsp.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
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
  catch (e) { resultados.push({ nome, ok: false, erro: e.message }); console.log("  ✘ " + nome + "\n      → " + e.message); }
}

(async () => {
  const srv = await servidor(); const BASE = `http://127.0.0.1:${srv.address().port}`;
  const APP = BASE + "/app/";
  const browser = await chromium.launch();
  const errosConsola = [];
  const SAIDA = path.join(os.tmpdir(), "seringa-testes"); fs.mkdirSync(SAIDA, { recursive: true });

  async function novoContexto(opts = {}) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 375, height: 812 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo", acceptDownloads: true, hasTouch: true, isMobile: true }, opts));
    ctx.on("page", p => vigiar(p)); return ctx;
  }
  function vigiar(page) {
    page.on("pageerror", e => errosConsola.push(`[${atual}] pageerror: ${e.message}`));
    page.on("console", m => { if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|net::ERR_/.test(m.text())) errosConsola.push(`[${atual}] console: ${m.text()}`); });
  }
  const h1 = page => page.textContent("#ecra h1");
  const aba = (page, n) => page.click(`.abas button[data-ecra="${n}"]`);
  const pronto = page => page.evaluate(() => window.SeringaArmazem && window.SeringaArmazem.pronto());
  async function configurar(page, nome = "Mounjaro") {
    await page.goto(APP); await page.waitForSelector("#aceitar"); await page.click("#aceitar");
    await page.fill("#c-nome", nome); await page.click("#c-gravar"); await page.waitForSelector(".destaque .grande"); await pronto(page);
  }
  async function registrar(page, local, quando) {
    await aba(page, "registrar"); await page.click(`[data-local="${local}"]`);
    if (quando) await page.fill("#r-quando", quando);
    await page.click("#r-ok"); await page.waitForSelector(".destaque .grande"); await pronto(page);
  }
  const inputLocal = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

  console.log("Seringa — testes automáticos\n");
  const ctx = await novoContexto(); const page = await ctx.newPage();

  await caso("01 Abrir aplicação", async () => {
    await page.goto(APP); await page.waitForSelector("#aceitar");
    ok((await h1(page)).includes("Bem-vindo"), "boas-vindas não apareceu");
    ok((await page.textContent("#ecra")).includes("não calcula nem orienta doses"), "aviso legal ausente");
  });
  await caso("02 Configurar medicamento", async () => {
    await page.click("#aceitar"); ok((await h1(page)) === "Vamos configurar", "não foi para configuração");
    await aba(page, "registrar"); ok((await h1(page)) === "Vamos configurar", "registrar sem medicamento deveria pedir configuração");
    await page.fill("#c-nome", "Mounjaro"); await page.selectOption("#c-cat", "glp1"); await page.click("#c-gravar");
    await page.waitForSelector(".destaque .grande"); ok((await h1(page)) === "Olá!", "Hoje não abriu");
    ok((await page.textContent(".destaque .grande")) === "Amanhã", "primeira data por defeito deveria ser amanhã");
    ok((await page.textContent(".destaque")).includes("09:00"), "hora por defeito deveria ser 09:00");
  });
  await caso("03+04 Registar aplicação em até 3 toques após configuração", async () => {
    let toques = 0; const toque = async s => { toques++; await page.click(s); };
    const t0 = Date.now();
    await toque('[data-ir="registrar"]'); await toque('[data-local="abd-e"]'); await toque("#r-ok");
    await page.waitForSelector(".destaque .grande"); await pronto(page);
    ok(toques === 3, "toques: " + toques); ok(Date.now() - t0 < 10000, "demorou mais de 10 s");
    ok((await page.textContent("#ecra")).includes("Abdômen — lado esquerdo"), "último local não aparece");
  });
  await caso("05 Próxima aplicação (intervalo indicado pela pessoa)", async () => {
    ok((await page.textContent(".destaque .grande")) === "Em 7 dias", "esperado 'Em 7 dias', veio " + await page.textContent(".destaque .grande"));
    ok((await page.textContent("#ecra")).includes("uma vez por semana"), "descrição da frequência ausente");
  });
  await caso("06 Rotação dos locais (mapa do corpo)", async () => {
    await aba(page, "registrar");
    ok(await page.$eval('[data-local="abd-e"]', b => b.classList.contains("recente") && b.textContent.includes("último local")), "abd-e devia estar marcado como último");
    const ontem = new Date(Date.now() - 3600e3);
    await page.click('[data-local="cox-d"]'); await page.fill("#r-quando", inputLocal(ontem)); await page.click("#r-ok"); await page.waitForSelector(".destaque"); await pronto(page);
    await aba(page, "registrar");
    const rec = await page.$$eval(".local.recente", bs => bs.map(b => b.dataset.local));
    ok(rec.length === 2 && rec.includes("abd-e") && rec.includes("cox-d"), "recentes: " + rec);
    ok((await page.textContent('[data-local="bra-e"]')).includes("não usado"), "local não usado sem indicação");
    const f = new Date(Date.now() + 3 * 864e5); await page.click('[data-local="bra-d"]'); await page.fill("#r-quando", inputLocal(f)); await page.click("#r-ok");
    ok((await page.textContent("#aviso-toast")).includes("futuro"), "data futura não foi bloqueada");
  });
  await caso("07 Histórico (listar e apagar com confirmação)", async () => {
    await aba(page, "mais"); await page.click('[data-ir="historico"]');
    ok((await page.$$("#ecra .lista li")).length === 2, "esperadas 2 aplicações no histórico");
    const b = await page.$("[data-del^='aplicacoes:']"); await b.click(); ok((await b.textContent()) === "confirmar?", "sem confirmação");
    await b.click(); await pronto(page); ok((await page.$$("#ecra .lista li")).length === 1, "não apagou");
    await registrar(page, "cox-d", inputLocal(new Date(Date.now() - 7200e3)));
  });
  await caso("08 Calendário", async () => {
    await page.click('[data-ir="calendario"]'); ok((await h1(page)) === "Calendário", "calendário não abriu");
    ok(await page.$eval(".dia.hoje", d => d.textContent.includes("💉")), "aplicação de hoje não aparece no calendário");
    const prev = await page.$$(".dia.previsto"); const mesTxt = await page.textContent(".cal-mes");
    await page.click("#cal-seg"); ok((await page.textContent(".cal-mes")) !== mesTxt, "não mudou de mês");
    const prev2 = await page.$$(".dia.previsto"); ok(prev.length + prev2.length >= 1, "nenhuma data prevista");
    await page.click("#cal-hoje"); ok((await page.textContent(".cal-mes")) === mesTxt, "não voltou ao mês atual");
  });
  await caso("09 Sintomas (registo simples)", async () => {
    await aba(page, "sintomas"); await page.click('[data-s="enjoo"]'); await page.click('[data-i="leve"]'); await page.fill("#s-nota", "depois do almoço");
    await page.click("#s-ok"); await pronto(page);
    ok((await page.textContent("#ecra .cartao")).includes("Enjoo (leve)"), "sintoma não aparece na linha do tempo");
    ok(!(await page.$("#s-alerta .alerta")), "sintoma comum não deve mostrar alerta");
  });
  await caso("10 Alerta fixo de sinal grave (Mounjaro: texto da bula)", async () => {
    await page.click('[data-s="dor-forte"]');
    const t = await page.textContent("#s-alerta"); ok(t.includes("pode ir para as costas") && t.includes("Bula do Mounjaro"), "alerta da bula ausente: " + t);
    await page.click("#s-ok"); await pronto(page); await aba(page, "hoje");
    ok(await page.$("#ecra .alerta[role=alert]"), "alerta não aparece em Hoje");
  });
  await caso("11+19 Efeitos e cuidados — Mounjaro", async () => {
    await aba(page, "efeitos"); const t = await page.textContent("#ecra");
    ok(t.includes("Mounjaro (tirzepatida)"), "título do guia"); ok((await page.$$("#ecra .cartao")).length === 7, "7 cartões esperados");
    ok(!/o que pode ajudar/i.test(t), "ainda contém 'O que pode ajudar' (correção GPT §1)");
    ok(t.includes("Conteúdo revisto em 18/11/2026"), "data de revisão errada (B2): " + t.match(/revisto em [\d/]+/));
    ok((await page.$$("#ecra .fonte a")).length >= 7, "fontes em falta");
  });
  await caso("12 Relatório para a consulta", async () => {
    await aba(page, "mais"); await page.click('[data-ir="relatorio"]'); const t = await page.textContent("#ecra");
    ok(t.includes("Mounjaro") && t.includes("Caneta GLP-1"), "medicamento/tipo ausente"); ok(t.includes("Aplicações registradas: 2"), "contagem errada");
    ok(t.includes("Dor forte na barriga") && t.includes("Enjoo"), "sintomas ausentes"); ok(await page.$("#imprimir"), "botão PDF ausente");
    await page.fill("#duvidas", "Posso viajar com a caneta?"); await pronto(page); await page.reload(); await page.waitForSelector(".destaque");
    await aba(page, "mais"); await page.click('[data-ir="relatorio"]'); ok((await page.inputValue("#duvidas")) === "Posso viajar com a caneta?", "dúvidas não persistiram");
  });
  await caso("Lembrete .ics com alarme", async () => {
    await aba(page, "mais"); const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#m-ics")]);
    const ics = fs.readFileSync(await dl.path(), "utf8");
    ok(/RRULE:FREQ=DAILY;INTERVAL=7/.test(ics) && /BEGIN:VALARM/.test(ics) && /SEQUENCE:\d+/.test(ics), "ICS inválido");
  });
  let copia;
  await caso("13 Exportação de dados", async () => {
    await page.click('[data-ir="privacidade"]'); const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#v-exp")]);
    copia = await dl.path(); const j = JSON.parse(fs.readFileSync(copia, "utf8"));
    ok(j.app === "seringa" && j.dados.aplicacoes.length === 2 && j.dados.sintomas.length === 2 && j.dados.meds[0].nome === "Mounjaro", "cópia incompleta");
    fs.copyFileSync(copia, path.join(SAIDA, "copia.json")); copia = path.join(SAIDA, "copia.json");
  });
  await caso("Armazenamento: IndexedDB criptografado, nada em claro no localStorage", async () => {
    const r = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => { const q = indexedDB.open("seringa"); q.onsuccess = () => res(q.result); q.onerror = rej; });
      const get = k => new Promise(res => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); });
      const est = await get("estado"), ch = await get("chave");
      const bytes = new Uint8Array(est.ct); const txt = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return { modo: window.SeringaArmazem.modo(), temIv: est.iv && est.iv.length === 12, claro: txt.includes("Mounjaro") || txt.includes("abd-e"), extraivel: ch.extractable, alg: ch.algorithm.name, ls: Object.keys(localStorage) };
    });
    ok(r.modo === "idb", "modo " + r.modo); ok(r.temIv && !r.claro, "dados não estão cifrados"); ok(r.extraivel === false && r.alg === "AES-GCM", "chave deveria ser AES-GCM não-exportável");
    ok(!r.ls.some(k => k.startsWith("seringa")), "localStorage ainda tem dados: " + r.ls);
  });
  await caso("14 Eliminação de todos os dados (+ restauro da cópia)", async () => {
    await page.click("#v-del"); ok((await page.textContent("#v-del")).includes("Tocar de novo"), "sem confirmação");
    await page.click("#v-del"); await page.waitForSelector("#aceitar"); await page.reload(); await page.waitForSelector("#aceitar");
    ok((await h1(page)).includes("Bem-vindo"), "dados não foram apagados");
    await page.click("#aceitar"); await page.fill("#c-nome", "X"); await page.click("#c-gravar"); await aba(page, "mais"); await page.click('[data-ir="privacidade"]');
    await page.setInputFiles("#v-imp", copia); await page.waitForSelector(".destaque .grande"); await pronto(page);
    ok((await page.textContent("#ecra")).includes("Mounjaro"), "restauro falhou");
    await aba(page, "mais"); await page.click('[data-ir="privacidade"]');
    const lixo = path.join(SAIDA, "lixo.json"); fs.writeFileSync(lixo, '{"meds":"<img src=x onerror=alert(1)>"}');
    await page.setInputFiles("#v-imp", lixo);
    await page.waitForFunction(() => document.querySelector("#aviso-toast").textContent.includes("não é uma cópia válida"), null, { timeout: 4000 }).catch(() => { throw new Error("arquivo inválido aceite"); });
    await aba(page, "hoje"); ok((await page.textContent("#ecra")).includes("Mounjaro"), "dados atuais alterados por arquivo inválido");
  });
  await caso("15 Offline (service worker)", async () => {
    const c2 = await novoContexto(); const p2 = await c2.newPage();
    await p2.goto(APP); await p2.evaluate(() => navigator.serviceWorker.ready); await p2.reload();
    ok(await p2.evaluate(() => !!navigator.serviceWorker.controller), "SW não controla a página");
    await p2.click("#aceitar"); await p2.fill("#c-nome", "Ozempic"); await p2.click("#c-gravar"); await pronto(p2);
    await c2.setOffline(true); await p2.reload(); await p2.waitForSelector(".destaque .grande");
    await registrar(p2, "bra-e"); await p2.reload(); await p2.waitForSelector(".destaque .grande");
    ok((await p2.textContent("#ecra")).includes("Braço — esquerdo"), "registo offline não persistiu");
    await aba(p2, "mais"); await p2.click('[data-ir="relatorio"]'); ok((await h1(p2)).includes("Relatório"), "relatório offline");
    await p2.goto(APP + "qualquer-coisa"); await p2.waitForSelector("#ecra h1"); ok(true);
    await c2.close();
  });
  await caso("16 Hash inválido não deixa o ecrã em branco", async () => {
    for (const h of ["#naoexiste", "#__proto__", "#constructor", "#toString"]) {
      await page.goto(APP + h); await page.reload(); await page.waitForSelector("#ecra h1", { timeout: 4000 });
      ok((await h1(page)) === "Olá!", h + " → " + await h1(page));
    }
  });
  await caso("17 Mudança da data de referência", async () => {
    await page.goto(APP); await page.waitForSelector(".destaque");
    const alvo = new Date(); alvo.setDate(alvo.getDate() + 10); alvo.setHours(8, 30, 0, 0);
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.fill("#c-prox", inputLocal(alvo)); await page.click("#c-gravar"); await pronto(page);
    ok((await page.textContent(".destaque .grande")) === "Em 10 dias", "B3: data alterada não foi aplicada (" + await page.textContent(".destaque .grande") + ")");
    ok((await page.textContent(".destaque")).includes("08:30"), "hora alterada não aplicada");
    // mudar só a frequência mantém a data e não a congela
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.click("#c-gravar"); ok((await page.textContent(".destaque .grande")) === "Em 10 dias", "gravar sem mudar alterou a data");
    // registo depois do ajuste volta a contar a partir da aplicação
    await registrar(page, "bra-e"); ok((await page.textContent(".destaque .grande")) === "Em 7 dias", "após registo deveria contar 7 dias");
    // data anterior à última aplicação é recusada
    await aba(page, "mais"); await page.click('[data-ir="config"]'); await page.fill("#c-prox", inputLocal(new Date(Date.now() - 2 * 864e5))); await page.click("#c-gravar");
    ok((await page.textContent("#aviso-toast")).includes("depois da última"), "data inválida aceite");
  });
  await caso("18 Medicamento diferente de Mounjaro (sem conteúdo do Mounjaro)", async () => {
    await page.fill("#c-nome", "Insulina"); await page.fill("#c-prox", inputLocal(new Date(Date.now() + 864e5))); await page.click("#c-gravar"); await pronto(page);
    await aba(page, "efeitos"); const t = await page.textContent("#ecra");
    ok(t.includes("Ainda não temos um guia revisado para Insulina"), "mensagem para outro medicamento ausente");
    ok(!/Mounjaro|tirzepatida/i.test(t), "B6: conteúdo do Mounjaro aparece para Insulina");
    await aba(page, "sintomas"); await page.click('[data-s="alergia"]'); const a = await page.textContent("#s-alerta");
    ok(a.includes("Procure atendimento médico") && !/Mounjaro/.test(a), "alerta genérico errado: " + a);
    await aba(page, "hoje"); ok(!/Mounjaro/.test(await page.textContent("#ecra")), "Hoje mostra conteúdo Mounjaro");
  });
  await caso("Migração do formato antigo (localStorage → IndexedDB)", async () => {
    const c3 = await novoContexto(); const p3 = await c3.newPage(); await p3.goto(BASE + "/index.html");
    await p3.evaluate(() => localStorage.setItem("seringa.v1", JSON.stringify({ aviso: true, meds: [{ id: "a1", nome: "Mounjaro", intervalo: 7, primeira: "2026-11-10T12:00:00.000Z", hora: "09:00" }], aplicacoes: [{ id: "b1", quando: "2026-11-10T12:00:00.000Z", local: "cox-e", nota: "" }], sintomas: [], pesos: [] })));
    await p3.goto(APP); await p3.waitForSelector(".destaque"); await pronto(p3);
    ok((await p3.textContent("#ecra")).includes("Coxa — esquerda"), "dados antigos não migrados");
    ok(await p3.evaluate(() => localStorage.getItem("seringa.v1") === null), "localStorage antigo não foi limpo");
    await c3.close();
  });
  await caso("Responsividade mobile (320/375/414/768) e letra ≥16 px", async () => {
    const c4 = await novoContexto(); const p4 = await c4.newPage(); await configurar(p4); await registrar(p4, "abd-d");
    const telas = ["hoje", "registrar", "sintomas", "efeitos", "mais", "calendario", "historico", "relatorio", "privacidade", "config"];
    for (const w of [320, 375, 414, 768]) {
      await p4.setViewportSize({ width: w, height: 800 });
      for (const t of telas) {
        await p4.evaluate(n => { const b = document.createElement("button"); b.dataset.ir = n; document.body.appendChild(b); b.click(); b.remove(); }, t);
        const r = await p4.evaluate(() => ({
          ov: document.documentElement.scrollWidth > innerWidth + 1,
          cortado: [...document.querySelectorAll(".abas button")].some(b => b.scrollWidth > b.clientWidth + 1),
          peq: [...document.querySelectorAll("#ecra *")].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 16).map(e => e.className || e.tagName)
        }));
        ok(!r.ov, `scroll horizontal em ${t} @${w}px`); ok(!r.cortado, `abas cortadas @${w}px`); ok(!r.peq.length, `letra <16px em ${t} @${w}px: ${r.peq}`);
      }
    }
    await p4.setViewportSize({ width: 375, height: 812 }); await p4.evaluate(() => document.querySelector('.abas button[data-ecra="hoje"]').click());
    await p4.screenshot({ path: path.join(SAIDA, "hoje-claro.png") });
    await p4.emulateMedia({ colorScheme: "dark" }); await p4.screenshot({ path: path.join(SAIDA, "hoje-escuro.png") });
    await c4.close();
  });
  await caso("Contraste AA (modo claro e escuro)", async () => {
    const c5 = await novoContexto(); const p5 = await c5.newPage(); await configurar(p5);
    for (const esquema of ["light", "dark"]) {
      await p5.emulateMedia({ colorScheme: esquema });
      for (const t of ["hoje", "efeitos", "mais", "registrar"]) {
        await p5.evaluate(n => document.querySelector(`.abas button[data-ecra="${n}"]`).click(), t);
        const maus = await p5.evaluate(() => {
          const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
          const lum = c => { const a = c.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
          const fundo = el => { while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > .5)) return c; el = el.parentElement; } return [255, 255, 255]; };
          const out = [];
          document.querySelectorAll("#ecra *, .abas button, .topo *").forEach(e => {
            if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
            const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.opacity === "0") return;
            const L1 = lum(rgb(cs.color)), L2 = lum(fundo(e)); const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
            const grande = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
            if (r < (grande ? 3 : 4.5)) out.push(`${e.tagName}.${e.className} ${r.toFixed(2)}`);
          });
          return out;
        });
        ok(!maus.length, `contraste insuficiente (${esquema}/${t}): ${maus.slice(0, 4)}`);
      }
    }
    await c5.close();
  });
  await caso("Conteúdo proibido ausente (dose, diagnóstico, IA, imagem, código de ativação)", async () => {
    const fontes = ["app/app.js", "conteudo.js", "index.html", "site.js", "app/index.html", "antigo/index.html", "antigo/antigo.js", "404.html"].map(f => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n");
    const linhas = fontes.split("\n");
    const permitidas = /não calcula|NUNCA calcula|nem orienta doses|aumento de dose|aumenta a dose|nada de doses|Não calcula|mude a dose/;
    const doses = linhas.filter(l => /\bdoses?\b|calcul|\bmg\b|\bml\b|unidades? de insulina/i.test(l) && !permitidas.test(l));
    ok(!doses.length, "referências a dose/cálculo: " + doses.map(l => l.trim().slice(0, 90)).join(" | "));
    ok(!/código de ativa|activation|getUserMedia|<input[^>]+type=["']?file[^>]+image|openai|anthropic|gemini|diagnóstic[oa] (é|indica)/i.test(fontes), "funcionalidade proibida encontrada");
    ok(!/google-analytics|gtag\(|facebook\.net|hotjar|clarity\.ms|segment\.io/i.test(fontes), "rastreador encontrado");
  });
  await caso("Português do Brasil e textos (sem termos de Portugal visíveis)", async () => {
    const c6 = await novoContexto(); const p6 = await c6.newPage(); await configurar(p6); await registrar(p6, "abd-e");
    let texto = "";
    for (const t of ["boasvindas", "config", "hoje", "registrar", "sintomas", "efeitos", "mais", "calendario", "historico", "relatorio", "peso", "sus", "avisos", "privacidade", "sobre"]) {
      await p6.evaluate(n => { const b = document.createElement("button"); b.dataset.ir = n; document.body.appendChild(b); b.click(); b.remove(); }, t);
      texto += await p6.textContent("#ecra") + "\n";
    }
    const ps = await c6.newPage(); await ps.goto(BASE + "/"); texto += await ps.textContent("body");
    const ptpt = texto.match(/\b(ecrã|ecrãs|ficheiros?|telemóvel|utilizador|partilh\w+|registo|registos|guardad[oa]s?|A carregar|noutro|facto|contacto)\b/gi);
    ok(!ptpt, "termos de pt-PT: " + [...new Set(ptpt || [])]);
    ok(!/undefined|NaN|\[object|Invalid Date/.test(texto), "texto com valores quebrados");
    ok(!/Ã|â€|�/.test(texto), "acentuação estragada");
    await c6.close();
  });
  await caso("Site público: carrega, CSP sem violações, link para o app", async () => {
    const c7 = await novoContexto(); const ps = await c7.newPage(); await ps.goto(BASE + "/");
    ok((await ps.textContent("#versao")) === "18/11/2026", "data de versão do site");
    ok((await ps.$$("#lista-efeitos .card")).length === 7, "efeitos no site"); ok(!/o que pode ajudar/i.test(await ps.textContent("body")), "site ainda com 'O que pode ajudar'");
    ok(await ps.$('a[href="app/"]'), "link para o app"); ok((await ps.textContent("footer")).includes("BFAVORE"), "marca BFAVORE");
    await c7.close();
  });
  await caso("Versão anterior (/antigo/): página de transição, exportação, sem conversor de dose publicado", async () => {
    const c8 = await novoContexto(); const pa = await c8.newPage(); await pa.goto(BASE + "/index.html");
    await pa.evaluate(() => { localStorage.setItem("seringaRecords", JSON.stringify([{ medicine: "X", site: "abd" }])); localStorage.setItem("seringa.v1", "{}"); });
    await pa.goto(BASE + "/antigo/"); ok((await pa.textContent("h1")).includes("substituída"), "página de transição");
    ok((await pa.textContent("#estado")).includes("1 conjunto"), "não detetou dados antigos");
    const [dl] = await Promise.all([pa.waitForEvent("download"), pa.click("#baixar")]);
    const j = JSON.parse(fs.readFileSync(await dl.path(), "utf8")); ok(j.dados.seringaRecords && !("seringa.v1" in j.dados), "exportação antiga errada");
    const publicados = [];
    (function andar(d) { for (const f of fs.readdirSync(d)) { const c = path.join(d, f); if (f === "testes" || f.startsWith("RELATORIO")) continue; if (fs.statSync(c).isDirectory()) andar(c); else if (/\.(html|js)$/.test(f)) publicados.push(c); } })(RAIZ);
    const comDose = publicados.filter(f => /concentra[cç][aã]o|mcg|mL|admin-senhas|c[oó]digo de ativa/i.test(fs.readFileSync(f, "utf8")));
    ok(!comDose.length, "ficheiros publicados com dose/ativação: " + comDose.map(f => path.relative(RAIZ, f)));
    await c8.close();
  });
  await caso("20 Consola sem erros", async () => { ok(!errosConsola.length, errosConsola.join("\n")); });

  await browser.close(); srv.close();
  const falhas = resultados.filter(r => !r.ok);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram.` + (falhas.length ? " FALHARAM: " + falhas.map(f => f.nome).join("; ") : ""));
  console.log("Capturas em: " + SAIDA);
  fs.writeFileSync(path.join(RAIZ, "testes", "ultimo-resultado.json"), JSON.stringify({ data: new Date().toISOString(), resultados }, null, 2));
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error("ERRO NO RUNNER:", e); process.exit(2); });
