(function(){
  const exactRun='engineer-osint-20260904-B105';
  const rootSelector='[data-v4-public="1"]';
  const canonicalGapHeadingSelector='section[data-v41-canonical="1"] > h2[data-i18n-key]';
  const data=()=>window.__ENGINEER_CANONICAL_DATA__||window.__ENGINEER_DATA__;
  const currentRun=()=>{
    const d=data();
    return d?.dashboard_materialization?.current_run_id||d?.state?.run_id||d?.dashboard_patch_extras?.run_id||'';
  };
  const active=()=>currentRun()===exactRun;
  let busy=false;

  function stabilize(){
    if(busy||!active())return;
    busy=true;
    try{
      for(const root of document.querySelectorAll(rootSelector)){
        for(const heading of root.querySelectorAll(canonicalGapHeadingSelector)){
          const text=(heading.textContent||'').trim();
          if(/^(?:Intelligence gaps|Informační mezery)$/i.test(text))heading.removeAttribute('data-i18n-key');
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
