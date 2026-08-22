(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const all=()=>[...(D.records?.records||[]),...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().updated_records||[]),...(ex().external_leads||[])];
  const idOf=x=>x?.id||x?.lead_id;
  const mergeEntity=id=>{const found=all().filter(x=>idOf(x)===id);if(!found.length)return null;const m=Object.assign({},...found);const orig=found.find(x=>x.__orig)?.__orig;if(orig)m.__orig={...orig};return m};
  const value=(e,key,lang)=>{if(!e)return '';if(lang==='cs')return e[key+'_cs']??e[key]??e[key+'_en']??e.__orig?.[key]??'';return e[key+'_en']??e.__orig?.[key]??e[key]??e[key+'_cs']??''};
  const pairs=(e,lang)=>{const keys=['title','summary','update','update_summary','description','note','topic','signal','assessment','next_action','recommended_next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','limitations','relevance_summary','why_relevant','caption','caption_says','what_is_visible','observation','scope'];const out=[];for(const k of keys){const en=value(e,k,'en'),cs=value(e,k,'cs'),to=value(e,k,lang);for(const from of [en,cs])if(typeof from==='string'&&typeof to==='string'&&from.trim()&&to.trim()&&from.trim()!==to.trim())out.push([from.trim(),to.trim()])}for(const c of e?.claims||[]){const en=c.text_en??c.__orig_text??c.text??'',cs=c.text_cs??c.text??c.text_en??'',to=lang==='cs'?cs:en;for(const from of [en,cs])if(typeof from==='string'&&typeof to==='string'&&from.trim()&&to.trim()&&from.trim()!==to.trim())out.push([from.trim(),to.trim()])}return out};
  const entityId=box=>box?.dataset?.open||(box?.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL)-\d+|LEAD-[A-Z0-9-]+)/i)?.[0]||null;
  function repairBox(box,lang){const id=entityId(box),e=mergeEntity(id);if(!e)return;const title=value(e,'title',lang)||value(e,'topic',lang)||id;const head=box.querySelector('strong,h2,h3,h4');if(head&&title){const t=(head.textContent||'').trim();if(t===id||t.includes('undefined')||t===value(e,'title','en')||t===value(e,'title','cs')||t===value(e,'topic','en')||t===value(e,'topic','cs'))head.textContent=title}const ps=pairs(e,lang);for(const el of box.querySelectorAll('p,li,span,div')){if(el.children.length||el.closest('#engineerLanguageSwitch'))continue;const t=(el.textContent||'').trim();if(!t)continue;const hit=ps.find(([from])=>from===t);if(hit)el.textContent=hit[1]}}
  function repair(lang){for(const box of document.querySelectorAll('[data-open],article,.item'))repairBox(box,lang);const d=document.getElementById('detailContent');if(d)repairBox(d,lang)}
  function current(){try{return window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs'}catch{return 'cs'}}
  function schedule(lang){requestAnimationFrame(()=>setTimeout(()=>repair(lang),120));setTimeout(()=>repair(lang),320)}
  document.addEventListener('engineer-language-changed',e=>schedule(e?.detail?.lang||current()));
  new MutationObserver(()=>schedule(current())).observe(document.body,{childList:true,subtree:true});
  schedule(current());
  window.ENGINEER_I18N_SWITCH_RUNTIME_FIX={status:'enabled',canary:'CZ_EN_CZ_DYNAMIC_CONTENT'};
})();
