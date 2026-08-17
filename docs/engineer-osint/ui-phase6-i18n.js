(function(){
  const D=window.__ENGINEER_DATA__,I=window.__ENGINEER_I18N__;
  if(!D||!I)return;
  const KEY='engineer_osint_language';
  const EXPLICIT_KEY='engineer_osint_language_user_selected';
  const DEFAULT_LANG=I.default_language||'cs';
  const R=D.records?.records||[],L=D.leads?.leads||[],E=[...R,...L];
  const currentLang=()=>localStorage.getItem(EXPLICIT_KEY)==='1'?(localStorage.getItem(KEY)||DEFAULT_LANG):DEFAULT_LANG;
  if(localStorage.getItem(EXPLICIT_KEY)!=='1')localStorage.setItem(KEY,DEFAULT_LANG);
  for(const e of E){
    e.__orig=e.__orig||{title:e.title,summary:e.summary,description:e.description};
  }

  let sw=document.getElementById('engineerLanguageSwitch');
  if(!sw){
    sw=document.createElement('div');
    sw.id='engineerLanguageSwitch';
    sw.style.cssText='position:fixed;top:10px;right:12px;z-index:1300;background:#0b141fdd;border:1px solid #33485f;border-radius:10px;padding:4px;display:flex;gap:3px';
    sw.innerHTML='<button type="button" data-lang="cs">CZ</button><button type="button" data-lang="en">EN</button>';
    for(const b of sw.querySelectorAll('button'))b.style.cssText='border:0;border-radius:7px;background:transparent;color:#91a3b8;padding:7px 9px;font-weight:800;cursor:pointer';
    document.body.appendChild(sw);
  }

  function applyEntity(lang){
    for(const e of E){
      e.title=lang==='cs'?(e.title_cs||e.__orig.title):lang==='en'?(e.title_en||e.__orig.title):e.__orig.title;
      e.summary=lang==='cs'?(e.summary_cs||e.__orig.summary):lang==='en'?(e.summary_en||e.__orig.summary):e.__orig.summary;
      e.description=lang==='cs'?(e.description_cs||e.__orig.description):lang==='en'?(e.description_en||e.__orig.description):e.__orig.description;
    }
  }

  function translateStatic(root,lang){
    const d=I.ui?.cs||{};
    const nodes=root.querySelectorAll('button,a,h1,h2,h3,h4,label,span,div');
    for(const el of nodes){
      if(el.id==='engineerLanguageSwitch'||el.closest('#engineerLanguageSwitch'))continue;
      if(el.children.length)continue;
      const t=el.textContent?.trim();
      if(!t)continue;
      if(!el.dataset.enOriginal)el.dataset.enOriginal=t;
      const base=el.dataset.enOriginal;
      const next=lang==='cs'?(d[base]||base):base;
      if(el.textContent!==next)el.textContent=next;
    }
  }

  function updateSwitch(lang){
    for(const b of sw.querySelectorAll('button[data-lang]')){
      b.style.background=b.dataset.lang===lang?'#284d78':'transparent';
      b.style.color=b.dataset.lang===lang?'#fff':'#91a3b8';
      b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false');
    }
  }

  function updateFallbackBadges(lang){
    for(const el of document.querySelectorAll('[data-open]')){
      const existing=el.querySelector('.translation-fallback-badge');
      if(lang!=='cs'){
        if(existing)existing.remove();
        continue;
      }
      const r=R.find(x=>x.id===el.dataset.open);
      if(r&&!r.title_cs&&!r.summary_cs&&!existing){
        const s=document.createElement('span');
        s.className='translation-fallback-badge';
        s.textContent=' EN FALLBACK';
        s.title='Český překlad této položky zatím není k dispozici';
        s.style.cssText='font-size:8px;color:#e7ca84;margin-left:5px';
        (el.querySelector('strong,h3,h2')||el).appendChild(s);
      }
    }
  }

  let busy=false,scheduled=false,timer=0;
  const observer=new MutationObserver(()=>queueDecorate());
  const observe=()=>observer.observe(document.body,{childList:true,subtree:true});

  function decorateNow(){
    if(busy)return;
    busy=true;
    scheduled=false;
    clearTimeout(timer);
    observer.disconnect();
    try{
      const lang=currentLang();
      document.documentElement.lang=lang==='cs'?'cs':'en';
      translateStatic(document,lang);
      updateSwitch(lang);
      updateFallbackBadges(lang);
    }finally{
      busy=false;
      observe();
    }
  }

  function queueDecorate(){
    if(busy||scheduled)return;
    scheduled=true;
    clearTimeout(timer);
    timer=setTimeout(()=>requestAnimationFrame(decorateNow),70);
  }

  function set(lang){
    if(lang!=='cs'&&lang!=='en')return;
    localStorage.setItem(KEY,lang);
    localStorage.setItem(EXPLICIT_KEY,'1');
    applyEntity(lang);
    const active=document.querySelector('#sidebar nav .active,[data-view].active');
    if(active?.click){
      try{active.click()}catch{}
    }
    queueDecorate();
  }

  sw.onclick=e=>{
    const b=e.target.closest('[data-lang]');
    if(b)set(b.dataset.lang);
  };

  applyEntity(currentLang());
  decorateNow();
  window.ENGINEER_I18N={setLanguage:set,getLanguage:currentLang,terminology:new Map((I.terms||[]).map(t=>[t.original_term,t]))};
})();
