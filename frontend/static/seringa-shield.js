(function(){
"use strict";
if(window.top!==window.self){try{window.top.location.replace(window.self.location.href)}catch(e){}}
const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
const publicPages=new Set(["","index.html","acesso.html","404.html"]);
if(!publicPages.has(page)&&localStorage.getItem("seringaStatus")!=="premium"){
 location.replace("acesso.html?return="+encodeURIComponent(page));
}
const originalSetItem=localStorage.setItem;
localStorage.setItem=function(key,value){
 if(typeof value==="string"&&/<script|javascript:/i.test(value)){
  console.warn("Seringa Shield: potentially dangerous storage content blocked.");
  value=value.replace(/<script[^<]*(?:(?!<\/script>)[\s\S])*<\/script>/gi,"[BLOCKED]").replace(/javascript:/gi,"");
 }
 return originalSetItem.call(this,key,value);
};
window.eval=function(){throw new Error("Seringa Shield: dynamic execution blocked.");};
})();