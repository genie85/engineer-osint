(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

  const I=window.__ENGINEER_I18N__;
  if(I?.ui?.cs)Object.assign(I.ui.cs,{
    HISTORICAL_BACKFILL_AND_ENTITY_TOPIC_ENRICHMENT:'HISTORICKÉ DOPLNĚNÍ A OBOHACENÍ TEMATICKÉHO PROFILU ENTITY',
    HISTORICAL_2025_STANDARDIZATION_PROCESS_NOT_CURRENT_PROMULGATION:'HISTORICKÝ STANDARDIZAČNÍ PROCES Z ROKU 2025; NIKOLI SOUČASNÁ PROMULGACE',
    HIGH_FOR_MEETING_REPORT_MEDIUM_FOR_INSTITUTIONAL_DIRECTION_LOW_FOR_EXACT_PARENT_STANDARD:'VYSOKÁ PRO ZPRÁVU Z JEDNÁNÍ; STŘEDNÍ PRO INSTITUCIONÁLNÍ SMĚŘOVÁNÍ; NÍZKÁ PRO PŘESNÝ NADŘAZENÝ STANDARD',
    ANALYST_TRANSLATION_COMPLETE_CZ_EN:'PŘEKLAD ANALYTIKEM DOKONČEN — CZ/EN',
    PRIMARY_OFFICIAL_NATO_ACCR_EDITED_BODY_PUBLIC_PAGE_WITH_SITE_DISCLAIMER:'PRIMÁRNÍ OFICIÁLNÍ VEŘEJNÁ STRÁNKA NATO-AKREDITOVANÉHO SUBJEKTU S UPOZORNĚNÍM WEBU',
    NATO_EOD_EOC_STANDARDIZATION_HISTORICAL_ENRICHMENT:'HISTORICKÉ OBOHACENÍ STANDARDIZACE NATO EOD/EOC',
    PRIMARY_OFFICIAL_COE_WORKING_GROUP_STANDARDIZATION_REPORT:'PRIMÁRNÍ OFICIÁLNÍ ZPRÁVA COE O STANDARDIZAČNÍ PRACOVNÍ SKUPINĚ',
    DIRECT_PUBLIC_EOD_COE_PAGE_READBACK:'PŘÍMÉ OVĚŘENÍ VEŘEJNÉ STRÁNKY EOD COE',
    DIRECT_BODY_PUBLIC_REPORT_WITH_EXPLICIT_SITE_DISCLAIMER:'PŘÍMÁ VEŘEJNÁ ZPRÁVA SUBJEKTU S VÝSLOVNÝM UPOZORNĚNÍM WEBU',
    HIGH_FOR_REPORTED_2025_WORKING_GROUP_ACTIVITY_MEDIUM_FOR_FORMAL_NATO_POLICY:'VYSOKÁ PRO POPSANOU ČINNOST PRACOVNÍ SKUPINY V ROCE 2025; STŘEDNÍ PRO FORMÁLNÍ POLITIKU NATO',
    HISTORICAL_PRIMARY_OFFICIAL_2024_NOT_PROJECTED_TO_2026:'HISTORICKÝ PRIMÁRNÍ OFICIÁLNÍ ÚDAJ Z ROKU 2024; NEPROMÍTAT DO ROKU 2026',
    OFFICIAL_REPORTED_HISTORICAL_SNAPSHOT_NOT_CURRENT_INVENTORY:'OFICIÁLNĚ HLÁŠENÝ HISTORICKÝ SNAPSHOT; NIKOLI SOUČASNÝ INVENTÁŘ',
    HISTORICAL_PROCUREMENT_REQUIREMENT_CLOSED_INACTIVE_NOT_FIELDING:'HISTORICKÝ AKVIZIČNÍ POŽADAVEK UZAVŘEN / NEAKTIVNÍ; NIKOLI DŮKAZ ZAVEDENÍ',
    HIGH_FOR_PUBLISHED_REQUIREMENT_AND_PORTAL_STATUS_LOW_FOR_AWARD_FIELDING:'VYSOKÁ PRO ZVEŘEJNĚNÝ POŽADAVEK A STAV PORTÁLU; NÍZKÁ PRO UDĚLENÍ ZAKÁZKY A ZAVEDENÍ',
    PRIMARY_OFFICIAL_EU_PROCUREMENT_PORTAL:'PRIMÁRNÍ OFICIÁLNÍ PORTÁL EU PRO VEŘEJNÉ ZAKÁZKY'
  });

  put('ENG-EVT-0011',{title_cs:'Ženijní jednotky PLA cvičí překonávání překážek a nouzové zprůchodňování tras'});
  put('ENG-EVT-0012',{title_cs:'Bojoví ženisté PLA provádějí víceoborové hodnocení s ostrými demoličními pracemi'});
  put('ENG-EVT-0013',{title_cs:'Čínská Multirole Engineering Unit předala dvě odminovaná minová pole v Maroun al-Ras'});
  put('ENG-EVT-0020',{title_cs:'NATO CAP veřejně uvádí podporu Ukrajině prostředky EOD/odminování a counter-drone vybavením',intelligence_gaps_cs:['Veřejná stránka je souhrnným přehledem pomoci a neuvádí množství, konkrétní příjemce, termíny dodávek, stav připravenosti ani operační použití. Zároveň neposkytuje dostatek podrobností pro jednoznačné zařazení veškeré podpory odminování do vojenského clearance, EOC nebo humanitárního odminování.']});
  put('ENG-EVT-0026',{title_cs:'Ženijní brigáda 2. armády — 240m plovoucí most přes Eufrat'});

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-0134-public-cz-ui',processed_ids:['ENG-DOC-0051','ENG-EVID-0169','ENG-DOC-0049','ENG-DOC-0050'],fully_translated:0,partially_translated:4,review_needed:0,scope:'PUBLIC-CZ-UI renderer enum coverage for B40/B41 standardization, evidence, procurement and temporal-status tokens. Extend the existing central I.ui.cs map only; preserve English/base fields and factual registries.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_EVENTS_BACKLOG__={translated_entities:['ENG-EVT-0011','ENG-EVT-0012','ENG-EVT-0013','ENG-EVT-0020','ENG-EVT-0026'].filter(id=>R.has(id)),review_needed_entities:[],version:'1.2',last_batch:'2026-08-21-0134-public-cz-ui'};
})();
