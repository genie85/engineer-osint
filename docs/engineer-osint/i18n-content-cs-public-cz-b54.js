(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=D.dashboard_patch_extras||{};
  const sources=[...(D.sources?.sources||[]),...(D.external_source_registry?.sources||[]),...(ex.sources||[])];
  const records=[...(D.records?.records||[])];
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
  for(const x of records){
    if(x?.id!=='ENG-SIG-0027')continue;
    const cs=x.summary_cs||'ArmyInform 22. 8. 2026 informoval, že Hlavní ředitelství rozvědky Ministerstva obrany Ukrajiny zveřejnilo archivní záběry z jara 2026 zachycující bojové použití pozemních robotických komplexů Iron Group. Jde o nový publikační signál v aktuálním okně; čas zachyceného děje je historický (jaro 2026), nikoli 22. 8. 2026.';
    if(x.fact_cs===undefined||x.fact_cs===null||x.fact_cs===''){x.fact_cs=cs;translated++;}
    if(x.analysis_cs===undefined||x.analysis_cs===null||x.analysis_cs===''){x.analysis_cs=cs;translated++;}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-22-b54-public-cz',processed_ids:translated?['ENG-SRC-0476','ENG-SIG-0027']:[],fully_translated:translated,partially_translated:0,review_needed:0,scope:'PUBLIC-CZ-UI: add Czech presentation title for ENG-SRC-0476 and fill runtime fact/analysis presentation fields for ENG-SIG-0027 from its existing Czech summary; base factual data and English presentation remain unchanged.',english_preserved:true,base_preserved:true});
  window.__ENGINEER_PUBLIC_CZ_B54__={processed_ids:translated?['ENG-SRC-0476','ENG-SIG-0027']:[],mapped_fields:translated,base_preserved:true};
})();
