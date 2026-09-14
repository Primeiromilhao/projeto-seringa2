(function(){
  const key='seringa_theme';
  const saved=localStorage.getItem(key);
  const preferred=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=preferred;
  function update(){
    const dark=document.documentElement.dataset.theme==='dark';
    const b=document.querySelector('.s-theme');
    if(b)b.setAttribute('aria-label',dark?'Mudar para tema claro':'Mudar para tema escuro');
  }
  function addButton(){
    if(document.querySelector('.s-theme'))return;
    const b=document.createElement('button');
    b.className='s-theme';b.type='button';b.innerHTML='<span class="light-label">☾ Escuro</span><span class="dark-label">☀ Claro</span>';
    b.onclick=function(){
      const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=next;localStorage.setItem(key,next);update();
    };
    document.body.appendChild(b);update();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton);else addButton();
})();
