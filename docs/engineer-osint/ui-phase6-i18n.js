(function(){
  const D=window.__ENGINEER_DATA__,I=window.__ENGINEER_I18N__;
  if(!D||!I)return;
  const KEY='engineer_osint_language',EXPLICIT_KEY='engineer_osint_language_user_selected',DEFAULT_LANG=I.default_language||'cs';
  const extras=()=>D.dashboard_patch_extras||{};
  const entities=()=>[...(D.records?.records||[]),...(D.leads?.leads||[]),...(extras().updated_records||[]),...(extras().external_leads||[])];
  const currentLang=()=>localStorage.getItem(EXPLICIT_KEY)==='1'?(localStorage.getItem(KEY)||DEFAULT_LANG):DEFAULT_LANG;
  if(localStorage.getItem(EXPLICIT_KEY)!=='1')localStorage.setItem(KEY,DEFAULT_LANG);
  const SCALAR_KEYS=['title','summary','description','note','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit'];
  const ARRAY_KEYS=['intelligence_gaps'];
  const STATIC_CS={
    'FACT':'FAKT',
    'EVIDENCE':'DŮKAZY',
    'CLAIM':'TVRZENÍ',
    'ANALYSIS':'ANALÝZA',
    'CONFIDENCE':'MÍRA JISTOTY',
    'SOURCE QUALITY':'KVALITA ZDROJE',
    'WHAT IT DOES NOT PROVE':'CO TO NEDOKLÁDÁ',
    'WHAT THIS DOES NOT PROVE':'CO Z TOHO NELZE TVRDIT',
    'FACT / EVIDENCE':'FAKTA / DŮKAZY',
    'FACT / EVIDENCE ':'FAKTA / DŮKAZY',
    'ANALYTICAL INTERPRETATION':'ANALYTICKÁ INTERPRETACE',
    'LIMIT':'OMEZENÍ',
    'CURRENT CHANGES':'AKTUÁLNÍ ZMĚNY',
    'Current changes':'Aktuální změny',
    'P1 Leads':'P1 leady',
    'LEADS':'LEADY',
    'Sources':'Zdroje',
    'Source':'Zdroj',
    'Evidence':'Důkazy',
    'Summary':'Shrnutí',
    'Description':'Popis',
    'Intelligence gaps':'Informační mezery',
    'INTELLIGENCE GAPS':'INFORMAČNÍ MEZERY',
    'Why it matters':'Proč je to důležité',
    'Staff relevance':'Relevance pro štáb',
    'Training relevance':'Relevance pro výcvik',
    'Operational evidence':'Operační důkazy',
    'No data':'Žádná data',
    'No explicit gaps recorded.':'Nejsou zaznamenány žádné explicitní informační mezery.'
  };
  function ensureOrig(e){if(!e.__orig){e.__orig={};for(const k of [...SCALAR_KEYS,...ARRAY_KEYS])e.__orig[k]=e[k]}}
  function pick(e,key,lang=currentLang()){
    if(!e)return '';
    ensureOrig(e);
    if(lang==='cs'){
      if(e[key+'_cs']!==undefined)return e[key+'_cs'];
      if((key==='fact'||key==='analysis')&&e.__orig[key]&&e.__orig.summary&&e.__orig[key]===e.__orig.summary&&e.summary_cs!==undefined)return e.summary_cs;
      if(key==='limit'&&e.__orig.limit&&e.__orig.what_it_does_not_prove&&e.__orig.limit===e.__orig.what_it_does_not_prove&&e.what_it_does_not_prove_cs!==undefined)return e.what_it_does_not_prove_cs;
      return e[key]??e[key+'_en']??e.__orig[key]??'';
    }
    return e[key+'_en']??e.__orig[key]??e[key]??e[key+'_cs']??'';
  }
  function localizeClaims(e,lang){if(!Array.isArray(e?.claims))return;for(const c of e.claims){if(!c.__orig_text)c.__orig_text=c.text;const v=lang==='cs'?(c.text_cs??c.text??c.text_en??c.__orig_text):(c.text_en??c.__orig_text??c.text??c.text_cs);if(v!==undefined&&v!=='')c.text=v}}
  function applyEntity(lang){for(const e of entities()){ensureOrig(e);for(const key of [...SCALAR_KEYS,...ARRAY_KEYS]){const val=pick(e,key,lang);if(val!==''&&val!==undefined)e[key]=val}localizeClaims(e,lang)}}
  function resolveEntity(id){
    if(!id)return null;
    const found=entities().filter(e=>(e?.id||e?.lead_id)===id);
    if(!found.length)return null;
    const merged=Object.assign({},...found);
    const translated=found.find(e=>e.title_cs||e.summary_cs||e.description_cs||e.note_cs||e.what_it_does_not_prove_cs||e.analytical_interpretation_cs);
    if(translated)for(const k of [...SCALAR_KEYS,...ARRAY_KEYS])if(merged[k+'_cs']===undefined&&translated[k+'_cs']!==undefined)merged[k+'_cs']=translated[k+'_cs'];
    const original=found.find(e=>e.__orig)||found[0];
    if(original?.__orig)merged.__orig={...original.__orig};
    return merged;
  }
  function dynamicPairs(r,lang){
    if(!r)return [];
    const pairs=[];
    for(const key of SCALAR_KEYS){
      const original=r[key+'_en']??r.__orig?.[key]??r[key];
      const localized=pick(r,key,lang);
      if(typeof original==='string'&&typeof localized==='string'&&original.trim()&&localized.trim()&&original.trim()!==localized.trim())pairs.push([original.trim(),localized.trim()]);
    }
    for(const c of r.claims||[]){
      const original=c.text_en??c.__orig_text??c.text;
      const localized=lang==='cs'?(c.text_cs??c.text??c.text_en):(c.text_en??c.__orig_text??c.text);
      if(typeof original==='string'&&typeof localized==='string'&&original.trim()&&localized.trim()&&original.trim()!==localized.trim())pairs.push([original.trim(),localized.trim()]);
    }
    return pairs;
  }
  function repairRenderedDynamic(lang){
    const containers=[...document.querySelectorAll('[data-open],article,.item')];
    for(const box of containers){
      const id=box.dataset?.open||(box.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL)-\d+|LEAD-\d+)/)?.[0];
      const r=resolveEntity(id);if(!r)continue;
      const localizedTitle=pick(r,'title',lang)||id;
      const head=box.querySelector('strong,h2,h3,h4');
      if(head){
        const t=(head.textContent||'').trim();
        const base=(r.title_en??r.__orig?.title??r.title??'').toString().trim();
        if(lang==='cs'&&(t==='undefined'||/\bundefined\b/i.test(t)||t===base||t===id||t===`${id} — undefined`)){
          head.dataset.i18nDynamicOrig=head.dataset.i18nDynamicOrig||t;
          head.textContent=(t.includes(id)&&t!==base&&t!==id)?`${id} — ${localizedTitle}`:localizedTitle;
        }else if(lang==='en'&&head.dataset.i18nDynamicOrig){
          head.textContent=head.dataset.i18nDynamicOrig;
          delete head.dataset.i18nDynamicOrig;
        }
      }
      if(lang==='cs'){
        const pairs=dynamicPairs(r,lang);
        for(const el of box.querySelectorAll('p,li,span,div')){
          if(el.children.length)continue;
          const t=(el.textContent||'').trim();if(!t)continue;
          const hit=pairs.find(([original])=>t===original);
          if(hit){
            el.dataset.i18nDynamicOrig=el.dataset.i18nDynamicOrig||t;
            el.textContent=hit[1];
          }
        }
      }else for(const el of box.querySelectorAll('[data-i18n-dynamic-orig]')){
        el.textContent=el.dataset.i18nDynamicOrig;
        delete el.dataset.i18nDynamicOrig;
      }
    }
    const d=document.getElementById('detailContent');
    if(d){
      const id=(d.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL)-\d+|LEAD-\d+)/)?.[0];
      const r=resolveEntity(id);
      if(r&&lang==='cs'){
        const pairs=dynamicPairs(r,lang);
        for(const el of d.querySelectorAll('p,li,span,div')){
          if(el.children.length)continue;
          const t=(el.textContent||'').trim();if(!t)continue;
          const hit=pairs.find(([original])=>t===original);
          if(hit){
            el.dataset.i18nDynamicOrig=el.dataset.i18nDynamicOrig||t;
            el.textContent=hit[1];
          }
        }
      }else if(lang==='en')for(const el of d.querySelectorAll('[data-i18n-dynamic-orig]')){
        el.textContent=el.dataset.i18nDynamicOrig;
        delete el.dataset.i18nDynamicOrig;
      }
    }
  }
  let sw=document.getElementById('engineerLanguageSwitch');
  if(!sw){sw=document.createElement('div');sw.id='engineerLanguageSwitch';sw.style.cssText='position:fixed;top:10px;right:12px;z-index:1300;background:#0b141fdd;border:1px solid #33485f;border-radius:10px;padding:4px;display:flex;gap:3px';sw.innerHTML='<button type="button" data-lang="cs">CZ</button><button type="button" data-lang="en">EN</button>';for(const b of sw.querySelectorAll('button'))b.style.cssText='border:0;border-radius:7px;background:transparent;color:#91a3b8;padding:7px 9px;font-weight:800;cursor:pointer';document.body.appendChild(sw)}
  function translateStatic(root,lang){const d=I.ui?.cs||{},nodes=root.querySelectorAll('button,a,h1,h2,h3,h4,label,span,div');for(const el of nodes){if(el.id==='engineerLanguageSwitch'||el.closest('#engineerLanguageSwitch')||el.closest('[data-i18n-managed="1"]'))continue;if(el.children.length)continue;const t=el.textContent?.trim();if(!t)continue;if(lang==='cs'){const key=el.dataset.i18nKey||t,translated=d[key]||STATIC_CS[key];if(translated){el.dataset.i18nKey=key;if(el.textContent!==translated)el.textContent=translated}}else if(el.dataset.i18nKey){if(el.textContent!==el.dataset.i18nKey)el.textContent=el.dataset.i18nKey}}}
  function updateSwitch(lang){for(const b of sw.querySelectorAll('button[data-lang]')){b.style.background=b.dataset.lang===lang?'#284d78':'transparent';b.style.color=b.dataset.lang===lang?'#fff':'#91a3b8';b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false')}}
  function updateFallbackBadges(lang){const R=D.records?.records||[];for(const el of document.querySelectorAll('[data-open]')){const existing=el.querySelector('.translation-fallback-badge');if(lang!=='cs'){if(existing)existing.remove();continue}const r=R.find(x=>x.id===el.dataset.open);if(r&&!r.title_cs&&!r.summary_cs&&!existing){const s=document.createElement('span');s.className='translation-fallback-badge';s.textContent=' CHYBÍ CZ · EN';s.title='Český překlad této položky zatím není k dispozici';s.style.cssText='font-size:8px;color:#e7ca84;margin-left:5px';(el.querySelector('strong,h3,h2')||el).appendChild(s)}}}
  let busy=false,scheduled=false,timer=0;const observer=new MutationObserver(()=>queueDecorate()),observe=()=>observer.observe(document.body,{childList:true,subtree:true});
  function decorateNow(){if(busy)return;busy=true;scheduled=false;clearTimeout(timer);observer.disconnect();try{const lang=currentLang();applyEntity(lang);document.documentElement.lang=lang==='cs'?'cs':'en';translateStatic(document,lang);repairRenderedDynamic(lang);updateSwitch(lang);updateFallbackBadges(lang)}finally{busy=false;observe()}}
  function queueDecorate(){if(busy||scheduled)return;scheduled=true;clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(decorateNow),70)}
  function set(lang,explicit=true){if(lang!=='cs'&&lang!=='en')return;localStorage.setItem(KEY,lang);if(explicit)localStorage.setItem(EXPLICIT_KEY,'1');applyEntity(lang);document.dispatchEvent(new CustomEvent('engineer-language-changed',{detail:{lang}}));const active=document.querySelector('#sidebar nav .active,[data-view].active');if(active?.click){try{active.click()}catch{}}queueDecorate()}
  sw.onclick=e=>{const b=e.target.closest('[data-lang]');if(b)set(b.dataset.lang,true)};
  applyEntity(currentLang());decorateNow();
  window.ENGINEER_I18N={setLanguage:(l)=>set(l,true),refresh:()=>set(currentLang(),false),getLanguage:currentLang,pick:(e,key)=>pick(e,key,currentLang()),terminology:new Map((I.terms||[]).map(t=>[t.original_term,t]))};
})();
