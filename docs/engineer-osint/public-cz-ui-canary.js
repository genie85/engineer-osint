(function(){
  const MAP={NEW:'NOVÉ',UPDATE:'AKTUALIZACE',CONFIRMATION:'POTVRZENÍ',Reset:'Vymazat filtry'};
  const originals=new WeakMap();
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||document.documentElement.lang||'cs';
  function apply(){
    const cs=String(lang()).toLowerCase().startsWith('cs');
    for(const el of document.querySelectorAll('button,span,div,strong')){
      if(el.children.length||el.closest('#engineerLanguageSwitch'))continue;
      const t=(el.textContent||'').trim();
      if(cs&&MAP[t]){if(!originals.has(el))originals.set(el,t);el.textContent=MAP[t]}
      else if(!cs&&originals.has(el)){el.textContent=originals.get(el);originals.delete(el)}
    }
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  document.addEventListener('engineer-language-changed',queue);
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply):apply();
})();
