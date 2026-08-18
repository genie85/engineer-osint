(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

  put('ENG-EVT-0001',{title_cs:'30. zasedání NATO Military Engineering Working Group'});
  put('ENG-EVT-0002',{title_cs:'70. zasedání NATO EOD Working Group schválilo standardizační návrhy'});
  put('ENG-EVT-0003',{title_cs:'Workshop k datové fúzi pro AJP-3.18'});
  put('ENG-EVT-0014',{title_cs:'Combined Annual Discipline Conference sladila vzdělávání a výcvik MILENG, C-IED a EOD pro období 2026–2029'});
  put('ENG-EVT-0015',{title_cs:'11th EOD Workshop 2026 zdůraznil adaptaci v terénu a pokročilé technologie'});

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-2132-evt-backlog',processed_ids:['ENG-EVT-0001','ENG-EVT-0002','ENG-EVT-0003','ENG-EVT-0014','ENG-EVT-0015'],fully_translated:4,partially_translated:1,review_needed:0,scope:'Bounded ENG-EVT presentation batch from exact B51 materialized runtime. Translate only audited canonical titles; ENG-EVT-0002 remains partial because intelligence_gaps_cs is still outstanding and no canonical intelligence_gaps value was emitted by the bounded extractor. English/base fields, evidence and classifications unchanged.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_EVENTS__={translated_entities:['ENG-EVT-0001','ENG-EVT-0002','ENG-EVT-0003','ENG-EVT-0014','ENG-EVT-0015'].filter(id=>R.has(id)),review_needed_entities:[],version:'1.0',last_batch:'2026-08-18-2132-evt-backlog'};
})();
