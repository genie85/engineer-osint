(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map([...(D.leads?.leads||[]),...(D.dashboard_patch_extras?.leads||[]),...(D.dashboard_patch_extras?.external_leads||[])].map(x=>[x.lead_id||x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(x[k]===undefined||x[k]===null||x[k]==='')x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const translated=[];
  if(put('ENG-EVT-0026',{summary_cs:'Türkiye MSB 9. července 2026 uvedlo dokončení 240m plovoucího mostu ženijní brigádou 2. armády.'}))translated.push('ENG-EVT-0026');
  const review=['LEAD-002','LEAD-003','LEAD-005'].filter(id=>L.has(id)&&!(L.get(id)?.title_cs||L.get(id)?.topic_cs)&&!(L.get(id)?.summary_cs||L.get(id)?.description_cs||L.get(id)?.note_cs));
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-1337-public-cz-backlog',processed_ids:[...translated,...review],fully_translated:translated.length,partially_translated:0,review_needed:review.length,scope:'PUBLIC-CZ-UI: doplnění chybějícího českého summary pro ENG-EVT-0026. LEAD-002/003/005 jsou pouze označeny k revizi, pokud v materializovaném runtime postrádají český veřejný název i popis; bez domýšlení obsahu.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_PUBLIC_CZ__={translated_entities:translated,review_needed_entities:review,resolved_mapping_entities:[],version:'1.0',last_batch:'2026-08-21-1337-public-cz-backlog'};
})();
