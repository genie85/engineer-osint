(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map([...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().external_leads||[])].map(x=>[x.lead_id||x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(x[k]===undefined||x[k]===null||x[k]==='')x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const translated=[];
  if(put('ENG-EVT-0026',{summary_cs:'Türkiye MSB 9. července 2026 uvedlo dokončení 240m plovoucího mostu ženijní brigádou 2. armády.'}))translated.push('ENG-EVT-0026');
  const review=['LEAD-002','LEAD-003','LEAD-005'].filter(id=>L.has(id)&&!(L.get(id)?.title_cs||L.get(id)?.topic_cs)&&!(L.get(id)?.summary_cs||L.get(id)?.description_cs||L.get(id)?.note_cs));

  const arr=v=>Array.isArray(v)?v:[];
  const publicObjects=()=>[
    ...arr(D.evidence?.evidence),...arr(ex().evidence),
    ...arr(D.sources?.sources),...arr(D.external_source_registry?.sources),
    ...arr(D.visual_registry?.visuals),...arr(D.visuals?.visuals),...arr(ex().visuals),
    ...arr(D.media_registry?.media),...arr(D.media_registry?.items),...arr(D.media?.media),...arr(D.media?.items),...(Array.isArray(D.media)?D.media:[]),...arr(ex().media),
    ...arr(D.lessons_learned?.lessons),...arr(ex().lessons_learned),
    ...arr(D.relations?.relations),...arr(ex().relations),
    ...arr(D.technology_signals),...arr(ex().technology_signals),...arr(D.trend_watch),...arr(ex().trends),
    ...arr(D.doctrine?.doctrine),...arr(ex().doctrine),...arr(D.orbat?.updates),...arr(ex().orbat_updates),
    ...arr(ex().confirmations),...arr(ex().contradictions),...arr(ex().corrections)
  ].filter(Boolean);
  const scalar=['title','summary','update_summary','description','note','topic','status','signal','assessment','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption','scope'];
  const arrays=['intelligence_gaps'];
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  function applyPublicRegistry(l=lang()){
    for(const x of publicObjects()){
      x.__i18n_public_orig=x.__i18n_public_orig||{};
      for(const k of [...scalar,...arrays]){
        if(!(k in x.__i18n_public_orig))x.__i18n_public_orig[k]=x[k];
        const v=l==='cs'?(x[k+'_cs']!==undefined?x[k+'_cs']:x.__i18n_public_orig[k]):(x[k+'_en']!==undefined?x[k+'_en']:x.__i18n_public_orig[k]);
        if(v!==undefined)x[k]=v;
      }
      if(Array.isArray(x.claims))for(const c of x.claims){
        if(!('__i18n_public_orig_text' in c))c.__i18n_public_orig_text=c.text;
        const v=l==='cs'?(c.text_cs!==undefined?c.text_cs:c.__i18n_public_orig_text):(c.text_en!==undefined?c.text_en:c.__i18n_public_orig_text);
        if(v!==undefined)c.text=v;
      }
    }
  }
  applyPublicRegistry();
  document.addEventListener('engineer-language-changed',e=>applyPublicRegistry(e.detail?.lang||lang()));

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-1500-public-registry-i18n',processed_ids:[...translated,...review],fully_translated:translated.length,partially_translated:0,review_needed:review.length,scope:'PUBLIC-CZ-UI: zachování ENG-EVT-0026 summary_cs a oprava merge/render vrstvy pro existující *_cs/*_en pole veřejných evidence/source/visual/media/relations/lessons/trend/doctrine/ORBAT registrů; bez změny factual dat.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_PUBLIC_CZ__={translated_entities:translated,review_needed_entities:review,resolved_mapping_entities:['PUBLIC_REGISTRIES'],version:'1.1',last_batch:'2026-08-21-1500-public-registry-i18n'};
})();
