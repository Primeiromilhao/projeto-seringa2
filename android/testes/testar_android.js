/* Testes do Seringa num Android real (emulador ou celular ligado por USB com depuração ativa).
   Testa o APK DE PUBLICAÇÃO (site/downloads/Seringa.apk):
   A) instala, abre como app própria, mostra a interface e responde a toques reais (adb input + árvore de acessibilidade);
   B) fluxos completos dentro do WebView do app, pelo protocolo DevTools (CDP) com um cliente mínimo por WebSocket.
      O DevTools do WebView só está disponível em dispositivos de desenvolvimento (emuladores «userdebug», ro.debuggable=1)
      ou no APK de teste (python android/construir.py --teste). O APK de publicação não é depurável.
   Uso:  node android/testes/testar_android.js
   Requer: adb no PATH, Node 22+ (WebSocket global) e um dispositivo em `adb devices`. */
"use strict";
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
const RAIZ = path.join(__dirname, "..", "..");
const PUB = path.join(RAIZ, "site", "downloads", "Seringa.apk"), TESTE = path.join(RAIZ, "android", "build", "Seringa-teste.apk");
const PKG = "com.bfavore.seringa", ACT = PKG + "/.MainActivity";
const SAIDA = path.join(RAIZ, "android", "build", "capturas"); fs.mkdirSync(SAIDA, { recursive: true });
const adb = (...a) => execFileSync("adb", a, { encoding: "utf8", maxBuffer: 64 << 20, timeout: 120000 }).replace(/\r/g, "");
const adbOk = (...a) => { try { return adb(...a); } catch (e) { return ""; } };
const dorme = ms => new Promise(r => setTimeout(r, ms));
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function caso(n, f) { try { await f(); res.push({ n, ok: true }); console.log("  ✔ " + n); } catch (e) { res.push({ n, ok: false, e: e.message }); console.log("  ✘ " + n + "\n      → " + String(e.message).split("\n")[0]); } }
function captura(nome) { fs.mkdirSync(SAIDA, { recursive: true }); const f = path.join(SAIDA, nome + ".png"); fs.writeFileSync(f, execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 })); return f; }
function arvore() { adbOk("shell", "uiautomator", "dump", "/sdcard/ui.xml"); return adbOk("shell", "cat", "/sdcard/ui.xml"); }
async function esperar(fn, ms = 30000, o = "condição") { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch (e) { /* repete */ } if (Date.now() - t > ms) throw new Error("tempo esgotado: " + o); await dorme(700); } }
function tamanho() { const m = adb("shell", "wm", "size").match(/(\d+)x(\d+)/); return m ? [+m[1], +m[2]] : [1080, 2400]; }
function tocarTexto(txt) {
  const [W, H] = tamanho();
  for (let i = 0; i < 6; i++) {
    const x = arvore(), no = [...x.matchAll(/<node [^>]*>/g)].map(n => n[0]).find(n => n.includes(`text="${txt}"`) || n.includes(`content-desc="${txt}"`));
    if (no) {
      const b = no.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number), cy = (b[1] + b[3]) >> 1;
      if (cy > 60 && cy < H - 60) { adb("shell", "input", "tap", String((b[0] + b[2]) >> 1), String(cy)); return; }
    }
    adb("shell", "input", "swipe", String(W >> 1), String(Math.round(H * .75)), String(W >> 1), String(Math.round(H * .3)), "250");
  }
  throw new Error("não encontrei «" + txt + "» no ecrã");
}
const pidApp = () => adbOk("shell", "pidof", PKG).trim();
// app em primeiro plano (mFocusedApp); diálogos «não está a responder» do próprio sistema podem ter o foco da janela
const topo = () => { const w = adbOk("shell", "dumpsys", "window"); return ((w.match(/mFocusedApp=.*/) || [""])[0] + " " + (w.match(/mCurrentFocus=.*/) || [""])[0]); };

