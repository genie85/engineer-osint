(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const STATIC={NEW:'NOVÉ',UPDATE:'AKTUALIZACE',CONFIRMATION:'POTVRZENÍ',Reset:'Vymazat filtry',FACT:'FAKT',EVIDENCE:'DŮKAZY','FACT / EVIDENCE':'FAKTA / DŮKAZY','ANALYTICAL INTERPRETATION':'ANALYTICKÁ INTERPRETACE',LIMIT:'OMEZENÍ','WHAT IT DOES NOT PROVE':'CO TO NEDOKLÁDÁ','WHAT THIS DOES NOT PROVE':'CO Z TOHO NELZE TVRDIT','WHY IT MATTERS':'PROČ JE TO DŮLEŽITÉ','STAFF RELEVANCE':'VÝZNAM PRO ŠTÁB','TRAINING RELEVANCE':'VÝZNAM PRO VÝCVIK','INTELLIGENCE GAPS':'INFORMAČNÍ MEZERY','CURRENT CHANGES':'AKTUÁLNÍ ZMĚNY','TECHNOLOGY SIGNALS':'TECHNOLOGICKÉ SIGNÁLY','TREND WATCH':'SLEDOVÁNÍ TRENDŮ','SOURCES':'ZDROJE','RELATIONS':'VAZBY','METHODOLOGY':'METODIKA','AUTORITATIVNÍ VÝZKUMNÝ DATASET':'AUTORITATIVNÍ VÝZKUMNÝ SOUBOR DAT','HISTORICKÉ DOPLNĚNÍ AKTUÁLNÍ PROGRAMOVÉ ROADMAPY Z DUBNA 2026':'HISTORICKÉ DOPLNĚNÍ AKTUÁLNÍHO PROGRAMOVÉHO PLÁNU Z DUBNA 2026','v3.6 bootstrap':'v3.6 inicializace','Propojené pohledy nad entitami, vztahy, evidencí, časem a zdroji. Bootstrap data čekající na kanonikalizaci nesmějí být zaměněna za nový kanonický OSINT běh.':'Propojené pohledy nad entitami, vztahy, důkazy, časem a zdroji. Inicializační data čekající na kanonikalizaci nesmějí být zaměněna za nový kanonický OSINT běh.','Vztahy jsou zdrojované a časově rozlišené. Stav „čeká na kanonikalizaci“ označuje ověřenou prezentační/bootstrap vrstvu, která ještě není součástí kanonického modelu.':'Vztahy jsou zdrojované a časově rozlišené. Stav „čeká na kanonikalizaci“ označuje ověřenou prezentační inicializační vrstvu, která ještě není součástí kanonického modelu.','VYHLEDÁVÁNÍ HISTORICKÝCH TRANSFERŮ':'VYHLEDÁVÁNÍ HISTORICKÝCH PŘEVODŮ','ověřená bootstrap/prezentační vrstva čekající na převod do kanonického modelu; není to nový pravidelný OSINT běh.':'ověřená inicializační/prezentační vrstva čekající na převod do kanonického modelu; není to nový pravidelný OSINT běh.','Externí a primární zdroje v bootstrap registru':'Externí a primární zdroje v inicializačním registru','Referenční entity / bootstrap QA':'Referenční entity / kontrola kvality inicializace','Presentation bootstrap overlay byl po kanonikalizaci vyřazen; relation/evidence pohledy používají kanonická data z posledního dashboard patchu.':'Prezentační inicializační překryv byl po kanonikalizaci vyřazen; pohledy vztahů a důkazů používají kanonická data z poslední aktualizace dashboardu.','Kanonické vztahy používají ENG-REL ID; presentation PB vztahy se po B31 do veřejného runtime nevkládají.':'Kanonické vztahy používají ID ENG-REL; prezentační vztahy PB se po B31 do veřejného běhového prostředí nevkládají.','presentation bootstrap je po B31 pouze auditní/historická pracovní vrstva; veřejný runtime používá kanonický dashboard patch.':'Prezentační inicializace je po B31 pouze auditní/historická pracovní vrstva; veřejné běhové prostředí používá kanonickou aktualizaci dashboardu.'};
  const SCALAR=['title','summary','update_summary','description','note','topic','status','signal','assessment','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption'];
  const ARRAY=['intelligence_gaps'];
  const originals=new WeakMap();
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||document.documentElement.lang||'cs';
  const arr=x=>Array.isArray(x)?x:[];
  const extras=()=>D.dashboard_patch_extras||{};
  function objects(){
    const e=extras();
    return [
      ...arr(D.records?.records),...arr(D.leads?.leads),...arr(e.leads),...arr(e.external_leads),...arr(e.updated_records),
      ...arr(e.technology_signals),...arr(e.trends),...arr(e.confirmations),...arr(e.contradictions),...arr(e.corrections),
      ...arr(D.evidence?.evidence),...arr(e.evidence),...arr(D.sources?.sources),...arr(D.lessons_learned?.lessons),...arr(e.lessons_learned),
      ...arr(e.visuals),...arr(e.media),...arr(e.doctrine),...arr(e.orbat_updates)
    ].filter(x=>x&&typeof x==='object');
  }
  function idOf(x){return x.id||x.lead_id||x.evidence_id||x.media_id||x.asset_id||x.source_id||null}
  function translationPairs(){
    const m=new Map();
    for(const x of objects()){
      for(const k of SCALAR){
        const en=x[k+'_en']??x[k];const cs=x[k+'_cs'];
        if(typeof en==='string'&&typeof cs==='string'&&en.trim()&&cs.trim()&&en.trim()!==cs.trim())m.set(en.trim(),cs.trim());
      }
      for(const k of ARRAY){
        const en=x[k+'_en']??x[k],cs=x[k+'_cs'];
        if(Array.isArray(en)&&Array.isArray(cs))for(let i=0;i<Math.min(en.length,cs.length);i++)if(typeof en[i]==='string'&&typeof cs[i]==='string'&&en[i].trim()&&cs[i].trim()&&en[i].trim()!==cs[i].trim())m.set(en[i].trim(),cs[i].trim());
      }
      for(const c of arr(x.claims)){
        const en=c.text_en??c.text,cs=c.text_cs;if(typeof en==='string'&&typeof cs==='string'&&en.trim()&&cs.trim()&&en.trim()!==cs.trim())m.set(en.trim(),cs.trim());
      }
    }
    return m;
  }
  function objectMap(){const m=new Map();for(const x of objects()){const id=idOf(x);if(id)m.set(id,x)}return m}
  function replaceNode(n,value){if(!originals.has(n))originals.set(n,n.nodeValue);const raw=n.nodeValue||'',lead=raw.match(/^\s*/)?.[0]||'',trail=raw.match(/\s*$/)?.[0]||'';n.nodeValue=lead+value+trail}
  function apply(){
    const cs=String(lang()).toLowerCase().startsWith('cs');
    if(!cs){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(originals.has(n)){n.nodeValue=originals.get(n);originals.delete(n)}}return}
    const pairs=translationPairs(),byId=objectMap();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const n=walker.currentNode,p=n.parentElement;if(!p||p.closest('#engineerLanguageSwitch')||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))continue;
      const t=(n.nodeValue||'').trim();if(!t)continue;
      if(STATIC[t]){replaceNode(n,STATIC[t]);continue}
      if(pairs.has(t)){replaceNode(n,pairs.get(t));continue}
      const bad=t.match(/^((?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL|TREND)-\d+|LEAD-[A-Z0-9-]+))\s*[—-]\s*undefined$/i);
      if(bad){const x=byId.get(bad[1]);const title=x?.title_cs||x?.topic_cs;if(title)replaceNode(n,bad[1]+' — '+title);continue}
      if(/^undefined$/i.test(t)){
        const box=p.closest('[data-open],article,.item,#detailContent');const id=(box?.dataset?.open||(box?.textContent||'').match(/(?:ENG-(?:TECH|UNIT|EVT|DOC|TTP|SIG|LL|TREND)-\d+|LEAD-[A-Z0-9-]+)/i)?.[0]);const x=byId.get(id);const title=x?.title_cs||x?.topic_cs;if(title)replaceNode(n,title);
      }
    }
  }
  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  document.addEventListener('engineer-language-changed',queue);
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,characterData:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply):apply();
  window.ENGINEER_PUBLIC_CZ_CANARY={refresh:apply,objectCount:()=>objects().length};
})();