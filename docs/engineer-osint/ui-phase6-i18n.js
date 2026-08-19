(function(){
  const D=window.__ENGINEER_DATA__,I=window.__ENGINEER_I18N__;
  if(!D||!I)return;
  const KEY='engineer_osint_language',EXPLICIT_KEY='engineer_osint_language_user_selected',DEFAULT_LANG=I.default_language||'cs';
  const entities=()=>[...(D.records?.records||[]),...(D.leads?.leads||[])];
  const currentLang=()=>localStorage.getItem(EXPLICIT_KEY)==='1'?(localStorage.getItem(KEY)||DEFAULT_LANG):DEFAULT_LANG;
  if(localStorage.getItem(EXPLICIT_KEY)!=='1')localStorage.setItem(KEY,DEFAULT_LANG);
  const SCALAR_KEYS=['title','summary','description','note','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_does_not_prove','analytical_interpretation'];
  const ARRAY_KEYS=['intelligence_gaps'];
  function ensureOrig(e){if(!e.__orig){e.__orig={};for(const k of [...SCALAR_KEYS,...ARRAY_KEYS])e.__orig[k]=e[k]}}
  function pick(e,key,lang=currentLang()){
    if(!e)return '';
    ensureOrig(e);
    if(lang==='cs')return e[key+'_cs']??e[key]??e[key+'_en']??e.__orig[key]??'';
    return e[key+'_en']??e.__orig[key]??e[key]??e[key+'_cs']??'';
  }
  function localizeClaims(e,lang){if(!Array.isArray(e?.claims))return;for(const c of e.claims){if(!c.__orig_text)c.__orig_text=c.text;const v=lang==='cs'?(c.text_cs??c.text??c.text_en??c.__orig_text):(c.text_en??c.__orig_text??c.text??c.text_cs);if(v!==undefined&&v!=='')c.text=v}}
  function applyEntity(lang){for(const e of entities()){ensureOrig(e);for(const key of [...SCALAR_KEYS,...ARRAY_KEYS]){const val=pick(e,key,lang);if(val!==''&&val!==undefined)e[key]=val}localizeClaims(e,lang)}}
  let sw=document.getElementById('engineerLanguageSwitch');
  if(!sw){sw=document.createElement('div');sw.id='engineerLanguageSwitch';sw.style.cssText='position:fixed;top:10px;right:12px;z-index:1300;background:#0b141fdd;border:1px solid #33485f;border-radius:10px;padding:4px;display:flex;gap:3px';sw.innerHTML='<button type="button" data-lang="cs">CZ</button><button type="button" data-lang="en">EN</button>';for(const b of sw.querySelectorAll('button'))b.style.cssText='border:0;border-radius:7px;background:transparent;color:#91a3b8;padding:7px 9px;font-weight:800;cursor:pointer';document.body.appendChild(sw)}
  function translateStatic(root,lang){const d=I.ui?.cs||{},nodes=root.querySelectorAll('button,a,h1,h2,h3,h4,label,span,div');for(const el of nodes){if(el.id==='engineerLanguageSwitch'||el.closest('#engineerLanguageSwitch')||el.closest('[data-i18n-managed="1"]'))continue;if(el.children.length)continue;const t=el.textContent?.trim();if(!t)continue;if(lang==='cs'){const key=el.dataset.i18nKey||t;if(d[key]){el.dataset.i18nKey=key;if(el.textContent!==d[key])el.textContent=d[key]}}else if(el.dataset.i18nKey){if(el.textContent!==el.dataset.i18nKey)el.textContent=el.dataset.i18nKey}}}
  function updateSwitch(lang){for(const b of sw.querySelectorAll('button[data-lang]')){b.style.background=b.dataset.lang===lang?'#284d78':'transparent';b.style.color=b.dataset.lang===lang?'#fff':'#91a3b8';b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')}}
  function updateFallbackBadges(lang){const R=D.records?.records||[];for(const el of document.querySelectorAll('[data-open]')){const existing=el.querySelector('.translation-fallback-badge');if(lang!=='cs'){if(existing)existing.remove();continue}const r=R.find(x=>x.id===el.dataset.open);if(r&&!r.title_cs&&!r.summary_cs&&!existing){const s=document.createElement('span');s.className='translation-fallback-badge';s.textContent=' EN FALLBACK';s.title='Český překlad této položky zatím není k dispozici';s.style.cssText='font-size:8px;color:#e7ca84;margin-left:5px';(el.querySelector('strong,h3,h2')||el).appendChild(s)}}}
  let busy=false,scheduled=false,timer=0;const observer=new MutationObserver(()=>queueDecorate()),observe=()=>observer.observe(document.body,{childList:true,subtree:true});
  function decorateNow(){if(busy)return;busy=true;scheduled=false;clearTimeout(timer);observer.disconnect();try{const lang=currentLang();applyEntity(lang);document.documentElement.lang=lang==='cs'?'cs':'en';translateStatic(document,lang);updateSwitch(lang);updateFallbackBadges(lang)}finally{busy=false;observe()}}
  function queueDecorate(){if(busy||scheduled)return;scheduled=true;clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(decorateNow),70)}
  function set(lang,explicit=true){if(lang!=='cs'&&lang!=='en')return;localStorage.setItem(KEY,lang);if(explicit)localStorage.setItem(EXPLICIT_KEY,'1');applyEntity(lang);document.dispatchEvent(new CustomEvent('engineer-language-changed',{detail:{lang}}));const active=document.querySelector('#sidebar nav .active,[data-view].active');if(active?.click){try{active.click()}catch{}}queueDecorate()}
  sw.onclick=e=>{const b=e.target.closest('[data-lang]');if(b)set(b.dataset.lang,true)};
  applyEntity(currentLang());decorateNow();
  window.ENGINEER_I18N={setLanguage:(l)=>set(l,true),refresh:()=>set(currentLang(),false),getLanguage:currentLang,pick:(e,key)=>pick(e,key,currentLang()),terminology:new Map((I.terms||[]).map(t=>[t.original_term,t]))};
})();