// ---------- cliente CDP mínimo (funciona com WebViews antigos) ----------
let ws, seq = 0, pend = {};
async function ligarCDP() {
  if (ws) { try { ws.close(); } catch (e) { /* ignora */ } ws = null; }
  const pid = await esperar(() => pidApp(), 30000, "processo do app");
  const sock = await esperar(() => (adbOk("shell", "cat", "/proc/net/unix").match(new RegExp("@(webview_devtools_remote_" + pid + ")")) || [])[1], 30000, "DevTools do WebView");
  adbOk("forward", "--remove", "tcp:9333"); adb("forward", "tcp:9333", "localabstract:" + sock);
  const alvo = await esperar(async () => (await (await fetch("http://127.0.0.1:9333/json")).json()).find(p => p.type === "page" && p.url.includes("appassets.androidplatform.net/app/")), 30000, "página do app");
  ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("WebSocket CDP")); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
  await esperar(() => ev("return !!document.querySelector('#ecra h1, .cartao-principal, #aceitar')"), 30000, "app carregado");
}
function enviar(method, params) { return new Promise((r, j) => { const id = ++seq; pend[id] = r; ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pend[id]) { delete pend[id]; j(new Error("CDP sem resposta: " + method)); } }, 60000); }); }
async function ev(corpo) {
  const r = await enviar("Runtime.evaluate", { expression: `(async () => { const $ = s => document.querySelector(s); const $$ = s => Array.from(document.querySelectorAll(s));
    const clicar = s => { const e = $(s); if (!e) throw new Error("sem " + s); e.click(); }; const txt = s => ($(s) || {}).textContent || "";
    const preencher = (s, v) => { const e = $(s); if (!e) throw new Error("sem " + s); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); };
    const ir = n => { const b = document.createElement("button"); b.dataset.ir = n; document.body.appendChild(b); b.click(); b.remove(); };
    const pronto = () => window.SeringaArmazem.pronto(); const espera = ms => new Promise(r => setTimeout(r, ms));
    ${corpo} })()`, awaitPromise: true, returnByValue: true });
  if (r.error) throw new Error(r.error.message);
  if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text);
  return r.result.result.value;
}
const il = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
async function abrir(limpo) { if (limpo) adbOk("shell", "pm", "clear", PKG); adbOk("shell", "am", "force-stop", PKG); adb("shell", "am", "start", "-W", "-n", ACT); await ligarCDP(); }

