document.addEventListener('DOMContentLoaded',()=>{
 const page=location.pathname.split('/').pop()||'inicio.html';
 document.querySelectorAll('.ss-bottom-nav a').forEach(a=>{const href=(a.getAttribute('href')||'').split('/').pop();if(href===page)a.classList.add('active')});
 if(page!=='inicio.html'&&!document.querySelector('.ss-back-home')){
  const bar=document.createElement('div');bar.className='ss-back-home no-print';bar.innerHTML='<button type="button" data-back>← Voltar</button><button type="button" data-home>⌂ Menu Inicial</button>';
  document.body.appendChild(bar);
  bar.querySelector('[data-back]').addEventListener('click',()=>{if(history.length>1)history.back();else location.href='inicio.html'});
  bar.querySelector('[data-home]').addEventListener('click',()=>location.href='inicio.html');
 }
});
