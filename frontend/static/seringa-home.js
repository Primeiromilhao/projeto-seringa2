document.addEventListener('DOMContentLoaded',()=>{
 const cards=[...document.querySelectorAll('.ss-home-card[data-href]')];
 cards.forEach(card=>{
  card.addEventListener('click',()=>location.href=card.dataset.href);
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();location.href=card.dataset.href}});
 });
 const search=document.getElementById('homeSearch');
 if(search)search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();cards.forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?'flex':'none')});
 carregarPerfilHome();
 carregarLembreteHome();
});
async function carregarPerfilHome(){
 const p=JSON.parse(localStorage.getItem('seringaPerfil')||'{}');
 const nome=(p.nome||'').trim();
 const g=document.getElementById('homeGreeting');
 const initial=document.getElementById('homeInitial');
 if(g)g.textContent=nome?'Olá, '+nome+'!':'Olá!';
 if(initial)initial.textContent=nome?nome.charAt(0).toUpperCase():'☺';
 try{
  const r=indexedDB.open('seringaPerfilDB',1);
  r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('perfil'))return;const q=db.transaction('perfil').objectStore('perfil').get('foto');q.onsuccess=()=>{if(q.result){const u=URL.createObjectURL(q.result);const im=document.getElementById('homePhoto');if(im){im.src=u;im.style.display='block';const i=document.getElementById('homeInitial');if(i)i.style.display='none'}}}};
 }catch(e){}
}
function carregarLembreteHome(){
 const h=localStorage.getItem('seringaHoraProxima');
 const hist=JSON.parse(localStorage.getItem('seringaHistorico')||'[]');
 const b=document.getElementById('nextReminder'),s=document.getElementById('nextReminderSub');
 if(!b)return;
 if(h){b.textContent='Próxima dose às '+h;s.textContent=hist.length?'Continue o seu acompanhamento.':'Configure o seu calendário.'}
 else{b.textContent='Ver calendário';s.textContent='Organize os seus próximos eventos.'}
}
