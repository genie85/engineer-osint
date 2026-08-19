(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

  put('ENG-EVT-0011',{title_cs:'Ženijní jednotky PLA cvičí překonávání překážek a nouzové zprůchodňování tras'});
  put('ENG-EVT-0012',{title_cs:'Bojoví ženisté PLA provádějí víceoborové hodnocení s ostrými demoličními pracemi'});
  put('ENG-EVT-0013',{title_cs:'Čínská Multirole Engineering Unit předala dvě odminovaná minová pole v Maroun al-Ras'});
  put('ENG-EVT-0020',{title_cs:'NATO CAP veřejně uvádí podporu Ukrajině prostředky EOD/odminování a counter-drone vybavením'});
  put('ENG-EVT-0026',{title_cs:'Ženijní brigáda 2. armády — 240m plovoucí most přes Eufrat'});

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-19-2036-evt-backlog',processed_ids:['ENG-EVT-0011','ENG-EVT-0012','ENG-EVT-0013','ENG-EVT-0020','ENG-EVT-0026'],fully_translated:5,partially_translated:0,review_needed:0,scope:'EVT backlog; translate the sole missing title_cs for five exact audited materialized runtime records. Preserve English/base fields, mine-action context, classifications, confidence, temporal status and source/evidence meaning.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_EVENTS_BACKLOG__={translated_entities:['ENG-EVT-0011','ENG-EVT-0012','ENG-EVT-0013','ENG-EVT-0020','ENG-EVT-0026'].filter(id=>R.has(id)),review_needed_entities:[],version:'1.0',last_batch:'2026-08-19-2036-evt-backlog'};
})();
