(function(){
  const exactRun='engineer-osint-20260904-B105';
  const rootSelector='[data-v4-public="1"]';
  const data=()=>window.__ENGINEER_CANONICAL_DATA__||window.__ENGINEER_DATA__;
  const currentRun=()=>{
    const d=data();
    return d?.dashboard_materialization?.current_run_id||d?.state?.run_id||d?.dashboard_patch_extras?.run_id||'';
  };
  const active=()=>currentRun()===exactRun;
  const currentLang=()=>window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs';
  const gapTitle=()=>currentLang()==='en'?'Intelligence gaps':'Informační mezery';
  let busy=false;

  function stabilize(){
    if(busy||!active())return;
    busy=true;
    try{
      for(const root of document.querySelectorAll(rootSelector)){
        for(const el of root.querySelectorAll('[data-i18n-key]'))el.removeAttribute('data-i18n-key');
        const wanted=gapTitle();
        for(const heading of root.querySelectorAll('h2')){
          const text=(heading.textContent||'').trim();
          if((text==='Intelligence gaps'||text==='Informační mezery')&&text!==wanted)heading.textContent=wanted;
        }
      }
    }finally{
      busy=false;
    }
  }

  const observer=new MutationObserver(()=>stabilize());
  const observe=()=>{
    if(!document.body)return;
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:['data-i18n-key']
    });
    stabilize();
  };

  if(document.body)observe();
  else document.addEventListener('DOMContentLoaded',observe,{once:true});
  document.addEventListener('engineer-language-changed',()=>queueMicrotask(stabilize));
  window.ENGINEER_V4_I18N_STABILITY={stabilize};
})();
