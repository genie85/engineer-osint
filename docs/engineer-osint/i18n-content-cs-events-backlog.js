(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map([...(D.leads?.leads||[]),...(D.dashboard_patch_extras?.leads||[])].map(x=>[x.lead_id||x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};
  const putLead=(id,p)=>{const x=L.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

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
    PRIMARY_OFFICIAL_EU_PROCUREMENT_PORTAL:'PRIMÁRNÍ OFICIÁLNÍ PORTÁL EU PRO VEŘEJNÉ ZAKÁZKY',
    EXISTING_SIGNAL_REINFORCED_NOT_NEW_SIGNAL:'EXISTUJÍCÍ SIGNÁL POSÍLEN; NEJDE O NOVÝ SIGNÁL',
    ANALYTICAL_OBSERVATION_NOT_NATO_LESSON_IDENTIFIED_OR_LEARNED:'ANALYTICKÉ POZOROVÁNÍ; NIKOLI NATO LESSON IDENTIFIED ANI LESSON LEARNED',
    MEDIUM_HIGH_HISTORICAL_BODY_PUBLIC_REPORT:'STŘEDNĚ VYSOKÉ — HISTORICKÁ VEŘEJNÁ ZPRÁVA SUBJEKTU',
    NEW_HISTORICAL_COVERAGE:'NOVĚ DOPLNĚNÉ HISTORICKÉ POKRYTÍ',
    NO_NEW_CURRENT_CANONICAL_MATERIAL:'ŽÁDNÝ NOVÝ AKTUÁLNÍ KANONICKÝ MATERIÁL',
    NO_NEW_CURRENT_CANONICAL_MATERIAL_MKR2_SUCCESSOR_RECHECK_NEGATIVE:'ŽÁDNÝ NOVÝ AKTUÁLNÍ KANONICKÝ MATERIÁL; OPAKOVANÁ KONTROLA NÁSTUPCE MKR-2 NEGATIVNÍ',
    HISTORICAL_EOC_STANDARDIZATION_ENRICHMENT_NO_NEW_PROMULGATION:'HISTORICKÉ OBOHACENÍ STANDARDIZACE EOC; ŽÁDNÁ NOVÁ PROMULGACE',
    HISTORICAL_EOC_STANDARDIZATION_ENRICHMENT:'HISTORICKÉ OBOHACENÍ STANDARDIZACE EOC',
    HISTORICAL_PROFESSIONAL_ARTICLE_2026_NOT_DOCTRINE_NOT_FIELDING:'HISTORICKÝ ODBORNÝ ČLÁNEK Z ROKU 2026; NIKOLI DOKTRÍNA ANI DŮKAZ ZAVEDENÍ',
    HIGH_FOR_PUBLISHED_PROFESSIONAL_ARGUMENT_LOW_FOR_INSTITUTIONAL_ADOPTION:'VYSOKÁ PRO ZVEŘEJNĚNOU ODBORNOU ARGUMENTACI; NÍZKÁ PRO INSTITUCIONÁLNÍ PŘIJETÍ',
    PRIMARY_OFFICIAL_HOSTED_PROFESSIONAL_ARTICLE_NOT_DOCTRINE:'PRIMÁRNÍ OFICIÁLNĚ HOSTOVANÝ ODBORNÝ ČLÁNEK; NIKOLI DOKTRÍNA',
    OFFICIAL_HOSTED_PROFESSIONAL_ENGINEER_ARTICLE:'OFICIÁLNĚ HOSTOVANÝ ODBORNÝ ŽENIJNÍ ČLÁNEK',
    DIRECT_OFFICIAL_ARMY_PUBLICATION_READBACK_TEXT_ONLY_VISUALS_EXCLUDED:'PŘÍMÉ OVĚŘENÍ OFICIÁLNÍ PUBLIKACE U.S. ARMY; POUZE TEXT, VIZUÁLY VYLOUČENY',
    DIRECT_PRIMARY_HOSTED_PROFESSIONAL_ARGUMENT_NOT_POLICY:'PŘÍMÁ PRIMÁRNÍ HOSTOVANÁ ODBORNÁ ARGUMENTACE; NIKOLI POLITIKA',
    HIGH_FOR_ARTICLE_CONTENT_LOW_FOR_FORCE_WIDE_IMPLEMENTATION:'VYSOKÁ PRO OBSAH ČLÁNKU; NÍZKÁ PRO IMPLEMENTACI NAPŘÍČ SILAMI',
    EXISTING_SIGNAL_REINFORCED_NOT_NEW_CANONICAL_SIGNAL:'EXISTUJÍCÍ SIGNÁL POSÍLEN; NEJDE O NOVÝ KANONICKÝ SIGNÁL'
  });

  put('ENG-EVT-0011',{title_cs:'Ženijní jednotky PLA cvičí překonávání překážek a nouzové zprůchodňování tras'});
  put('ENG-EVT-0012',{title_cs:'Bojoví ženisté PLA provádějí víceoborové hodnocení s ostrými demoličními pracemi'});
  put('ENG-EVT-0013',{title_cs:'Čínská Multirole Engineering Unit předala dvě odminovaná minová pole v Maroun al-Ras'});
  put('ENG-EVT-0020',{title_cs:'NATO CAP veřejně uvádí podporu Ukrajině prostředky EOD/odminování a counter-drone vybavením',intelligence_gaps_cs:['Veřejná stránka je souhrnným přehledem pomoci a neuvádí množství, konkrétní příjemce, termíny dodávek, stav připravenosti ani operační použití. Zároveň neposkytuje dostatek podrobností pro jednoznačné zařazení veškeré podpory odminování do vojenského clearance, EOC nebo humanitárního odminování.']});
  put('ENG-EVT-0026',{title_cs:'Ženijní brigáda 2. armády — 240m plovoucí most přes Eufrat'});

  putLead('LEAD-B37-01',{topic_cs:'Ukrajinská stránka certifikace/akreditace v oblasti odminování — nesoulad mezi interním počtem a seznamem'});
  putLead('LEAD-B37-02',{topic_cs:'Aktuální ruský primární řetězec datum–příspěvek–vizuál pro ženijní/odminovací činnost'});
  putLead('LEAD-B40-01',{topic_cs:'Most u Zvannoye a minovací vozidlo u Sudži 17.–18. srpna 2026 — sekundární geolokace; primární vizuální a časový řetězec nevyřešen'});
  putLead('LEAD-B37-04',{topic_cs:'Přesné mapování aktuálního nadřazeného standardu/edice NATO pro EOC — zúženo 68. EOD WG, ale nevyřešeno'});
  putLead('LEAD-B36-04',{topic_cs:'Nástupnická/obnovená certifikace MKR-2 po 20. srpnu 2026 — oficiální registr stále uvádí hranici starého certifikátu; nástupce nenalezen'});
  putLead('LEAD-B40-02',{topic_cs:'Nizozemská akvizice UGV pro IED z roku 2025 — přesný výsledek zadání/zrušení v TED'});
  putLead('LEAD-B42-01',{topic_cs:'Aktuální struktura a technika 91st Support Brigade podle MilitaryLand — sekundární ORBAT stopa vyžadující primární potvrzení jednotlivých položek'});
  putLead('LEAD-B42-02',{topic_cs:'Veřejný dokument NATO NLLP z roku 2024 o ukrajinské Combat Engineering Support — načíst a kanonikalizovat pouze z veřejně zpřístupněné kopie při stabilním přímém přístupu k dokumentu'});

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-0333-public-cz-ui',processed_ids:['ENG-DOC-0052','ENG-EVID-0170','ENG-SRC-0465','B42-TREND-01','LEAD-B42-01','LEAD-B42-02'],fully_translated:2,partially_translated:4,review_needed:0,scope:'PUBLIC-CZ-UI localization of B42 lead topics and core professional-article status/source/evidence tokens in the existing i18n content layer. Preserve English/base fields and factual registries.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_EVENTS_BACKLOG__={translated_entities:['ENG-EVT-0011','ENG-EVT-0012','ENG-EVT-0013','ENG-EVT-0020','ENG-EVT-0026'].filter(id=>R.has(id)),translated_leads:['LEAD-B37-01','LEAD-B37-02','LEAD-B40-01','LEAD-B37-04','LEAD-B36-04','LEAD-B40-02','LEAD-B42-01','LEAD-B42-02'].filter(id=>L.has(id)),review_needed_entities:[],version:'1.5',last_batch:'2026-08-21-0333-public-cz-ui'};
})();
