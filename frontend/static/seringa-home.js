document.addEventListener('DOMContentLoaded',()=>{
  const page=location.pathname.split('/').pop()||'inicio.html';
  document.querySelectorAll('.ss-home-card[data-href]').forEach(card=>{
    card.addEventListener('click',()=>{location.href=card.dataset.href});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();location.href=card.dataset.href}})
  });
  document.querySelectorAll('.ss-home-filter').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.ss-home-filter').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    const filter=btn.dataset.filter;
    document.querySelectorAll('.ss-home-card').forEach(card=>card.style.display=(!filter||filter==='all'||card.dataset.category===filter)?'flex':'none');
  }));
  document.querySelectorAll('.ss-home-search').forEach(input=>input.addEventListener('input',()=>{
    const q=input.value.toLowerCase().trim();
    document.querySelectorAll('.ss-home-card').forEach(card=>card.style.display=card.textContent.toLowerCase().includes(q)?'flex':'none');
  }));
});
