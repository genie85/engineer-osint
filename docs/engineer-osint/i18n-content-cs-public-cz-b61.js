(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const records=[...(D.records?.records||[])];
  const sources=[...(D.sources?.sources||[]),...(D.external_source_registry?.sources||[])];
  let translated=0;
  for(const x of records){
    if(x?.id!=='ENG-DOC-0058')continue;
    const cs=x.summary_cs||'Veřejná stránka NATO Military Engineering Centre of Excellence pro NATO Bridge Assessment Course uvádí, že kurz učí metodiky rychlého posouzení mostů podle společných standardů NATO a mezi cíli výslovně uvádí Policy & Doctrine STANAG 2021. Americký registr DLA ASSIST současně eviduje STANAG 2021 jako ACTIVE s názvem Military Load Classification of Bridges, Ferries, Rafts and Vehicles — AEP-3.12.1.5 Edition B a datem promulgace 26. 11. 2024. Jde o veřejně ověřitelnou vazbu mezi aktuálním standardizačním baseline a výcvikem posuzování mostů; veřejná metadata nenahrazují plné znění standardu ani nedokládají konkrétní národní implementaci či nosnost určitého mostu.';
    if(x.fact_cs===undefined||x.fact_cs===null||x.fact_cs===''){x.fact_cs=cs;translated++;}
    if(x.analysis_cs===undefined||x.analysis_cs===null||x.analysis_cs===''){x.analysis_cs=cs;translated++;}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const titles={
    'ENG-SRC-0482':'Kurz NATO pro posuzování mostů (NBAC)',
    'ENG-SRC-0483':'Podrobnosti dokumentu STANAG 2021'
  };
  for(const x of sources){
    const cs=titles[x?.id];if(!cs)continue;
    if(x.title_cs===undefined||x.title_cs===null||x.title_cs===''){x.title_cs=cs;translated++;}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-23-b61-public-cz',processed_ids:translated?['ENG-DOC-0058','ENG-SRC-0482','ENG-SRC-0483']:[],fully_translated:translated,partially_translated:0,review_needed:0,scope:'PUBLIC-CZ-UI: complete B61 Czech presentation for bridge-assessment doctrine record and its two public source titles; factual/base data and English presentation remain unchanged.',english_preserved:true,base_preserved:true});
  window.__ENGINEER_PUBLIC_CZ_B61__={processed_ids:translated?['ENG-DOC-0058','ENG-SRC-0482','ENG-SRC-0483']:[],mapped_fields:translated,base_preserved:true};
})();
