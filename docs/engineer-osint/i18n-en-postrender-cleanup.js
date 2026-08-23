(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const all=()=>[...(D.records?.records||[]),...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().updated_records||[]),...(ex().external_leads||[])];
  const idOf=x=>x?.id||x?.lead_id;
  const keys=['title','summary','update','update_summary','description','note','topic','signal','assessment','next_action','recommended_next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','limitations','relevance_summary','why_relevant','caption','caption_says','what_is_visible','observation','scope'];
  const current=()=>{try{return window.ENGINEER_I18N?.getLanguage?.()||localStorage.getItem('engineer_osint_language')||'cs'}catch{return 'cs'}};
  const entity=id=>{const found=all().filter(x=>idOf(x)===id);if(!found.length)return null;const m=Object.assign({},...found);const orig=found.find(x=>x.__orig)?.__orig;if(orig)m.__orig={...orig};return m};
  const enValue=(e,k)=>e?.[k+'_en']??e?.__orig?.[k]??e?.[k]??'';
  const csValue=(e,k)=>e?.[k+'_cs']??'';
  const pairs=e=>{const out=[];for(const k of keys){const cs=csValue(e,k),en=enValue(e,k);if(typeof cs==='string'&&typeof en==='string'&&cs.trim()&&en.trim()&&cs.trim()!==en.trim())out.push([cs.trim(),en.trim()])}for(const c of e?.claims||[]){const cs=c.text_cs??'',en=c.text_en??c.__orig_text??c.text??'';if(typeof cs==='string'&&typeof en==='string'&&cs.trim()&&en.trim()&&cs.trim()!==en.trim())out.push([cs.trim(),en.trim()])}return out.sort((a,b)=>b[0].length-a[0].length)};
  const boxId=box=>box?.dataset?.open||(box?.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL)-\d+|LEAD-[A-Z0-9-]+)/i)?.[0]||null;
  function cleanBox(box){const id=boxId(box),e=entity(id);if(!e)return;const ps=pairs(e);if(!ps.length)return;const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode,p=n.parentElement;if(!p||p.closest('#engineerLanguageSwitch,script,style'))continue;const raw=n.nodeValue||'',t=raw.trim();if(!t)continue;let to='';for(const [cs,en] of ps){if(t===cs){to=en;break}if(t.includes(cs)){to=t.split(cs).join(en);break}}if(!to||to===t)continue;const lead=raw.match(/^\s*/)?.[0]||'',trail=raw.match(/\s*$/)?.[0]||'';n.nodeValue=lead+to+trail}}
  function repair(){if(current()!=='en')return;for(const box of document.querySelectorAll('[data-open],article,.item'))cleanBox(box);const d=document.getElementById('detailContent');if(d)cleanBox(d)}
  let gen=0,timers=[];function schedule(){const token=++gen;for(const id of timers)clearTimeout(id);timers=[];const run=()=>{if(token!==gen)return;repair()};requestAnimationFrame(run);for(const delay of [100,300,700,1200])timers.push(setTimeout(run,delay))}
  document.addEventListener('engineer-language-changed',schedule,false);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#sidebar nav button,#sidebar nav a,#sidebar nav summary,[data-view],#engineerLanguageSwitch button'))schedule()},false);
  document.addEventListener('change',schedule,false);
  schedule();
  window.ENGINEER_I18N_EN_POSTRENDER_CLEANUP={status:'enabled',version:1,repair,schedule};
})();
