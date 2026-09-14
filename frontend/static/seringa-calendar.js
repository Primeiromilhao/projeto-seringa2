/* Seringa Universal Calendar + Alarm v1.0 */
(function(){
  const KEY='seringa_alarm_events_v1';
  const sounds=[
    {id:'classic',name:'Seringa — Clássico',notes:[[660,.18],[880,.18],[660,.18],[880,.45]]},
    {id:'bell',name:'Seringa — Sino',notes:[[880,.12],[1320,.5]]},
    {id:'pulse',name:'Seringa — Pulsar',notes:[[740,.12],[0,.10],[740,.12],[0,.10],[740,.12],[0,.20]]},
    {id:'attention',name:'Seringa — Atenção',notes:[[523,.18],[659,.18],[784,.18],[1047,.55]]},
    {id:'urgent',name:'Seringa — Urgente',notes:[[880,.12],[0,.08],[880,.12],[0,.08],[1175,.25],[0,.10],[1175,.25]]}
  ];
  let audio=null, alarmLoop=null, activeEvent=null, lastMinute='';
  const read=()=>JSON.parse(localStorage.getItem(KEY)||'[]');
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const $=id=>document.getElementById(id);
  function addStyle(){
    const s=document.createElement('style');
    s.textContent=`
      .su-cal{margin-top:24px;padding:18px;border-radius:24px;background:var(--surface,#1e293b);border:1px solid var(--border,#23433e);box-shadow:0 12px 30px rgba(0,0,0,.10)}
      .su-cal h2{margin:0 0 5px;font-size:20px}.su-muted{font-size:12px;opacity:.72;line-height:1.5}.su-grid{display:grid;gap:10px;margin-top:14px}
      .su-grid input,.su-grid select{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid #b7c8c4;background:#fff;color:#0f172a;font-size:16px}
      .su-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.su-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .su-btn{border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer}.su-primary{background:#10b981;color:#fff}.su-secondary{background:#d9eee9;color:#064e3b}
      .su-list{display:grid;gap:8px;margin-top:14px}.su-event{padding:12px;border-radius:14px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.22)}
      .su-event strong{display:block}.su-event small{opacity:.72}.su-danger{background:#7f1d1d;color:#fff}.su-test{font-size:12px;padding:8px 10px}
      .su-alarm{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(3,12,11,.78);backdrop-filter:blur(8px)}
      .su-alarm.on{display:flex}.su-alarm-card{width:min(440px,100%);padding:24px;border-radius:28px;background:#fff;color:#10201d;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.4)}
      .su-alarm-card .bell{font-size:54px}.su-stop{width:100%;margin-top:16px;padding:16px;border:0;border-radius:16px;background:#b91c1c;color:#fff;font-weight:900;font-size:16px}
    `; document.head.appendChild(s);
  }
  function soundOptions(){return sounds.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');}
  function inject(){
    if($('seringaUniversalCalendar'))return;
    addStyle();
    const host=document.createElement('section'); host.id='seringaUniversalCalendar'; host.className='su-cal';
    host.innerHTML=`<h2>📅 Calendário e Alarmes</h2><p class="su-muted">Organize datas e horários conforme o seu plano. O alarme é um lembrete, não uma decisão clínica.</p>
      <div class="su-grid"><label class="su-muted">Evento<input id="suTitle" placeholder="Ex.: Lembrete"></label>
      <div class="su-row"><label class="su-muted">Data<input id="suDate" type="date"></label><label class="su-muted">Hora<input id="suTime" type="time"></label></div>
      <div class="su-row"><label class="su-muted">Repetição<select id="suRepeat"><option value="none">Uma vez</option><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>
      <label class="su-muted">Toque<select id="suSound">${soundOptions()}</select></label></div>
      <div class="su-actions"><button class="su-btn su-primary" id="suSave">AGENDAR ALARME</button><button class="su-btn su-secondary su-test" id="suTest">▶ Testar toque</button><button class="su-btn su-secondary su-test" id="suNotify">🔔 Ativar notificações</button></div></div><div id="suList" class="su-list"></div>`;
    const main=document.querySelector('main')||document.body;
    const anchor=[...main.children].find(x=>x.querySelector?.('h2')?.textContent?.includes('Privacidade'));
    main.insertBefore(host,anchor||main.lastElementChild);
    const overlay=document.createElement('div'); overlay.className='su-alarm'; overlay.id='suAlarm';
    overlay.innerHTML=`<div class="su-alarm-card"><div class="bell">🔔</div><h2 id="suAlarmTitle">Alarme</h2><p id="suAlarmInfo">O seu lembrete está a tocar.</p><button class="su-stop" id="suStop">PARAR ALARME</button></div>`;
    document.body.appendChild(overlay);
    $('suSave').onclick=save; $('suTest').onclick=()=>play($('suSound').value,true); $('suNotify').onclick=notifyPermission; $('suStop').onclick=stopAlarm; render();
  }
  function save(){
    const title=$('suTitle').value.trim()||'Lembrete Seringa',date=$('suDate').value,time=$('suTime').value;
    if(!date||!time)return alert('Escolha a data e a hora do alarme.');
    const e={id:(crypto.randomUUID?.()||String(Date.now()+Math.random())),title,date,time,repeat:$('suRepeat').value,sound:$('suSound').value,enabled:true,created:Date.now()};
    const a=read(); a.push(e); write(a); $('suTitle').value=''; render();
  }
  function render(){
    const a=read().filter(x=>x.enabled); const list=$('suList'); if(!list)return;
    list.innerHTML=a.length?a.sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time)).map(x=>`<div class="su-event"><strong>🔔 ${esc(x.title)}</strong><small>${esc(x.date)} às ${esc(x.time)} · ${x.repeat==='none'?'uma vez':x.repeat==='daily'?'diário':x.repeat==='weekly'?'semanal':'mensal'} · ${esc((sounds.find(s=>s.id===x.sound)||sounds[0]).name)}</small><div class="su-actions"><button class="su-btn su-secondary su-test" data-test="${x.sound}">▶ Testar</button><button class="su-btn su-danger su-test" data-del="${x.id}">Excluir</button></div></div>`).join(''):'<p class="su-muted">Nenhum alarme agendado.</p>';
    document.querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>play(b.dataset.test,true));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{write(read().filter(x=>x.id!==b.dataset.del));render();});
  }
  function ctx(){audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();return audio;}
  function play(id,preview){
    const c=ctx(), s=sounds.find(x=>x.id===id)||sounds[0], gain=c.createGain(); gain.gain.value=.16; gain.connect(c.destination); let t=c.currentTime;
    s.notes.forEach(([freq,dur])=>{if(freq){const o=c.createOscillator();o.type='sine';o.frequency.value=freq;o.connect(gain);o.start(t);o.stop(t+dur);}t+=dur;});
    if(!preview){clearTimeout(alarmLoop);alarmLoop=setTimeout(()=>play(id,false),Math.max(300,(t-c.currentTime)+80));}
  }
  function stopAlarm(){clearTimeout(alarmLoop);alarmLoop=null;const el=$('suAlarm');if(el)el.classList.remove('on');activeEvent=null;}
  async function notifyPermission(){
    if(!('Notification' in window))return alert('Este navegador não disponibiliza notificações.');
    const p=await Notification.requestPermission(); alert(p==='granted'?'Notificações ativadas.':'A permissão de notificações não foi concedida.');
  }
  function fire(e){
    if(activeEvent)return; activeEvent=e; $('suAlarmTitle').textContent=e.title; $('suAlarmInfo').textContent=`Agendado para ${e.date} às ${e.time}`; $('suAlarm').classList.add('on'); play(e.sound,false);
    if('Notification' in window&&Notification.permission==='granted')new Notification('Seringa — Alarme',{body:e.title,tag:e.id});
    if(e.repeat==='none'){write(read().filter(x=>x.id!==e.id));render();}else{const a=read();const i=a.findIndex(x=>x.id===e.id);if(i>=0){const d=new Date(e.date+'T'+e.time+':00');if(e.repeat==='daily')d.setDate(d.getDate()+1);if(e.repeat==='weekly')d.setDate(d.getDate()+7);if(e.repeat==='monthly')d.setMonth(d.getMonth()+1);a[i].date=d.toISOString().slice(0,10);write(a);render();}}
  }
  function dueKey(d){return d.toISOString().slice(0,16);}
  function tick(){
    const now=new Date(), key=dueKey(now); if(key===lastMinute)return; lastMinute=key;
    read().forEach(e=>{if(!e.enabled)return; if(`${e.date}T${e.time}`===key)fire(e);});
  }
  function start(){inject();setInterval(tick,1000);tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
