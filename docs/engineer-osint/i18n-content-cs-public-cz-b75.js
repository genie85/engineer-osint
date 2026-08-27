(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const leadObjects=()=>[...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().external_leads||[])];
  for(const x of leadObjects()){
    if((x.lead_id||x.id)!=='LEAD-001')continue;
    if(x.topic_cs===undefined||x.topic_cs===null||x.topic_cs==='')x.topic_cs='Přesné označení nadřazeného standardu přílohy EOC a nového návrhu studie NATO';
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
})();
