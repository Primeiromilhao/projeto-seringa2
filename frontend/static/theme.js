(function(){
const KEY='seringa_theme';const root=document.documentElement;
function apply(mode){root.classList.toggle('light',mode==='light');root.dataset.theme=mode;const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=mode==='light'?'#F1F7F5':'#071312';document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=mode==='light'?'☾ Escuro':'☀ Claro';b.setAttribute('aria-label',mode==='light'?'Ativar tema escuro':'Ativar tema claro')})}
function set(mode){localStorage.setItem(KEY,mode);apply(mode)}
window.seringaSetTheme=set;window.seringaToggleTheme=function(){set(root.classList.contains('light')?'dark':'light')};
document.addEventListener('DOMContentLoaded',function(){apply(localStorage.getItem(KEY)||'dark');document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',window.seringaToggleTheme))});
apply(localStorage.getItem(KEY)||'dark');
})();
