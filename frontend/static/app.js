/* SERINGA PWA — Vanilla JS, Local-First e sem dependências externas. */
(() => {
  'use strict';
  const KEYS = { records: 'seringa_records', pro: 'seringa_pro_active' };
  let deferredInstall = null;
  let breathTimer = null;

  // localStorage nunca deve impedir a abertura da aplicação.
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } },
    remove(key) { try { localStorage.removeItem(key); return true; } catch (_) { return false; } },
    flag(key) { try { return localStorage.getItem(key) === 'true'; } catch (_) { return false; } },
    setFlag(key, value) { try { localStorage.setItem(key, String(value)); return true; } catch (_) { return false; } }
  };

  const $ = id => document.getElementById(id);
  const records = () => storage.get(KEYS.records, []);
  const moneyNumber = value => Number(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Converte decimal para BigInt escalado, sem usar ponto flutuante no cálculo.
  function decimalToBigInt(value, scale = 1000000n) {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const digits = (fraction + '000000').slice(0, 6);
    return BigInt(whole) * scale + BigInt(digits);
  }

  // dose (mcg) / concentração (mg/mL), com arredondamento final para 2 casas.
  function calculateVolume(dose, concentration) {
    const d = decimalToBigInt(dose); const cMg = decimalToBigInt(concentration);
    if (d === null || cMg === null || cMg === 0n) return null;
    const cMcg = cMg * 1000n;
    const scale = 1000000n;
    const raw = d * scale / cMcg;
    const hundredths = (raw + 5000n) / 10000n;
    const integer = hundredths / 100n;
    const cents = (hundredths % 100n).toString().padStart(2, '0');
    return { text: `${integer.toString()},${cents}`, number: Number(integer) + Number(cents) / 100 };
  }

  function showToast(message, success = false) {
    const el = $('toast'); el.textContent = message; el.hidden = false; el.className = `toast${success ? ' success' : ''}`;
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  function todayKey() { const d = new Date(); return d.toLocaleDateString('sv-SE'); }
  function updateToday() {
    const today = records().filter(r => r.dateKey === todayKey());
    const card = $('todayStatus');
    if (today.length) { card.classList.remove('pending'); card.classList.add('done'); $('todayTitle').textContent = 'Aplicação registrada hoje'; $('todayText').textContent = `${today.length} registro${today.length > 1 ? 's' : ''} feito${today.length > 1 ? 's' : ''} hoje. ✓`; $('todayStatus').querySelector('.status-icon').textContent = '✓'; }
    else { card.classList.add('pending'); card.classList.remove('done'); $('todayTitle').textContent = 'Conferência pendente'; $('todayText').textContent = 'Ainda não há uma aplicação registrada hoje.'; $('todayStatus').querySelector('.status-icon').textContent = 'â³'; }
  }

  function renderRecords() {
    const list = $('recordsList'); const empty = $('empty'); const data = records().sort((a,b) => new Date(b.iso) - new Date(a.iso));
    list.innerHTML = '';
    empty.hidden = data.length > 0;
    data.forEach(r => {
      const card = document.createElement('article'); card.className = 'records-card';
      card.innerHTML = `<span class="record-icon">💉</span><div><strong>${escapeHtml(r.medicine || 'Medicamento')}</strong><small>${r.date} · ${r.time}</small><small>Local: ${escapeHtml(r.site || 'Não informado')}</small><small>Dose: ${escapeHtml(r.dose)} mcg · Concentração: ${escapeHtml(r.concentration)} mg/mL</small></div><strong class="volume">${escapeHtml(r.volume)} mL</strong>`;
      list.appendChild(card);
    });
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function updateRuler(result) {
    const n = result?.number ?? 0; const shown = Math.min(Math.max(n, 0), 5); const width = 490 * shown / 5;
    $('fill').setAttribute('width', String(width)); $('plunger').setAttribute('x', String(55 + width)); $('rulerValue').textContent = result ? `${moneyNumber(n)} mL` : '0,00 mL'; $('rulerWarning').hidden = !(n > 5);
  }

  function recalculate() {
    const result = calculateVolume($('dose').value, $('conc').value);
    $('check').classList.toggle('has-result', Boolean(result));
    $('volume').textContent = result ? `${result.text} mL` : '—'; $('math').textContent = result ? 'Cálculo exato com inteiros escalados; arredondamento somente na apresentação.' : 'Preencha dose e concentração para visualizar.'; updateRuler(result); return result;
  }

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => { const active = t.id === name; t.hidden = !active; t.classList.toggle('active', active); });
    document.querySelectorAll('.bottom-nav button').forEach(b => { const active = b.dataset.tab === name; b.classList.toggle('active', active); b.setAttribute('aria-selected', active); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveRecord() {
    const result = recalculate();
    if (!result) { showToast('Preencha a dose e a concentração para continuar.'); $('dose').focus(); return; }
    const data = records(); const now = new Date();
    data.push({ iso: now.toISOString(), dateKey: todayKey(), date: now.toLocaleDateString('pt-PT'), time: now.toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'}), medicine: $('medicine').value.trim(), site: $('site').value, dose: $('dose').value, concentration: $('conc').value, vial: $('vial').value, volume: result.text });
    if (!storage.set(KEYS.records, data)) { showToast('Não foi possível guardar neste dispositivo.'); return; }
    renderRecords(); updateToday(); showToast('✅ Aplicação registrada com sucesso!', true); switchTab('records');
  }
  function startBreathing() {
    const modal = $('breathingModal'); modal.showModal(); let phase = 0, seconds = 4;
    const phases = [['Inspire',4,'inhale','Inspire pelo nariz.'],['Segure',7,'hold','Mantenha o ar com suavidade.'],['Expire',8,'exhale','Expire devagar pela boca.']];
    clearInterval(breathTimer);
    const tick = () => { const p = phases[phase]; $('breathPhase').textContent = p[0]; $('breathTimer').textContent = seconds; $('breathText').textContent = p[3]; $('breathCircle').className = p[2]; seconds--; if (seconds < 0) { phase = (phase + 1) % phases.length; seconds = phases[phase][1]; } };
    tick(); breathTimer = setInterval(tick, 1000);
  }
  function stopBreathing() { clearInterval(breathTimer); breathTimer = null; $('breathingModal').close(); $('breathCircle').className = ''; }

  function audioSupport() {
    if (!('speechSynthesis' in window)) { showToast('Áudio de apoio não está disponível neste navegador.'); return; }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Respire com calma. Confira cada etapa no seu ritmo. Você pode pausar sempre que precisar.'); u.lang = 'pt-PT'; u.rate = .85; speechSynthesis.speak(u); showToast('🔊 Áudio de apoio iniciado.');
  }

  function exportPdf() {
    if (!storage.flag(KEYS.pro)) { showToast('â Este recurso faz parte do Seringa Pro.'); switchTab('pro'); return; }
    const data = records().sort((a,b) => new Date(b.iso) - new Date(a.iso));
    const rows = data.map(r => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.time)}</td><td>${escapeHtml(r.medicine || 'Medicamento')}</td><td>${escapeHtml(r.dose)} mcg</td><td>${escapeHtml(r.volume)} mL</td></tr>`).join('');
    const w = window.open('', '_blank'); if (!w) { showToast('Permita a abertura de janelas para gerar o relatório.'); return; }
    w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Relatório SERINGA</title><style>body{font-family:Arial,sans-serif;padding:35px;color:#173B38}h1{color:#1B6B63}table{border-collapse:collapse;width:100%;margin-top:25px}th,td{border:1px solid #ccd8d4;padding:9px;text-align:left}th{background:#D8EEDF}</style></head><body><h1>SERINGA — Relatório de Registros</h1><p>Gerado em ${new Date().toLocaleString('pt-PT')}</p><table><thead><tr><th>Data</th><th>Hora</th><th>Medicamento</th><th>Dose</th><th>Volume</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sem registros.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close();
  }
  function saveAgenda(){const v=$('nextDate').value;if(!v){showToast('Escolha a data e hora da próxima aplicação.');return;}try{localStorage.setItem('seringa_next_date',v);showToast('Agenda guardada neste dispositivo.',true);}catch(_){} } function updateVialExpiry(){const v=$('vialOpened').value;if(!v){$('vialExpiry').textContent='Informe a abertura do frasco para calcular a janela de 28 dias.';return;}const d=new Date(v+'T00:00:00');d.setDate(d.getDate()+28);$('vialExpiry').textContent='Janela de 28 dias: até '+d.toLocaleDateString('pt-PT')+'. Confirme sempre as instruções do medicamento.';} function updateProUI() {
    const active = storage.flag(KEYS.pro);
    $('proBadge').hidden = !active;
    $('premiumDashboard').hidden = !active;
    $('premiumActivation').hidden = active;
    const plans = document.querySelector('.plans'); if (plans) plans.hidden = active;
    document.body.classList.toggle('premium-active', active);
    const nav = document.querySelector('[data-tab="pro"]');
    if (nav) nav.innerHTML = active ? '⭐<span>Premium Ativo</span>' : '⭐<span>Seringa Premium</span>';
  }

  function activatePro() {
    const key = $('proKey').value.trim().toUpperCase(); const msg = $('activationMessage');
    // Validação offline local: chave de produção pode ser trocada por integração futura.
    const valid = key === 'DBA66369';
    if (!valid) { msg.textContent = 'Chave inválida. Confira a chave e tente novamente.'; msg.className = 'activation-message bad'; return; }
    if (storage.setFlag(KEYS.pro, true)) { msg.textContent = '✓ Seringa Premium desbloqueado neste dispositivo.'; msg.className = 'activation-message good'; updateProUI(); showToast('✓ Seringa Premium ativado!', true); }
    else { msg.textContent = 'Não foi possível guardar a ativação localmente.'; msg.className = 'activation-message bad'; }
  }

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('installBanner').hidden = false; });
    $('installBanner').addEventListener('click', async () => {
      if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('installBanner').hidden = true; return; }
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
      if (ios) $('iosModal').showModal(); else showToast('Use o menu do navegador e escolha “Instalar aplicativoâ€.');
    });
    window.addEventListener('appinstalled', () => { deferredInstall = null; $('installBanner').hidden = true; showToast('📲 SERINGA instalado com sucesso!', true); });
  }

  function setupChecklist() {
    const boxes = [...document.querySelectorAll('#checklist input')];
    boxes.forEach(b => b.addEventListener('change', () => { const n = boxes.filter(x => x.checked).length; $('progress').textContent = `${n}/4`; const f = $('checkFeedback'); f.classList.toggle('good', n > 0); f.textContent = n === 4 ? '✓ Tudo conferido. Você concluiu esta etapa com calma.' : n ? `${n} de 4 etapas concluídas. Muito bem, siga no seu ritmo.` : 'Vamos com calma. Marque cada etapa quando estiver pronta.'; }));
  }

  function setupHero() {
    const slides = [...document.querySelectorAll('#heroSlides .slide')];
    const dots = [...document.querySelectorAll('#heroDots button')];
    let index = 0; let startX = 0; let auto;
    const paint = () => { slides.forEach((s,i) => s.classList.toggle('active', i === index)); dots.forEach((d,i) => d.classList.toggle('active', i === index)); };
    const go = i => { index = (i + slides.length) % slides.length; paint(); };
    dots.forEach((d,i) => d.addEventListener('click', () => go(i)));
    const host = $('heroSlides');
    host.addEventListener('pointerdown', e => { startX = e.clientX; host.setPointerCapture?.(e.pointerId); });
    host.addEventListener('pointerup', e => { const dx = e.clientX - startX; if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1)); });
    const play = () => { clearInterval(auto); auto = setInterval(() => go(index + 1), 5500); };
    host.addEventListener('pointerup', play); play(); paint();
    $('startNow').addEventListener('click', () => document.querySelector('#check').scrollIntoView({behavior:'smooth', block:'start'}));
  }

  function setupEvents() {
    document.querySelectorAll('.bottom-nav button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('first').addEventListener('click', () => switchTab('check')); $('save').addEventListener('click', saveRecord); $('pdf').addEventListener('click', exportPdf); $('breathe').addEventListener('click', startBreathing); $('stopBreath').addEventListener('click', stopBreathing); $('audio').addEventListener('click', audioSupport); $('activate').addEventListener('click', activatePro);
    document.querySelectorAll('.plans .pro').forEach(b => b.addEventListener('click', () => { showToast('Escolha a modalidade e depois use uma chave de ativação. O pagamento ainda não está ligado ao aplicativo.', false); $('proKey').focus(); }));
    $('clear').addEventListener('click', () => $('confirmModal').showModal()); $('confirmClear').addEventListener('click', () => { storage.remove(KEYS.records); renderRecords(); updateToday(); $('confirmModal').close(); showToast('Histórico limpo neste dispositivo.'); });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
    ['dose','conc'].forEach(id => $(id).addEventListener('input', recalculate));
  }
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function setupInstallVisibility() {
    const b = document.getElementById('installBanner');
    if (b) b.hidden = isStandalone();
  }
  function init() {
    const h = new Date().getHours(); $('greeting').textContent = h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!';
    renderRecords(); updateToday(); updateProUI(); setupChecklist(); setupHero(); setupEvents(); setupInstall(); setupInstallVisibility(); recalculate();
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=4.0').catch(() => {}); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();



