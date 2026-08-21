(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map([...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().external_leads||[])].map(x=>[x.lead_id||x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(x[k]===undefined||x[k]===null||x[k]==='')x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const translated=[];
  const qualityFixed=[];
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
  const publicById=new Map(publicObjects().map(x=>[x.id||x.lead_id||x.evidence_id||x.media_id||x.asset_id||x.source_id,x]).filter(([id])=>id));
  const b53Trend=publicById.get('B53-TREND-01');
  if(b53Trend){
    b53Trend.title_cs='Rozšíření ukrajinského vojenského zdrojového ekosystému o strukturovaný repozitář poznatků a zkušeností (Lessons Learned)';
    b53Trend.note_cs='Oficiální repozitář Institutu VMS NU OMA systematicky zpřístupňuje materiály ke studiu a implementaci zkušeností po jednotlivých letech a navazující bulletiny. Jde o nový opakovaně využitelný vyhledávací kanál, nikoli sám o sobě o nový fakt o schopnosti.';
    qualityFixed.push('B53-TREND-01');
  }
  const scalar=['title','summary','update_summary','description','note','topic','signal','assessment','next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption','scope'];
  const arrays=['intelligence_gaps'];
  const enumFields=['status','classification','confidence','temporal_status','canonicalization_status','evidence_type','evidence_status','source_class','role','maturity','stage','institutionalization_status','official_ll_status','coverage','relation_type','visual_level','visual_observation_basis','media_type'];
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const uiCs=()=>window.__ENGINEER_I18N__?.ui?.cs||{};
  const enumCs=v=>{if(v===undefined||v===null)return v;const s=String(v),m=uiCs();return m[s]??m[s.toUpperCase()]??v;};
  function applyPublicRegistry(l=lang()){
    for(const x of publicObjects()){
      x.__i18n_public_orig=x.__i18n_public_orig||{};
      for(const k of [...scalar,...arrays]){
        if(!(k in x.__i18n_public_orig))x.__i18n_public_orig[k]=x[k];
        const v=l==='cs'?(x[k+'_cs']!==undefined?x[k+'_cs']:x.__i18n_public_orig[k]):(x[k+'_en']!==undefined?x[k+'_en']:x.__i18n_public_orig[k]);
        if(v!==undefined)x[k]=v;
      }
      for(const k of enumFields){
        if(!(k in x.__i18n_public_orig))x.__i18n_public_orig[k]=x[k];
        const base=x.__i18n_public_orig[k];
        const v=l==='cs'?(x[k+'_cs']!==undefined?x[k+'_cs']:enumCs(base)):(x[k+'_en']!==undefined?x[k+'_en']:base);
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
  if(typeof document!=='undefined'&&document?.addEventListener)document.addEventListener('engineer-language-changed',e=>applyPublicRegistry(e.detail?.lang||lang()));
  if(typeof document!=='undefined')setTimeout(()=>window.ENGINEER_I18N?.refresh?.(),0);

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-1658-public-status-enum',processed_ids:[...new Set([...translated,...qualityFixed,...review])],fully_translated:qualityFixed.length,partially_translated:0,review_needed:review.length,scope:'PUBLIC-CZ-UI: status je prezentační enum, nikoli volný text. Český režim nyní používá explicitní status_cs nebo centrální enum mapu, EN režim zachovává status_en/base hodnotu.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_PUBLIC_CZ__={translated_entities:[...new Set([...translated,...qualityFixed])],review_needed_entities:review,resolved_mapping_entities:['PUBLIC_REGISTRIES','PUBLIC_REGISTRY_ENUMS','PUBLIC_STATUS_ENUM','AUDIT_VM_SAFE','PUBLIC_CZ_HYBRID_TEXT'],version:'1.5',last_batch:'2026-08-21-1658-public-status-enum'};
})();
