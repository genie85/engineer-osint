(function(){
  const SWITCH_ID='engineerLanguageSwitch';
  const KEY='engineer_osint_language';
  const EXPLICIT_KEY='engineer_osint_language_user_selected';
  const VALID=new Set(['cs','en']);
  let queued=false;

  function styleButton(button){
    button.style.cssText='border:0;border-radius:7px;background:transparent;color:#91a3b8;padding:7px 9px;font-weight:800;cursor:pointer';
  }

  function ensureButton(sw,lang,label){
    let button=sw.querySelector?.(`button[data-lang="${lang}"]`);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.lang=lang;
      button.textContent=label;
      styleButton(button);
      sw.appendChild(button);
    }
    return button;
  }

  function ensureSwitch(){
    let sw=document.getElementById(SWITCH_ID);
    if(!sw){
      sw=document.createElement('div');
      sw.id=SWITCH_ID;
      sw.style.cssText='position:fixed;top:10px;right:12px;z-index:1300;background:#0b141fdd;border:1px solid #33485f;border-radius:10px;padding:4px;display:flex;gap:3px';
      document.body.appendChild(sw);
    }
    ensureButton(sw,'cs','CZ');
    ensureButton(sw,'en','EN');
    return sw;
  }

  function currentLanguage(){
    try{
      const api=window.ENGINEER_I18N;
      const lang=api?.getLanguage?.()||localStorage.getItem(KEY)||document.documentElement.lang||'cs';
      return String(lang).toLowerCase().startsWith('en')?'en':'cs';
    }catch{return 'cs'}
  }

  function syncSwitch(lang=currentLanguage()){
    const sw=ensureSwitch();
    for(const button of sw.querySelectorAll?.('button[data-lang]')||[]){
      const active=button.dataset.lang===lang;
      button.style.background=active?'#284d78':'transparent';
      button.style.color=active?'#fff':'#91a3b8';
      button.setAttribute?.('aria-pressed',active?'true':'false');
    }
    return sw;
  }

  function setLanguage(lang){
    if(!VALID.has(lang))return;
    const api=window.ENGINEER_I18N;
    if(api?.setLanguage){
      api.setLanguage(lang);
    }else{
      try{
        localStorage.setItem(KEY,lang);
        localStorage.setItem(EXPLICIT_KEY,'1');
      }catch{}
      document.documentElement.lang=lang;
      document.dispatchEvent(new CustomEvent('engineer-language-changed',{detail:{lang}}));
    }
    syncSwitch(lang);
  }

  function switchButtonFromTarget(target){
    return target?.closest?.(`#${SWITCH_ID} button[data-lang]`)||null;
  }

  function onDocumentClick(event){
    const button=switchButtonFromTarget(event.target);
    if(!button||!VALID.has(button.dataset.lang))return;
    event.preventDefault?.();
    // Capture-phase delegation intentionally prevents stale direct onclick handlers
    // on an older/replaced switch node from becoming the source of truth.
    event.stopPropagation?.();
    setLanguage(button.dataset.lang);
  }

  function queueSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;syncSwitch()});
  }

  document.addEventListener('click',onDocumentClick,true);
  document.addEventListener('engineer-language-changed',event=>syncSwitch(event?.detail?.lang||currentLanguage()));
  new MutationObserver(queueSync).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncSwitch());else syncSwitch();

  window.ENGINEER_LANGUAGE_SWITCH_HARDENING={
    status:'enabled',
    version:1,
    binding:'document-capture-delegated',
    ensureSwitch,
    sync:syncSwitch,
    setLanguage
  };
})();