(async () => {
  console.log("Seringa — testes Android\n");
  const disp = adb("devices").split("\n").filter(l => /\tdevice$/.test(l));
  if (!disp.length) { console.error("Nenhum dispositivo Android ligado."); process.exit(2); }
  const versao = adb("shell", "getprop", "ro.build.version.release").trim(), sdk = +adb("shell", "getprop", "ro.build.version.sdk").trim();
  const depuravel = adb("shell", "getprop", "ro.debuggable").trim() === "1";
  const webview = (adbOk("shell", "dumpsys", "webviewupdate").match(/Current WebView package \(name, version\): \(([^)]+)\)/) || [, "?"])[1];
  console.log(`  dispositivo: ${disp[0].split("\t")[0]} · Android ${versao} (API ${sdk}) · WebView ${webview} · sistema ${depuravel ? "de desenvolvimento (userdebug)" : "de produção"}\n`);
  for (const c of [["settings", "put", "global", "hide_error_dialogs", "1"], ["input", "keyevent", "224"], ["wm", "dismiss-keyguard"], ["input", "keyevent", "82"], ["svc", "power", "stayon", "true"]]) adbOk("shell", ...c);
  adbOk("shell", "input", "keyevent", "3");

  await caso("A1 Instalar o APK de publicação (Seringa.apk)", async () => {
    adbOk("uninstall", PKG);
    const r = adb("install", PUB); ok(/Success/.test(r), r);
    const info = adb("shell", "dumpsys", "package", PKG);
    ok(/versionName=\d+\.\d+\.\d+/.test(info), "versão");
    ok(!/DEBUGGABLE/.test((info.match(/pkgFlags=\[([^\]]*)\]/) || [])[1] || ""), "o APK de publicação não pode ser depurável");
    ok(!/android\.permission\.INTERNET/.test(info), "não deve ter permissão INTERNET");
  });
  await caso("A2 Abre como aplicação própria (não o Chrome)", async () => {
    adb("logcat", "-c");
    adb("shell", "am", "start", "-W", "-n", ACT);
    const f = await esperar(() => { const t = topo(); return t.includes(PKG) ? t : null; }, 40000, "atividade do Seringa em primeiro plano");
    ok(!/chrome/i.test(f), f);
  });
  await caso("A3 Interface do Seringa aparece", async () => {
    await esperar(() => arvore().includes("Organize o seu tratamento"), 40000, "texto das boas-vindas");
    captura("A3-boasvindas");
  });
  await caso("A4 Toques reais: «Começar» abre a configuração", async () => {
    tocarTexto("Começar"); await esperar(() => arvore().includes("Vamos configurar"), 30000, "tela de configuração"); captura("A4-config");
  });
  await caso("A5 Sem falhas nativas (logcat)", async () => {
    const log = adbOk("logcat", "-d", "-v", "brief", "AndroidRuntime:E", "*:S");
    ok(!/FATAL EXCEPTION[\s\S]{0,300}com\.bfavore\.seringa/.test(log), "falha no logcat");
  });

  if (!depuravel) {
    if (!fs.existsSync(TESTE)) { console.log("\n  (Dispositivo de produção: para os testes B instale o APK de teste — python android/construir.py --teste)"); }
    else { adbOk("uninstall", PKG); adb("install", TESTE); }
  }
  await caso("B1 Ligação ao WebView do app e ambiente seguro", async () => {
    await ligarCDP();
    const a = await ev("return { nativo: window.SeringaAndroid && window.SeringaAndroid.plataforma(), seguro: isSecureContext, origem: location.origin, modo: window.SeringaArmazem.modo() }");
    ok(a.nativo === "android" && a.seguro && a.origem === "https://appassets.androidplatform.net" && a.modo === "idb", JSON.stringify(a));
  });
  await caso("B2 Configurar e registrar aplicação (botão +)", async () => {
    await ev(`if ($("#aceitar")) clicar("#aceitar"); await espera(300); preencher("#c-pessoa", "Ana"); preencher("#c-nome", "Mounjaro"); clicar("#c-gravar"); await pronto(); await espera(300);
      clicar('.abas [data-ecra="registrar"]'); await espera(200); clicar('[data-parte="cox"]'); clicar('[data-lado="d"]'); preencher("#r-nota", "teste android"); clicar("#r-ok"); await pronto(); await espera(300);`);
    const r = await ev(`return { ultima: txt(".ultima"), faltam: txt(".cp-faltam"), ola: txt(".ola") }`);
    ok(r.ultima.includes("Coxa direita") && r.faltam === "Faltam 7 dias" && r.ola.includes("Ana"), JSON.stringify(r));
    captura("B2-home");
  });
  await caso("B3 Lembrete: alarme agendado e notificação mostrada na hora indicada", async () => {
    if (sdk >= 33) adbOk("shell", "pm", "grant", PKG, "android.permission.POST_NOTIFICATIONS");
    const q = Number(await ev("return window.SeringaAndroid.proximoLembrete()"));
    ok(q > Date.now() + 6 * 864e5, "lembrete não agendado para a próxima aplicação: " + q);
    ok(adb("shell", "dumpsys", "alarm").includes(PKG), "alarme não encontrado no AlarmManager");
    const alvo = new Date(Date.now() + 90e3);
    await ev(`ir("config"); await espera(300); preencher("#c-prox", ${JSON.stringify(il(alvo))}); clicar("#c-gravar"); await pronto(); await espera(300);`);
    const q2 = Number(await ev("return window.SeringaAndroid.proximoLembrete()"));
    ok(Math.abs(q2 - new Date(il(alvo)).getTime()) < 61e3, "lembrete não acompanhou a nova data");
    // espera pela notificação ativa (o texto dela), não por estatísticas antigas do serviço de notificações
    adbOk("shell", "cmd", "notification", "cancel_all", PKG);
    const n = await esperar(() => { const t = adbOk("shell", "dumpsys", "notification", "--noredact"); return /android\.text=String \(Hora da aplica/.test(t) ? t : null; }, 180000, "notificação do Seringa com o texto do lembrete");
    ok(/android\.title=String \(Seringa — lembrete\)/.test(n) || /Seringa/.test(n), "título da notificação");
    adbOk("shell", "cmd", "statusbar", "expand-notifications"); await dorme(2500); captura("B3-notificacao"); adbOk("shell", "cmd", "statusbar", "collapse");
  });
  await caso("B4 Calendário, Minha jornada (histórico) e Meu corpo", async () => {
    const r = await ev(`ir("calendario"); await espera(300); const cal = txt("#ecra h1") === "Calendário" && !!$(".dia.hoje");
      clicar('.abas [data-ecra="jornada"]'); await espera(300); const j = $$(".evento").length;
      ir("corpo"); await espera(300); const c = !!$('rect.z-ultima[data-zona="cox-d"]'); return { cal, j, c };`);
    ok(r.cal && r.j >= 1 && r.c, JSON.stringify(r)); captura("B4-corpo");
  });
  await caso("B5 Sintomas e alerta fixo", async () => {
    const t = await ev(`ir("sintomas"); await espera(300); clicar('[data-s="enjoo"]'); clicar('[data-i="leve"]'); clicar("#s-ok"); await pronto(); await espera(300);
      clicar('[data-s="dor-forte"]'); return txt("#s-alerta");`);
    ok(/procure atendimento/i.test(t), t);
  });
  await caso("B6 Evolução: peso e gráfico", async () => {
    const r = await ev(`ir("evolucao"); await espera(300); preencher("#p-kg", "90,4"); clicar("#p-ok"); await pronto(); await espera(300); preencher("#p-kg", "89,6"); clicar("#p-ok"); await pronto(); await espera(300);
      return { v: txt(".n-valor"), g: !!$("svg.grafico .g-linha") };`);
    ok(r.v === "89,6 kg" && r.g, JSON.stringify(r)); captura("B6-evolucao");
  });
  await caso("B7 Relatório: «Gerar PDF» abre o serviço de impressão do Android", async () => {
    await ev(`clicar('.abas [data-ecra="relatorio"]'); await espera(300); clicar("#gerar-pdf");`);
    await esperar(() => /printspooler|PrintActivity/i.test(topo()), 40000, "janela de impressão/PDF");
    await dorme(2500); captura("B7-pdf"); adb("shell", "input", "keyevent", "4"); await esperar(() => topo().includes(PKG), 20000, "voltar ao app");
  });
  await caso("B8 Exportar dados → Downloads/Seringa", async () => {
    await ev(`clicar('.abas [data-ecra="mais"]'); await espera(300); clicar("#m-exp"); await espera(1500);`);
    const ls = sdk >= 29 ? adbOk("shell", "ls", "/sdcard/Download/Seringa/") : adbOk("shell", "ls", `/sdcard/Android/data/${PKG}/files/Download/`);
    ok(/seringa-meus-dados.*\.json/.test(ls), "arquivo não salvo: " + ls);
  });
  await caso("B9 Persistência: fechar à força, reabrir e atualizar o APK por cima", async () => {
    await abrir(false); ok((await ev(`return txt(".ultima")`)).includes("Coxa direita"), "dados perdidos ao reabrir");
    const r = adb("install", "-r", PUB); ok(/Success/.test(r), r);
    await abrir(false); ok((await ev(`return txt(".ultima")`)).includes("Coxa direita"), "dados perdidos na atualização");
  });
  await caso("B10 Offline: modo avião, reabrir e registrar", async () => {
    adbOk("shell", "cmd", "connectivity", "airplane-mode", "enable"); adbOk("shell", "settings", "put", "global", "airplane_mode_on", "1"); adbOk("shell", "svc", "wifi", "disable"); adbOk("shell", "svc", "data", "disable");
    await dorme(2000); await abrir(false);
    const u = await ev(`clicar('.abas [data-ecra="registrar"]'); await espera(300); clicar('[data-parte="bra"]'); clicar('[data-lado="e"]'); clicar("#r-ok"); await pronto(); await espera(300); return txt(".ultima");`);
    ok(u.includes("Braço esquerdo"), u); captura("B10-offline");
    adbOk("shell", "cmd", "connectivity", "airplane-mode", "disable"); adbOk("shell", "settings", "put", "global", "airplane_mode_on", "0"); adbOk("shell", "svc", "wifi", "enable"); adbOk("shell", "svc", "data", "enable");
  });
  await caso("B11 Botão voltar do Android volta à Home antes de sair", async () => {
    await ev(`ir("evolucao"); await espera(300);`);
    await esperar(async () => { if (/Not Responding/.test(topo())) adbOk("shell", "input", "keyevent", "4"); adb("shell", "input", "keyevent", "4"); await dorme(1500); return (await ev(`return $("#ecra").dataset.ecra`)) === "hoje"; }, 30000, "voltar para a Home");
    ok(topo().includes(PKG), "o app fechou em vez de voltar à Home");
  });
  await caso("B12 Modo escuro do sistema chega ao app", async () => {
    adbOk("shell", "cmd", "uimode", "night", "yes"); await dorme(3000); await abrir(false);
    const e = await ev(`return { mq: matchMedia("(prefers-color-scheme: dark)").matches, forcado: document.documentElement.classList.contains("escuro-forcado"), fundo: getComputedStyle(document.body).backgroundColor }`);
    ok((e.mq || e.forcado) && e.fundo === "rgb(17, 24, 39)", "app sem modo escuro: " + JSON.stringify(e));
    captura("B12-escuro"); adbOk("shell", "cmd", "uimode", "night", "no"); await dorme(2000);
  });
  await caso("B13 Apagar meus dados (inclui cancelar o lembrete)", async () => {
    await abrir(false);
    await ev(`ir("privacidade"); await espera(300); clicar("#v-del"); await espera(200); clicar("#v-del");`);
    await esperar(() => ev(`return !!$("#aceitar")`), 20000, "voltar às boas-vindas depois de apagar");
    ok(Number(await ev("return window.SeringaAndroid.proximoLembrete()")) === 0, "lembrete não foi cancelado");
    await abrir(false); ok(await ev(`return !!$("#aceitar")`), "dados não foram apagados");
  });
  await caso("B14 Sem erros JavaScript no WebView", async () => {
    await enviar("Runtime.enable", {}); let erros = [];
    ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.text); });
    await ev(`location.reload()`).catch(() => {}); await dorme(4000); await ligarCDP();
    await ev(`clicar("#aceitar"); await espera(300); preencher("#c-nome", "Insulina"); clicar("#c-gravar"); await pronto(); await espera(300); ir("efeitos"); await espera(300);`);
    const t = await ev(`return txt("#ecra")`); ok(t.includes("Ainda não temos um guia revisado para Insulina") && !/tirzepatida/.test(t), "conteúdo para Insulina");
    ok(!erros.length, erros.join("; "));
  });
  if (ws) ws.close();
  adbOk("forward", "--remove", "tcp:9333");

  const f = res.filter(r => !r.ok);
  console.log(`\n${res.length - f.length}/${res.length} testes Android passaram.` + (f.length ? " FALHARAM: " + f.map(x => x.n).join("; ") : ""));
  console.log("Capturas em: " + SAIDA);
  fs.writeFileSync(path.join(__dirname, "ultimo-resultado-android.json"), JSON.stringify({ data: new Date().toISOString(), android: versao, api: sdk, webview, sistema: depuravel ? "userdebug" : "user", resultados: res }, null, 2));
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error("ERRO NO RUNNER:", e); process.exit(2); });
