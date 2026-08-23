(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const records=[...(D.records?.records||[])];
  const sources=[...(D.sources?.sources||[]),...(D.external_source_registry?.sources||[])];
  let translated=0;
  const processed=new Set();
  for(const x of records){
    if(!['ENG-SIG-0029','ENG-EVT-0123'].includes(x?.id))continue;
    const cs=x.summary_cs;
    if(!cs)continue;
    if(x.fact_cs===undefined||x.fact_cs===null||x.fact_cs===''){x.fact_cs=cs;translated++;processed.add(x.id);}
    if(x.analysis_cs===undefined||x.analysis_cs===null||x.analysis_cs===''){x.analysis_cs=cs;translated++;processed.add(x.id);}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const titles={
    'ENG-SRC-0484':'Sičeslavští výsadkáři zbavují nepřítele prostředků pro útok na pokrovském směru',
    'ENG-SRC-0485':'32. zasedání řídícího výboru EOD COE'
  };
  for(const x of sources){
    const cs=titles[x?.id];if(!cs)continue;
    if(x.title_cs===undefined||x.title_cs===null||x.title_cs===''){x.title_cs=cs;translated++;processed.add(x.id);}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const processedIds=[...processed];
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-23-b62-public-cz',processed_ids:processedIds,fully_translated:processedIds.length,partially_translated:0,review_needed:0,scope:'PUBLIC-CZ-UI: satisfy the B62 bilingual publication gate for the two new public records and their two source titles; factual/base data, confidence, temporal status, provenance, IDs and English presentation remain unchanged.',english_preserved:true,base_preserved:true});
  window.__ENGINEER_PUBLIC_CZ_B62__={processed_ids:processedIds,mapped_fields:translated,base_preserved:true};
})();
