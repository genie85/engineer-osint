(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs='ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

  put('ENG-UNIT-0017',{title_cs:'JGSDF ženijní vojsko / Engineer School — základní profil'});
  put('ENG-UNIT-0018',{title_cs:'JGSDF 11th Engineer Unit — 11. ženijní jednotka'});
  put('ENG-UNIT-0023',{title_cs:'JGSDF 2nd Engineer Battalion — základní profil jednotky a techniky'});
  put('ENG-UNIT-0024',{title_cs:'JGSDF 7th Engineer Battalion — 7. ženijní prapor'});
  put('ENG-UNIT-0025',{title_cs:'JGSDF 3rd Engineer Battalion — 3. ženijní prapor'});
  put('ENG-UNIT-0026',{title_cs:'JGSDF 8th Engineer Battalion — 8. ženijní prapor'});
  put('ENG-UNIT-0027',{title_cs:'JGSDF 10th Engineer Battalion — aktuální základní profil jednotky'});
  put('ENG-UNIT-0028',{title_cs:'JGSDF 8th Engineer Battalion — 8. ženijní prapor'});

  put('ENG-TECH-0006',{title_cs:'JGSDF 07式機動支援橋 / 07MSB — mobilní podpůrný most'});

  put('ENG-TECH-0020',{title_cs:'83式地雷敷設装置 / Type 83 — systém kladení min'});

  put('ENG-TECH-0016',{
    title_cs:'07式機動支援橋 / 07MSB — mobilní podpůrný most',
    summary_cs:'Japonský mobilní mostní systém zavedený u ženijních jednotek JGSDF jako nástupce staršího Type 81. Veřejné materiály jej spojují s překonáváním řek a terénních mezer; údaje o rozměrech se v různých oficiálních stránkách vztahují zřejmě k odlišným částem systému, což zůstává předmětem ověření.',
    why_it_matters_cs:'Systém představuje důležitou součást japonské schopnosti mobility a překonávání vodních i suchých překážek. Pro srovnání s jinými armádami je podstatné odlišovat parametry přepravní soupravy od parametrů rozvinutého mostu.',
    staff_relevance_cs:'Relevantní pro plánování gap crossing, ženijní mobility a logistických požadavků na přesun a rozvinutí mostního systému.',
    intelligence_gaps_cs:['Přesné rozlišení parametrů nosiče, jednotlivého mostního dílu a kompletního rozvinutého mostu','Aktuální počty a rozdělení mezi ženijní jednotky','Současné zatěžovací limity a interoperabilita s nejtěžší technikou','Aktuální modernizační nebo nástupnický program']
  });

  put('ENG-TECH-0017',{
    title_cs:'92式地雷原処理車 — Type 92 vozidlo pro vytváření průchodů v minových polích',
    summary_cs:'Pásové ženijní vozidlo JGSDF určené k rychlému vytvoření průchodu v minovém poli pomocí raketově dopravovaného prostředku pro odminování. Veřejný zdroj potvrzuje princip systému, nikoli současný počet kusů, jejich jednotkové rozdělení nebo bojovou účinnost.',
    why_it_matters_cs:'Jde o specializovaný prostředek bojového překonávání překážek, který ilustruje japonský přístup k rychlému vytváření průchodů pro manévrové síly.',
    staff_relevance_cs:'Relevantní pro plánování combat breaching, návaznost na manévr a ochranu ženijních prostředků během vytváření průchodu.',
    intelligence_gaps_cs:['Aktuální počet provozovaných vozidel','Jednotkové rozdělení','Stav zásob odminovacích prostředků','Modernizační nebo nástupnické řešení','Výcvikové a taktické začlenění do současných combined-arms scénářů']
  });

  put('ENG-TECH-0018',{
    title_cs:'施設作業車 — obrněné ženijní pracovní vozidlo',
    summary_cs:'Chráněné pásové ženijní pracovní vozidlo JGSDF, nástupce Type 75 armored dozer, určené pro podporu manévru v předním prostoru. Veřejné popisy uvádějí zejména zemní práce, zvedání a výkopové činnosti.',
    why_it_matters_cs:'Kombinuje ochranu osádky s úkoly, které by jinak vyžadovaly méně chráněné stavební stroje, a podporuje tak ženijní práce blíže k bojové činnosti.',
    staff_relevance_cs:'Relevantní pro survivability, mobility support, obnovu cest a přípravu terénu v prostředí s vyšší úrovní ohrožení.',
    intelligence_gaps_cs:['Aktuální počet vozidel','Rozdělení mezi ženijní jednotky','Úroveň ochrany a případné modernizace','Současné použití při cvičeních a operačních úkolech']
  });

  put('ENG-UNIT-0015',{
    title_cs:'Royal Australian Engineers — základní organizační profil',
    summary_cs:'Royal Australian Engineers představují ženijní složku Australian Army pro bojové, geospatial a force-support engineering úkoly. Veřejné zdroje dokládají Combat Engineer Regiments, Engineer Support Regiments, Reserve Engineer Regiments a Special Operations Engineer Regiment.',
    why_it_matters_cs:'Australský model ukazuje oddělení bojové ženijní podpory, širší podpory sil a specializovaných schopností v rámci jedné ženijní větve.',
    staff_relevance_cs:'Relevantní pro srovnání force designu ženijního vojska v armádách NATO-partnerského typu a pro vazby mezi combat engineering, EOD a force support.',
    intelligence_gaps_cs:['Aktuální detailní TO&E jednotlivých pluků','Rozdělení specializované techniky','Přesné C2 vztahy v rámci brigádních task groups','Současné personální a readiness údaje']
  });

  put('ENG-UNIT-0016',{
    title_cs:'20 EOD Squadron — australská EOD jednotka',
    summary_cs:'20 EOD Squadron je veřejně doložený specializovaný australský EOD prvek s vazbou na Royal Australian Engineers. Veřejné materiály z Operation Render Safe potvrzují nasazení jeho příslušníků společně s dalšími ženijními prvky.',
    why_it_matters_cs:'Jde o konkrétní organizační datapoint pro začlenění EOD schopnosti do australského ženijního force designu.',
    staff_relevance_cs:'Relevantní pro srovnání organizační vazby EOD na ženijní síly, nasazování specializovaných týmů a podporu regionálních operací odstraňování výbušných pozůstatků války.',
    intelligence_gaps_cs:['Úplná současná organizační struktura squadrony','Počet EOD týmů a jejich readiness','Vztah k dalším australským EOD prvkům','Přesné kvalifikační vazby na NATO EOD/EOC/EOR']
  });

  put('ENG-EVT-0023',{
    title_cs:'Diamond Dagger — integrace ženistů, UAS a counter-UAS',
    summary_cs:'Australský výcvikový datapoint z Diamond Dagger zachycuje propojení ženijních prvků s bezpilotními prostředky a opatřeními proti UAS. Jde o výcvikový a adaptační signál, nikoli automaticky o doklad plošně zavedené standardní sestavy.',
    why_it_matters_cs:'Ukazuje, že ženijní úkoly jsou stále více plánovány v prostředí intenzivního průzkumu a hrozby bezpilotních systémů.',
    staff_relevance_cs:'Relevantní pro survivability, maskování, ochranu pracovišť a integraci ženijní činnosti do counter-UAS prostředí.',
    intelligence_gaps_cs:['Přesné použité systémy','Rozsah institucionalizace získaných TTP','Navazující výcvikové nebo doktrinální změny']
  });

  put('ENG-TTP-0001',{
    title_cs:'Austrálie — obnovený důraz na polní opevnění a zákopové systémy',
    summary_cs:'Australské veřejné výcvikové materiály znovu zdůrazňují schopnost budovat zákopy a polní ochranné konstrukce jako součást survivability v prostředí moderního bojiště. Jde o trendový výcvikový datapoint, nikoli o úplnou změnu doktríny.',
    why_it_matters_cs:'Potvrzuje širší návrat důrazu na survivability, rozptýlení, ochranu před senzory a nepřímou palbou a schopnost rychle budovat polní infrastrukturu.',
    staff_relevance_cs:'Relevantní pro plánování ženijní podpory obrany, ochranu C2 a logistických uzlů a přípravu jednotek na dlouhodobější působení pod průzkumným a palebným tlakem.',
    intelligence_gaps_cs:['Rozsah formálního zapracování do australské doktríny','Standardizované normy a časové požadavky','Vazba na nové mechanizované zemní prostředky a counter-UAS opatření']
  });

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1316-integrity-fix',processed_ids:['ENG-TECH-0019'],fully_translated:0,partially_translated:1,review_needed:1,scope:'Remove stale Type 75 dozer overlay from ENG-TECH-0019 because the canonical runtime ID is Type 92 Floating Bridge; preserve canonical title_cs and allow EN fallback for untranslated fields.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1618-unit-title-backlog',processed_ids:['ENG-UNIT-0017','ENG-UNIT-0018','ENG-UNIT-0023','ENG-UNIT-0024','ENG-UNIT-0025','ENG-UNIT-0026','ENG-UNIT-0027','ENG-UNIT-0028'],fully_translated:8,partially_translated:0,review_needed:0,scope:'Translate sole missing public field title_cs for eight Japanese ENG-UNIT records; preserve official JGSDF names and canonical English/base data.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1802-tech-backlog',processed_ids:['ENG-TECH-0006'],fully_translated:1,partially_translated:0,review_needed:0,scope:'Translate the sole missing public title_cs for the JGSDF 07 Type Mobile Support Bridge baseline while preserving the official Japanese designation and English/base data.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1848-tech-backlog',processed_ids:['ENG-TECH-0020'],fully_translated:1,partially_translated:0,review_needed:0,scope:'TECH priority; translate the sole missing title_cs for the canonical JGSDF Type 83 mine-laying system while preserving the Japanese designation and countermobility meaning.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_JAPAN_AU__={
    translated_entities:['ENG-TECH-0006','ENG-TECH-0020','ENG-TECH-0016','ENG-TECH-0017','ENG-TECH-0018','ENG-UNIT-0015','ENG-UNIT-0016','ENG-UNIT-0017','ENG-UNIT-0018','ENG-UNIT-0023','ENG-UNIT-0024','ENG-UNIT-0025','ENG-UNIT-0026','ENG-UNIT-0027','ENG-UNIT-0028','ENG-EVT-0023','ENG-TTP-0001'],
    review_needed_entities:['ENG-TECH-0019'],
    version:'1.4',
    last_batch:'2026-08-18-1848-tech-backlog'
  };
})();