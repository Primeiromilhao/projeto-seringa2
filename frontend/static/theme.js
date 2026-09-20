(function(){
const KEY='seringa_theme_v4';const root=document.documentElement;
function normalize(mode){return mode==='dark'?'dark':'light'}
function apply(mode){mode=normalize(mode);root.classList.toggle('light',mode==='light');root.dataset.theme=mode;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=mode==='dark'?'#071312':'#F4F8F7';document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=mode==='dark'?'Claro':'Escuro';b.setAttribute('aria-label',mode==='dark'?'Mudar para tema claro':'Mudar para tema escuro');b.setAttribute('aria-pressed',String(mode==='dark'))})}
function get(){return normalize(localStorage.getItem(KEY)||localStorage.getItem('seringa_theme')||'light')}
function set(mode){localStorage.setItem(KEY,normalize(mode));apply(mode)}
window.seringaSetTheme=set;window.seringaToggleTheme=function(){set(root.dataset.theme==='dark'?'light':'dark')};
apply(get());
document.addEventListener('DOMContentLoaded',function(){apply(get());document.querySelectorAll('[data-theme-toggle]').forEach(b=>{if(b.dataset.themeBound==='1')return;b.dataset.themeBound='1';b.addEventListener('click',window.seringaToggleTheme)})});
})();