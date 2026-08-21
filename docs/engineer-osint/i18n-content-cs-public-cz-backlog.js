(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=()=>D.dashboard_patch_extras||{};
  const leadObjects=()=>[...(D.leads?.leads||[]),...(ex().leads||[]),...(ex().external_leads||[])];
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map(leadObjects().map(x=>[x.lead_id||x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(x[k]===undefined||x[k]===null||x[k]==='')x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const setCs=(id,p)=>{const x=R.get(id);if(!x)return false;Object.assign(x,p);x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const putLead=(id,p)=>{const x=L.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(x[k]===undefined||x[k]===null||x[k]==='')x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const setLeadAll=(id,p)=>{let hit=false;for(const x of leadObjects())if((x.lead_id||x.id)===id){Object.assign(x,p);x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';hit=true;}return hit;};
  const translated=[];
  const qualityFixed=[];
  const uiMap=window.__ENGINEER_I18N__?.ui?.cs;
  if(uiMap){
    Object.assign(uiMap,{
      OPEN:'OTEVŘENO',
      OPEN_PARTIALLY_RESOLVED:'OTEVŘENO – ČÁSTEČNĚ VYŘEŠENO',
      LEAD_UPDATE:'AKTUALIZACE LEADU',
      PMS_TECHNICAL_BASELINE_NOT_CURRENT_INVENTORY:'TECHNICKÝ REFERENČNÍ PROFIL PMS, NIKOLI SOUČASNÝ INVENTÁŘ',
      MT55A_TECHNICAL_BASELINE_NOT_CURRENT_INVENTORY:'TECHNICKÝ REFERENČNÍ PROFIL MT-55A, NIKOLI SOUČASNÝ INVENTÁŘ',
      XM123_ABS_GOBLN_PROGRAM_LINEAGE_ACQUISITION_ROADMAP:'LINIE PROGRAMU XM123 ABS / GOBLN A AKVIZIČNÍ PLÁN',
      DATA_PASS_RENDER_UNVERIFIED:'DATA VYHOVUJÍ – VYKRESLENÍ NEOVĚŘENO',
      OPEN_LATE_DISCOVERED_CURRENT_OFFICIAL_INDEXED_DEEP_LINK_DIRECT_FETCH_CACHE_MISS:'OTEVŘENO – POZDĚJI NALEZENÝ AKTUÁLNÍ OFICIÁLNÍ INDEXOVANÝ ODKAZ; PŘÍMÉ NAČTENÍ SELHALO, PROTOŽE ZÁZNAM NEBYL V MEZIPAMĚTI',
      OPEN_OFFICIAL_CATALOGUE_EVENT_LISTING_PIXEL_LEVEL_PHYSICAL_PRESENCE_UNCONFIRMED:'OTEVŘENO – OFICIÁLNÍ KATALOG UVÁDÍ ÚČAST NA AKCI; FYZICKÁ PŘÍTOMNOST KONKRÉTNÍHO SYSTÉMU NENÍ VIZUÁLNĚ POTVRZENA',
      STATUS_DISCREPANCY_EDA_IN_PREPARATION_VS_RMA_ACTIVE:'ROZPOR STAVU: EDA „V PŘÍPRAVĚ“ VS. RMA „AKTIVNÍ“',
      CURRENT_PROGRAMME_SIGNAL_WITH_SOURCE_STATUS_CONFLICT:'AKTUÁLNÍ PROGRAMOVÝ SIGNÁL S ROZPOREM STAVU VE ZDROJÍCH',
      FACT_ABOUT_PUBLIC_PROJECT_RECORDS_PLUS_UNRESOLVED_STATUS_CONFLICT:'FAKT O VEŘEJNÝCH PROJEKTOVÝCH ZÁZNAMECH + NEVYŘEŠENÝ ROZPOR STAVU',
      HIGH_FOR_DATES_CONTRACT_PARTNERS_MEDIUM_HIGH_FOR_CURRENT_STATUS_DUE_TO_SOURCE_CONFLICT:'VYSOKÁ PRO DATA, KONTRAKT A PARTNERY; STŘEDNĚ VYSOKÁ PRO AKTUÁLNÍ STAV KVŮLI ROZPORU ZDROJŮ',
      OFFICIAL_MILITARY_ACADEMY_PROJECT_RECORD:'OFICIÁLNÍ ZÁZNAM PROJEKTU VOJENSKÉ AKADEMIE',
      PRIMARY_MILITARY_ACADEMY_RESEARCH_PORTAL:'PRIMÁRNÍ VÝZKUMNÝ PORTÁL VOJENSKÉ AKADEMIE',
      PROJECT_LEAD_VENDOR_KICKOFF_RECORD:'ZÁZNAM VEDOUCÍHO DODAVATELE O ZAHÁJENÍ PROJEKTU',
      PRIMARY_VENDOR_PROJECT_LEAD_PAGE:'PRIMÁRNÍ STRÁNKA VEDOUCÍHO DODAVATELE PROJEKTU',
      CORROBORATING_PRIMARY_VENDOR_REPORT:'POTVRZUJÍCÍ PRIMÁRNÍ ZPRÁVA DODAVATELE',
      EUGS_PROGRAMME_PARTICIPANTS_SCHEDULE_AND_SCOPE:'PROGRAM eUGS – ÚČASTNÍCI, HARMONOGRAM A ROZSAH',
      EUGS_KICKOFF_AND_CONSORTIUM_CORROBORATION:'eUGS – POTVRZENÍ ZAHÁJENÍ PROJEKTU A KONSORCIA',
      RECENT_HISTORICAL_BACKFILL:'NEDÁVNÝ HISTORICKÝ DOPLNĚK',
      FACT_ABOUT_OFFICIAL_NATO_TRAINING_PROFILE:'FAKT O OFICIÁLNÍM VÝCVIKOVÉM PROFILU NATO',
      HIGH_FOR_COURSE_PROFILE_LOW_FOR_NATIONAL_IMPLEMENTATION:'VYSOKÁ PRO PROFIL KURZU; NÍZKÁ PRO NÁRODNÍ IMPLEMENTACI',
      PRIMARY_NATO_TRAINING_CATALOGUE:'PRIMÁRNÍ VÝCVIKOVÝ KATALOG NATO',
      C_IED_WEAPONS_INTELLIGENCE_TRAINING_PROFILE:'PROFIL VÝCVIKU WEAPONS INTELLIGENCE V C-IED',
      VERIFIED_INDEXED_OFFICIAL_PAGE:'OVĚŘENÁ INDEXOVANÁ OFICIÁLNÍ STRÁNKA',
      OFFICIAL_NATO_TRAINING_CATALOGUE_RECORD:'OFICIÁLNÍ ZÁZNAM VÝCVIKOVÉHO KATALOGU NATO',
      PRIMARY_NATO_E_ITEEP_ETOC:'PRIMÁRNÍ NATO e-ITEP / ETOC'
    });
    qualityFixed.push('UI-LEAD-OPEN','UI-LEAD-OPEN-PARTIAL','UI-LEAD-UPDATE','UI-PMS-BASELINE','UI-MT55A-BASELINE','UI-XM123-ROADMAP','UI-RENDER-STATUS','UI-DEEP-LINK-CACHE','UI-EVENT-LISTING','B19-EUGS-ENUMS','B19-EVIDENCE-ENUMS','B19-SOURCE-ENUMS','B20-WIT-ENUMS','B20-EVIDENCE-ENUMS');
  }
  if(put('ENG-EVT-0026',{summary_cs:'Türkiye MSB 9. července 2026 uvedlo dokončení 240m plovoucího mostu ženijní brigádou 2. armády.'}))translated.push('ENG-EVT-0026');
  if(setLeadAll('LEAD-001',{title_cs:'Přesné označení nadřazeného standardu přílohy EOC a nového návrhu studie NATO',note_cs:'69. pracovní skupina EOD znovu potvrzuje návrh přílohy EOC ke standardu NATO a přijetí nového návrhu studie; 68. pracovní skupina EOD potvrzuje práci na minimálních standardech EOC s podporou MILENG. Přesné identifikátory zůstávají ve veřejných podkladech nevyřešeny.',next_action_cs:'Sledovat 70. a 71. pracovní skupinu EOD a metadata standardizace NATO kvůli přesnému označení dokumentu a jeho vyhlášení.'}))translated.push('LEAD-001');
  if(setLeadAll('LEAD-002',{title_cs:'ATP-3.12.1 Edition B 2026 — obsah věcných změn',note_cs:'Veřejné shrnutí nebo přehled věcných změn ATP-3.12.1 Edition B 2026 nebyl v dosud materializovaných podkladech nalezen; obsah změn nelze odvozovat pouze z názvu.',next_action_cs:'Dohledat veřejné shrnutí, přehled změn nebo právní metadata národní implementace; obsah změn nevyvozovat pouze z názvu.'}))translated.push('LEAD-002');
  if(setLeadAll('LEAD-003',{title_cs:'Ukrajinský model roty dálkového minování — místní, nebo platný napříč silami',note_cs:'Současné veřejné stránky Pozemních sil Ukrajiny výslovně popisují ženijní UGV používaná k minování, odminování a budování překážek; náborové materiály 110. OMBR uvádějí rotu UGV používající systémy mimo jiné k dálkovému minování a odminování. Posiluje to trend organizační robotizace, ale neprokazuje jednotnou šablonu roty platnou napříč celými silami.',next_action_cs:'Dohledat druhý nezávislý zdroj a určit, zda je reorganizace místní, nebo platná napříč silami.'}))translated.push('LEAD-003');
  if(setLeadAll('LEAD-004',{topic_cs:'Ruské univerzální obrněné ženijní vozidlo UBIM — přijetí do výzbroje a navazující ověření operačního stavu',next_action_cs:'Dohledat nezávislé obrazové podklady, přiřazení k jednotce nebo oficiální potvrzení ruského ministerstva obrany; opakované kopie tvrzení Rostecu nepovažovat za nezávislé zdroje.'}))translated.push('LEAD-004');
  if(setLeadAll('LEAD-005',{title_cs:'EABC — konečné přidělení zakázek',note_cs:'NAMC stále uvádí RPP-26-D01 EABC jako „Pending“. U.S. Army 8. července 2026 oznámila výběr čtyř společností, ale veřejná stopa konečného přidělení zakázek zůstává v tomto běhu nevyřešena.',next_action_cs:'Sledovat Army/CPE Mission Autonomy, NAMC a čtyři vybrané dodavatele kvůli formálním oznámením o přidělení zakázek a demonstracím v letech 2026–2027.'}))translated.push('LEAD-005');
  if(setLeadAll('LEAD-006',{next_action_cs:'Ověřit aktuálnost pro roky 2025–2026 a podrobné složení podřízených prvků brigád ženijní a chemické ochrany skupin armád i ženijních/chemických prvků vševojskových brigád; odlišit standardizovaný model od výjimek.'}))translated.push('LEAD-006');
  if(setLeadAll('LEAD-007',{title_cs:'Současný referenční profil ženijní techniky PLA',next_action_cs:'Dohledat formální čínská označení a specifikace integrovaného odminovacího vozidla, konfigurací mostních prostředků označovaných REBS, pontonových systémů a ženijních průzkumných či dálkově ovládaných systémů.'}))translated.push('LEAD-007');
  if(setLeadAll('LEAD-008',{topic_cs:'Engineer Division Operations ATP — přesné číslo, datum a nahrazovaný dokument',next_action_cs:'Zjistit přesné číslo ATP, datum, nahrazovaný dokument a veřejnou dostupnost; samostatně sledovat publikace Engineer Platoons a Field Data.'}))translated.push('LEAD-008');
  if(setLeadAll('LEAD-009',{next_action_cs:'Zjistit typy UAS, počty, způsob použití na úrovni roty a zda je změna experimentální, nebo institucionalizovaná.'}))translated.push('LEAD-009');
  if(setLeadAll('LEAD-010',{next_action_cs:'Zmapovat přijímající ženijní jednotky a vztahy velení bez odvozování utajovaných podrobností o rozmístění.'}))translated.push('LEAD-010');
  if(putLead('LEAD-050',{recommended_next_action_cs:'Po 20. 8. 2026 znovu prověřit oficiální certifikační registr; z pouhého skončení platnosti certifikátu nevyvozovat stažení prostředku ani ztrátu schopnosti.'}))translated.push('LEAD-050');
  if(putLead('LEAD-052',{recommended_next_action_cs:'Dohledat primární provozní, akviziční nebo servisní záznamy, které oddělí MV-10 od MV-4 a potvrdí počet, distribuci a provozuschopnost k srpnu 2026.'}))translated.push('LEAD-052');
  if(putLead('LEAD-053',{topic_cs:'Současný veřejný záznam ORBAT ženijního praporu 72. mechanizované brigády',status_cs:'OTEVŘENO – ČÁSTEČNĚ DOPLNĚNO; PRIMÁRNĚ POTVRZENA POUZE ROLE SAPÉRA'}))translated.push('LEAD-053');
  if(putLead('LEAD-054',{topic_cs:'SDZ na DALO Industry Days 2026 — oficiální uvedení v katalogu versus přímo pozorované vystavení',status_cs:'POZDNĚ DOHLEDANÁ AKTUÁLNÍ POLOŽKA – UVEDENÍ V KATALOGU POTVRZENO, FYZICKÉ VYSTAVENÍ NEPOZOROVÁNO'}))translated.push('LEAD-054');
  if(setCs('ENG-SIG-0018',{maturity_cs:'ROZPOR STAVU: EDA „V PŘÍPRAVĚ“ VS. RMA „AKTIVNÍ“',temporal_status_cs:'AKTUÁLNÍ PROGRAMOVÝ SIGNÁL S ROZPOREM STAVU VE ZDROJÍCH',classification_cs:'FAKT O VEŘEJNÝCH PROJEKTOVÝCH ZÁZNAMECH + NEVYŘEŠENÝ ROZPOR STAVU',confidence_cs:'VYSOKÁ PRO DATA, KONTRAKT A PARTNERY; STŘEDNĚ VYSOKÁ PRO AKTUÁLNÍ STAV KVŮLI ROZPORU ZDROJŮ'}))translated.push('ENG-SIG-0018');
  if(put('ENG-TECH-0040',{maturity_cs:'VEŘEJNÝ PROFIL VOJENSKÉHO TESTOVÁNÍ',current_value_status_cs:'PODLE OFICIÁLNÍ STRÁNKY NENÍ OPERAČNĚ NASAZEN'}))translated.push('ENG-TECH-0040');
  const review=['LEAD-002','LEAD-003','LEAD-005'].filter(id=>L.has(id)&&!(L.get(id)?.title_cs||L.get(id)?.topic_cs)&&!(L.get(id)?.summary_cs||L.get(id)?.description_cs||L.get(id)?.note_cs));

  const arr=v=>Array.isArray(v)?v:[];
  const publicObjects=()=>[
    ...arr(D.leads?.leads),...arr(ex().leads),...arr(ex().external_leads),
    ...arr(D.evidence?.evidence),...arr(ex().evidence),
    ...arr(D.sources?.sources),...arr(D.external_source_registry?.sources),
    ...arr(D.visual_registry?.visuals),...arr(D.visuals?.visuals),...arr(ex().visuals),
    ...arr(D.media_registry?.media),...arr(D.media_registry?.items),...arr(D.media?.media),...arr(D.media?.items),...(Array.isArray(D.media)?D.media:[]),...arr(ex().media),
    ...arr(D.lessons_learned?.lessons),...arr(ex().lessons_learned),
    ...arr(D.relations?.relations),...arr(ex().relations),
    ...arr(D.technology_signals),...arr(ex().technology_signals),...arr(D.trend_watch),...arr(ex().trends),
    ...arr(D.doctrine?.doctrine),...arr(ex().doctrine),...arr(D.orbat?.updates),...arr(ex().orbat_updates),
    ...arr(ex().confirmations),...arr(ex().contradictions),...arr(ex().corrections)
  ].filter(Boolean);
  const publicById=new Map(publicObjects().map(x=>[x.id||x.lead_id||x.evidence_id||x.media_id||x.asset_id||x.source_id,x]).filter(([id])=>id));
  const b53Trend=publicById.get('B53-TREND-01');
  if(b53Trend){
    b53Trend.title_cs='Rozšíření ukrajinského vojenského zdrojového ekosystému o strukturovaný repozitář poznatků a zkušeností (Lessons Learned)';
    b53Trend.note_cs='Oficiální repozitář Institutu VMS NU OMA systematicky zpřístupňuje materiály ke studiu a implementaci zkušeností po jednotlivých letech a navazující bulletiny. Jde o nový opakovaně využitelný vyhledávací kanál, nikoli sám o sobě o nový fakt o schopnosti.';
    qualityFixed.push('B53-TREND-01');
  }
  const b16Trend=publicById.get('TREND_WATCH_ONLY');
  if(b16Trend){
    b16Trend.status_cs='POTVRZUJÍCÍ SIGNÁL – NEJDE O NOVÝ KANONICKÝ TREND';
    qualityFixed.push('TREND_WATCH_ONLY');
  }
  const b17Trend=publicById.get('TREND-WATCH-B17-ROBOTIC_ENGINEER_TELEOPERATION');
  if(b17Trend){
    b17Trend.status_cs='POUZE POTVRZENÍ – NEJDE O NOVÝ TREND';
    qualityFixed.push('TREND-WATCH-B17-ROBOTIC_ENGINEER_TELEOPERATION');
  }
  const orbat0036=publicById.get('ENG-UNIT-0036');
  if(orbat0036&&orbat0036.scope==='CURRENT_PUBLIC_PROFILE_ACCESSED_2026-08-19'){
    orbat0036.note_cs='Pouze veřejný organizační profil Support Forces na vysoké úrovni; nebyly odvozovány počty podřízených jednotek.';
    qualityFixed.push('ENG-UNIT-0036');
  }
  const scalar=['title','summary','update_summary','description','note','topic','signal','assessment','next_action','recommended_next_action','why_it_matters','staff_relevance','training_relevance','operational_evidence','training_evidence','testing_evidence','what_it_supports','what_it_does_not_prove','analytical_interpretation','fact','analysis','limit','relevance_summary','why_relevant','caption','scope'];
  const arrays=['intelligence_gaps'];
  const enumFields=['status','classification','confidence','temporal_status','current_value_status','canonicalization_status','evidence_type','evidence_status','observation_basis','source_class','role','url_validation_status','maturity','stage','institutionalization_status','official_ll_status','coverage','relation_type','visual_level','visual_observation_basis','media_type'];
  const lang=()=>window.ENGINEER_I18N?.getLanguage?.()||'cs';
  const uiCs=()=>window.__ENGINEER_I18N__?.ui?.cs||{};
  const enumCs=v=>{if(v===undefined||v===null)return v;const s=String(v),m=uiCs();return m[s]??m[s.toUpperCase()]??v;};
  function applyPublicRegistry(l=lang()){
    for(const x of publicObjects()){
      x.__i18n_public_orig=x.__i18n_public_orig||{};
      for(const k of [...scalar,...arrays]){
        if(!(k in x.__i18n_public_orig))x.__i18n_public_orig[k]=x[k];
        const v=l==='cs'?(x[k+'_cs']!==undefined?x[k+'_cs']:x.__i18n_public_orig[k]):(x[k+'_en']!==undefined?x[k+'_en']:x.__i18n_public_orig[k]);
        if(v!==undefined)x[k]=v;
      }
      for(const k of enumFields){
        if(!(k in x.__i18n_public_orig))x.__i18n_public_orig[k]=x[k];
        const base=x.__i18n_public_orig[k];
        const v=l==='cs'?(x[k+'_cs']!==undefined?x[k+'_cs']:enumCs(base)):(x[k+'_en']!==undefined?x[k+'_en']:base);
        if(v!==undefined)x[k]=v;
      }
      if(Array.isArray(x.claims))for(const c of x.claims){
        if(!('__i18n_public_orig_text' in c))c.__i18n_public_orig_text=c.text;
        const v=l==='cs'?(c.text_cs!==undefined?c.text_cs:c.__i18n_public_orig_text):(c.text_en!==undefined?c.text_en:c.__i18n_public_orig_text);
        if(v!==undefined)c.text=v;
      }
    }
  }
  applyPublicRegistry();
  if(typeof document!=='undefined'&&document?.addEventListener)document.addEventListener('engineer-language-changed',e=>applyPublicRegistry(e.detail?.lang||lang()));
  if(typeof document!=='undefined')setTimeout(()=>window.ENGINEER_I18N?.refresh?.(),0);

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-21-1835-p1-leads',processed_ids:[...new Set([...translated,...qualityFixed,...review,'ENG-EVID-0131','ENG-EVID-0132','ENG-DOC-0042','ENG-EVID-0133'])],fully_translated:qualityFixed.length+translated.length+4,partially_translated:0,review_needed:review.length,scope:'PUBLIC-CZ-UI: LEAD-001 až LEAD-010 – doplnění českých veřejných titulů, témat, poznámek a dalších kroků podle materializovaných anglických polí; doplnění bezpečných stavových enum map. EN pole a factual registry data zachována.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_PUBLIC_CZ__={translated_entities:[...new Set([...translated,...qualityFixed,'ENG-EVID-0131','ENG-EVID-0132','ENG-DOC-0042','ENG-EVID-0133'])],review_needed_entities:review,resolved_mapping_entities:['PUBLIC_REGISTRIES','PUBLIC_EXTERNAL_LEADS','PUBLIC_REGISTRY_ENUMS','PUBLIC_STATUS_ENUM','PUBLIC_CURRENT_VALUE_STATUS','PUBLIC_OBSERVATION_BASIS','PUBLIC_URL_VALIDATION_STATUS','B16_B17_TRENDS','B18_PUBLIC_ENUMS','B19_EUGS_ENUMS','B19_EVIDENCE_ENUMS','B20_WIT_ENUMS','P1_LEADS_001_010','PUBLIC_CZ_HYBRID_TEXT','PUBLIC_UI_ENUM_HYBRIDS','AUDIT_VM_SAFE'],version:'2.1',last_batch:'2026-08-21-1835-p1-leads'};
})();