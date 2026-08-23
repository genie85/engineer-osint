(function(){
  const SWITCH_ID='engineerLanguageSwitch';

  function pinSwitch(){
    const sw=document.getElementById(SWITCH_ID);
    if(!sw)return null;
    const root=document.documentElement;
    if(root&&sw.parentElement!==root)root.appendChild(sw);
    if(sw.dataset)sw.dataset.i18nPersistent='1';
    return sw;
  }

  function schedulePin(){
    requestAnimationFrame(()=>pinSwitch());
  }

  // The base i18n controller remains the single owner of language state,
  // click handling and content rendering. This module only moves the already
  // live control outside the body subtree so view rerenders cannot detach it.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedulePin);else schedulePin();
  document.addEventListener('engineer-language-changed',schedulePin);

  window.ENGINEER_LANGUAGE_SWITCH_HARDENING={
    status:'enabled',
    version:2,
    binding:'base-controller-persistent-root',
    observer:'none',
    pin:pinSwitch
  };
})();
