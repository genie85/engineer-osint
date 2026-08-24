(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const records=[...(D.records?.records||[])];
  const sources=[...(D.sources?.sources||[]),...(D.external_source_registry?.sources||[])];
  const leads=[...(D.leads?.leads||[]),...(D.dashboard_patch_extras?.leads||[]),...(D.dashboard_patch_extras?.external_leads||[])];
  let translated=0;
  const processed=new Set();
  for(const x of records){
    if(x?.id!=='ENG-DOC-0058')continue;
    const cs=x.summary_cs||'Veřejná stránka NATO Military Engineering Centre of Excellence pro NATO Bridge Assessment Course uvádí, že kurz učí metodiky rychlého posouzení mostů podle společných standardů NATO a mezi cíli výslovně uvádí Policy & Doctrine STANAG 2021. Americký registr DLA ASSIST současně eviduje STANAG 2021 jako ACTIVE s názvem Military Load Classification of Bridges, Ferries, Rafts and Vehicles — AEP-3.12.1.5 Edition B a datem promulgace 26. 11. 2024. Jde o veřejně ověřitelnou vazbu mezi aktuálním standardizačním baseline a výcvikem posuzování mostů; veřejná metadata nenahrazují plné znění standardu ani nedokládají konkrétní národní implementaci či nosnost určitého mostu.';
    if(x.fact_cs===undefined||x.fact_cs===null||x.fact_cs===''){x.fact_cs=cs;translated++;processed.add(x.id);}
    if(x.analysis_cs===undefined||x.analysis_cs===null||x.analysis_cs===''){x.analysis_cs=cs;translated++;processed.add(x.id);}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const titles={
    'ENG-SRC-0482':'Kurz NATO pro posuzování mostů (NBAC)',
    'ENG-SRC-0483':'Podrobnosti dokumentu STANAG 2021'
  };
  for(const x of sources){
    const cs=titles[x?.id];if(!cs)continue;
    if(x.title_cs===undefined||x.title_cs===null||x.title_cs===''){x.title_cs=cs;translated++;processed.add(x.id);}
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const leadTopics={
    'B61-LEAD-01':'Denní ukrajinský údaj o ztrátách UGV/NRK zachycený na sekundární veřejné stránce Telegramu',
    'B59-LEAD-01':'69. pracovní skupina EOD — příloha EOC / samostatný návrh studie',
    'B59-LEAD-02':'Denní odhad Generálního štábu Ukrajiny ztrát ruských UGV, 21. srpna 2026',
    'B60-LEAD-01':'Veřejný harmonogram NATO Bridge Assessment Course a metodika posuzování mostů',
    'B60-LEAD-02':'EOD COE Cognitive Insights: EOD v poválečné Ukrajině / pokročilé technologie',
    'B60-LEAD-03':'Příspěvek Generálního štábu Ukrajiny o výcviku ženistů-sapérů',
    'ENG-LEAD-B21-002':'Kurz NATO C-IED Staff Officer IED-ED-22066 zůstává indexovaným oficiálním leadem; bez nové přímé kanonizace.',
    'ENG-LEAD-B31-001':'Geolokované záběry RU-UA mostní/minovací techniky hlášené CTP/ISW pro 17.–18. srpna 2026; kontext primárního vizuálu a data zůstává nevyřešen.'
  };
  for(const x of leads){
    const id=x?.lead_id||x?.id,cs=leadTopics[id];if(!cs)continue;
    if(x.topic_cs===undefined||x.topic_cs===null||x.topic_cs===''){
      x.topic_cs=cs;
      translated++;
      processed.add(id);
    }
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const detailCs={
    'ENG-DOC-0057':'Oficiální výroční přehled AČR zachycuje konkrétní kroky modernizace ženijního vojska v roce 2025: dodávky souprav pro ruční neutralizaci a odminování, smlouvy na disruptory, měřicí techniku, stroje UDS214 na podvozku MAN a kolové nakladače Hyundai HL 960 a dokončené specifikace pro systémy úpravy vody a robotické systémy EOD. U UDS214 a HL 960 dokument pouze uvádí, že dodávky byly plánovány na rok 2026.',
    'ENG-SIG-0028':'Ministerstvo obrany Ukrajiny uvedlo, že UGV v březnu 2026 provedly více než 9 000 bojových a logistických misí a za 1. čtvrtletí přibližně 24 500 misí. Tentýž zdroj uvádí, že v březnu používalo UGV 167 jednotek oproti 67 v listopadu 2025. Jde o silný kvantitativní signál rozšiřování pozemní robotiky, nikoli o počet fyzických platforem.',
    'ENG-UNIT-0038':'Oficiální profil Obranných sil Ukrajiny uvádí, že prvky brigády zesilují obranná postavení, zřizují pontonové mosty, provádějí odminování na souši i ve vodě, chrání strategické objekty, budují ochranné stavby, opravují komunikace a vytvářejí protidronovou ochranu. Profil rovněž uvádí funkce pontonisty a sapéra pro odminování.'
  };
  for(const x of records){
    const cs=detailCs[x?.id];if(!cs)continue;
    let hit=false;
    if(x.fact_cs===undefined||x.fact_cs===null||x.fact_cs===''){x.fact_cs=cs;translated++;hit=true;}
    if(x.analysis_cs===undefined||x.analysis_cs===null||x.analysis_cs===''){x.analysis_cs=cs;translated++;hit=true;}
    if(hit)processed.add(x.id);
    x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';
    x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';
  }
  const processedIds=[...processed];
  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-23-b61-public-cz',processed_ids:processedIds,fully_translated:processedIds.length,partially_translated:0,review_needed:0,scope:'PUBLIC-CZ-UI: complete B61 Czech presentation for bridge-assessment doctrine content and shrink grandfathered ordinary Czech debt for retained analytical lead topics plus existing fact/analysis text on ENG-DOC-0057, ENG-SIG-0028 and ENG-UNIT-0038; factual/base data, identities, evidence mapping and English presentation remain unchanged.',english_preserved:true,base_preserved:true});
  window.__ENGINEER_PUBLIC_CZ_B61__={processed_ids:processedIds,mapped_fields:translated,base_preserved:true};
})();
