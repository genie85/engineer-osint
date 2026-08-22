(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=D.dashboard_patch_extras||{};
  const sources=[...(D.sources?.sources||[]),...(D.external_source_registry?.sources||[]),...(ex.sources||[])];
  let translated=0;
  for(const x of sources){
    if(x?.id!=='ENG-SRC-0476')continue;
    if(x.title_cs===undefined||x.title_cs===null||x.title_cs===''){
      x.title_cs='„Kryje velkým kalibrem“: GUR ukázala činnost svých bojových pozemních robotických komplexů proti protivníkovi';
      translated++;
    }
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-22-b54-source-title',processed_ids:translated?['ENG-SRC-0476']:[],fully_translated:translated,partially_translated:0,review_needed:0,scope:'PUBLIC-CZ-UI: add Czech presentation title for the new B54 ArmyInform source while preserving the original Ukrainian source title and factual data.',english_preserved:true,base_preserved:true});
  window.__ENGINEER_PUBLIC_CZ_B54_SOURCE_TITLE__={processed_ids:translated?['ENG-SRC-0476']:[],mapped_fields:translated,base_preserved:true};
})();
