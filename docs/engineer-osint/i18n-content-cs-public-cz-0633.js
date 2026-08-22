(function(){
  const I=window.__ENGINEER_I18N__;
  if(!I?.ui?.cs)return;
  Object.assign(I.ui.cs,{
    HISTORICAL_ORBAT_AND_READINESS_ENRICHMENT:'HISTORICKÉ OBOHACENÍ ORBAT A PŘIPRAVENOSTI',
    PRIMARY_OFFICIAL_CZECH_MINISTRY_ANNUAL_REPORT:'PRIMÁRNÍ OFICIÁLNÍ VÝROČNÍ ZPRÁVA MO ČR',
    CZE_15ENGR_REGIMENT_CTIPS_EOD_AND_2016_READINESS_HISTORICAL_ORBAT:'15. ŽENIJNÍ PLUK AČR — CTIP EOD A HISTORICKÝ ORBAT / PŘIPRAVENOST 2016',
    VERIFIED_DIRECT_OFFICIAL_PDF_TEXT_READBACK:'OVĚŘENO PŘÍMÝM TEXTOVÝM NAČTENÍM OFICIÁLNÍHO PDF',
    HISTORICAL_SNAPSHOT_2016:'HISTORICKÝ SNAPSHOT 2016',
    HIGH_FOR_2016_SNAPSHOT:'VYSOKÁ PRO SNAPSHOT 2016',
    PRIMARY_OFFICIAL_CZECH_HISTORICAL_ORBAT_AND_READINESS_REPORT:'PRIMÁRNÍ OFICIÁLNÍ ČESKÁ HISTORICKÁ ZPRÁVA O ORBAT A PŘIPRAVENOSTI',
    DIRECT_OFFICIAL_MO_ANNUAL_REPORT_TEXT_READBACK_PAGE_106:'PŘÍMÉ TEXTOVÉ OVĚŘENÍ OFICIÁLNÍ ROČENKY MO — STRANA 106',
    PRIMARY_HISTORICAL_REPORT:'PRIMÁRNÍ HISTORICKÁ ZPRÁVA',
    HIGH_FOR_2016_HISTORICAL_SNAPSHOT_LOW_FOR_CURRENT_INFERENCE:'VYSOKÁ PRO HISTORICKÝ SNAPSHOT 2016; NÍZKÁ PRO SOUČASNÝ ZÁVĚR',
    ENTITY_ENRICHMENT_BASED_ON_2026_07_20_AND_2026_08_12_OFFICIAL_POLICY:'OBOHACENÍ ENTITY NA ZÁKLADĚ OFICIÁLNÍ POLITIKY Z 20. 7. A 12. 8. 2026',
    FACTUAL_POLICY_AND_PROCUREMENT_SIGNAL_WITH_BOUNDED_INFERENCE:'FAKTICKÝ SIGNÁL POLITIKY A AKVIZICE S OHRANIČENÝM ODVOZENÝM ZÁVĚREM',
    HIGH_FOR_SYSTEMIC_SUPPLY_SHIFT_MEDIUM_HIGH_FOR_ENGINEERING_RELEVANCE:'VYSOKÁ PRO SYSTÉMOVÝ POSUN V ZÁSOBOVÁNÍ; STŘEDNĚ VYSOKÁ PRO ŽENIJNÍ RELEVANCI',
    PRIMARY_OFFICIAL_UKRAINIAN_DEFENCE_PROCUREMENT:'PRIMÁRNÍ OFICIÁLNÍ ZDROJ UKRAJINSKÉHO OBRANNÉHO NÁKUPU',
    VERIFIED_DIRECT_DEEP_LINK_TITLE_PUBLISHER_DATE_BODY_MATCH:'OVĚŘENO PŘÍMÝM ODKAZEM — SOUHLASÍ NÁZEV, VYDAVATEL, DATUM A OBSAH',
    HISTORICAL_STANDARDIZATION_ACTIVITY:'HISTORICKÁ STANDARDIZAČNÍ ČINNOST',
    FACT_ABOUT_OFFICIAL_NATO_PUBLICATION_WITH_METADATA_LIMIT:'FAKT Z OFICIÁLNÍ PUBLIKACE NATO S OMEZENÍM METADAT',
    UNDATED_TECHNICAL_PROFILE_NOT_CURRENT_INVENTORY:'NEDATOVANÝ TECHNICKÝ PROFIL; NEJDE O SOUČASNÝ INVENTÁŘ',
    FACT_FOR_TECHNICAL_PROFILE_CURRENT_STATUS_UNKNOWN:'FAKT PRO TECHNICKÝ PROFIL; SOUČASNÝ STAV NEZNÁMÝ',
    HIGH_FOR_TECHNICAL_PROFILE_LOW_FOR_CURRENT_STATUS:'VYSOKÁ PRO TECHNICKÝ PROFIL; NÍZKÁ PRO SOUČASNÝ STAV',
    PRIMARY_OFFICIAL_NATO:'PRIMÁRNÍ OFICIÁLNÍ ZDROJ NATO',
    PRIMARY_OFFICIAL_CZECH_ARMED_FORCES:'PRIMÁRNÍ OFICIÁLNÍ ZDROJ AČR',
    OFFICIAL_NATO_REPORT:'OFICIÁLNÍ ZPRÁVA NATO',
    PRIMARY_OFFICIAL_NATO_ACT_ARTICLE:'PRIMÁRNÍ OFICIÁLNÍ ČLÁNEK NATO ACT',
    PRIMARY_REPORT:'PRIMÁRNÍ ZPRÁVA',
    HIGH_FOR_2025_WORK_ACTIVITY_LOW_FOR_EDITION_INFERENCE:'VYSOKÁ PRO ČINNOST V ROCE 2025; NÍZKÁ PRO ODHAD EDICE',
    OFFICIAL_TECHNICAL_PROFILE:'OFICIÁLNÍ TECHNICKÝ PROFIL',
    PRIMARY_OFFICIAL_CZECH_ARMED_FORCES_TECHNICAL_PAGE:'PRIMÁRNÍ OFICIÁLNÍ TECHNICKÁ STRÁNKA AČR',
    PRIMARY_REPORT_UNDATED:'PRIMÁRNÍ ZPRÁVA BEZ UVEDENÉHO DATA',
    HIGH_FOR_TECHNICAL_PAGE_CONTENT_LOW_FOR_CURRENT_STATUS:'VYSOKÁ PRO OBSAH TECHNICKÉ STRÁNKY; NÍZKÁ PRO SOUČASNÝ STAV',
    HIGH:'VYSOKÁ',
    'MEDIUM-HIGH':'STŘEDNĚ VYSOKÁ',
    NEW:'NOVÉ',
    UPDATE:'AKTUALIZACE'
  });
  window.__ENGINEER_PUBLIC_CZ_ENUM_BATCH_0633__={
    processed_ids:['ENG-UNIT-0035','ENG-SRC-0473','ENG-REL-0013','ENG-EVID-0180','ENG-SIG-0026','ENG-SRC-0474','ENG-SRC-0475','ENG-EVID-0181'],
    mapped_fields:15,
    english_preserved:true
  };
  window.__ENGINEER_PUBLIC_CZ_ENUM_BATCH_0935__={
    processed_ids:['ENG-DOC-0033','ENG-TECH-0028','ENG-SRC-0366','ENG-SRC-0367','ENG-EVID-0074','ENG-EVID-0075'],
    mapped_fields:15,
    english_preserved:true
  };
  window.__ENGINEER_PUBLIC_CZ_ENUM_BATCH_1035__={
    processed_ids:['ENG-EVT-0001','ENG-EVT-0002','ENG-EVT-0003','ENG-EVT-0004','ENG-EVT-0005','ENG-EVT-0006','ENG-EVT-0007','ENG-EVT-0008','ENG-EVT-0009','ENG-EVT-0010'],
    mapped_fields:4,
    english_preserved:true
  };

  const D=window.__ENGINEER_DATA__;
  if(D?.records?.records){
    const R=new Map(D.records.records.map(x=>[x.id,x]));
    const put=(id,text)=>{const x=R.get(id);if(!x)return false;if(!x.fact_cs)x.fact_cs=text;if(!x.analysis_cs)x.analysis_cs=text;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
    const put2=(id,fact,analysis)=>{const x=R.get(id);if(!x)return false;if(!x.fact_cs)x.fact_cs=fact;if(!x.analysis_cs)x.analysis_cs=analysis;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
    const putEvt=(id,fact,analysis,limit,confidence)=>{const x=R.get(id);if(!x)return false;if(!x.fact_cs)x.fact_cs=fact;if(!x.analysis_cs)x.analysis_cs=analysis;if(limit&&x.limit&&!x.limit_cs)x.limit_cs=limit;if(confidence&&x.confidence&&!x.confidence_cs)x.confidence_cs=confidence;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
    const done=[];
    if(put('ENG-DOC-0046','Oficiální A report 4/2016 popisuje Centrum technické a informační podpory EOD 15. ženijního pluku jako poskytovatele kurzu EOR a navazujícího kurzu pyrotechnika EOD. Záznam je historický snapshot z roku 2016 a neprokazuje současnou organizační podřízenost, dnešní osnovy ani délku kurzů.'))done.push('ENG-DOC-0046');
    if(put('ENG-DOC-0047','Oficiální materiály výrobce dokumentují program THeMIS/ROCUS pro Ukrajinu: sedm THeMIS s payloady CNIM pro route clearance bylo kontrahováno v roce 2022; v roce 2024 výrobce na základě zpětné vazby uživatele uváděl použití při odminování a route clearance; v květnu 2025 oznámil dalších šest ROCUS pro ukrajinskou DSNS a uvedl, že mají navázat na sedm dříve nasazených ROCUS. Jde o vendor-reported historii; sama o sobě neprokazuje aktuální provozuschopný počet v roce 2026.'))done.push('ENG-DOC-0047');
    if(put('ENG-DOC-0048','Oficiální rumunské zprávy z 11., 16. a 20. srpna 2026 ukazují opakované nasazení námořních EOD týmů k driftujícím bezosádkovým prostředkům a jejich troskám v Černém moři: 11. srpna byly řízeně zničeny dva UAV Gerbera označené jako možné nosiče výbušniny; 16. srpna byla u Neptun Alpha vyzvednuta část dronu; 20. srpna EOD po neúplném zásahu F-16 neutralizovalo námořní dronu s potvrzenou výbušnou náloží. Série podporuje závěr o rostoucím překryvu EOD, námořní bezpečnosti a reakce na UxV, nikoli tvrzení o společném původu zařízení či změně celonatovské doktríny.'))done.push('ENG-DOC-0048');
    if(put('ENG-DOC-0049','Oficiální magazín nizozemského ministerstva obrany z 5. listopadu 2024 uvádí 15 nových vozidel pro zásahy u podezření na IED a 33 nových robotů Telemax Hybride. Jde o historický snapshot; nelze z něj odvozovat počet provozuschopných kusů v roce 2026.'))done.push('ENG-DOC-0049');
    if(put('ENG-DOC-0050','Oficiální portál Publications Office EU zachycuje nizozemský obranný požadavek oznámený 12. června 2025 na několik UGV se senzory pro detekci IED, přenos dat a obrazu operátorům a alespoň částečně autonomní provoz. K 20. srpnu 2026 stránka uváděla Inactive/closed; záznam neprokazuje kontrakt, dodávku ani zavedení do výzbroje.'))done.push('ENG-DOC-0050');
    if(put('ENG-DOC-0051','Veřejný report EOD COE z 68. EOD Working Group (17.–20. března 2025) uvádí, že pracovní skupina řešila standardy AEODP-06, AEODP-10 a AEODP-05, EOC úkoly a že minimální standardy odborné způsobilosti pro Explosive Ordnance Clearance mají být znovu definovány s podporou komunity MILENG. Report zároveň uvádí custodianship EOD COE pro AJP-3.18. Neidentifikuje však přesný NATO standard/edici, do níž má být EOC příloha nebo nová definice vložena, a sám web upozorňuje, že zveřejněné názory nemusí představovat oficiální politiku NATO.'))done.push('ENG-DOC-0051');
    if(put('ENG-DOC-0052','Článek ve Warrant Officer Journal na oficiálním portálu U.S. Army Line of Departure z 1. června 2026 navrhuje pro LSCO kombinovat ženijní stavební jednotky, komerčně dostupné mostní systémy (COTS), využití a overbridging stávajících pevných mostů a geolokační/datový reachback. Text výslovně pracuje s REDI, mostním průzkumem a rychlou návrhovou podporou. Jde o odborný profesní článek, nikoli promulgovanou doktrínu, schválenou změnu MTOE ani důkaz zavedení této koncepce napříč U.S. Army.'))done.push('ENG-DOC-0052');
    if(put('ENG-DOC-0053','Oficiální český registr obranné standardizace veřejně uvádí STANAG 2238 → AJP-3.12, edice 4 (20. 1. 2021); STANAG 2394 → ATP-3.12.1, edice 5 (10. 7. 2023); STANAG 2282 → ATP-3.18.1, edice 4 (23. 5. 2025); a STANAG 2143 → AEODP-10, edice 7 (7. 2. 2020). Tím se zpřesňuje veřejná metadata vazba mezi klíčovými MILENG/EOD publikacemi. Samotný registr však neobsahuje jejich plný text a nerozhoduje přesnou současnou definici EOC ani její plnotextový normativní parent mapping.'))done.push('ENG-DOC-0053');
    if(put('ENG-DOC-0054','Oficiální žádost OPS(EADRCC)(2026)0045 z 11. 8. 2026 uvádí potřeby Státní služby Ukrajiny pro mimořádné situace pro humanitární odminování a přepravu výbušné munice. Mezi požadavky patří lehké a těžší EOD ochranné obleky, magnetometry, dálkové iniciační a manipulační prostředky, podvodní detektory, 10 AUV/ROV Tethys One a 100 robotických systémů typu Vanguard-ST nebo ekvivalent. Jde o deklarovanou potřebu/žádost, nikoli o potvrzené dodávky, držení ani operační stav.'))done.push('ENG-DOC-0054');
    if(put('ENG-DOC-0055','Veřejná 12stránková studie z roku 2024, zpřístupněná přes NATO Lessons Learned Portal, systematizuje úkoly ženijní podpory na základě ukrajinské zkušenosti z války a práce s NATO publikacemi. Navrhuje čtyři skupiny: podpora mobility vlastních vojsk; omezení mobility protivníka; zvýšení přežití a bezpečnosti vojsk a objektů; všeobecná ženijní podpora. Mezi konkrétní úkoly řadí ženijní průzkum, přípravu a údržbu tras, zřizování průchodů v zátarasech a ničení překážek, překonávání vodních překážek, zřizování minových a dalších překážek, maskování, ženijní budování postavení a podporu klamání. Jde o analyticko-akademický výstup, nikoli o důkaz zavedení jediné nové standardizované struktury ukrajinských ženijních sil.'))done.push('ENG-DOC-0055');
    if(put('ENG-DOC-0056','Oficiální stránka Bundeswehru k cvičení Orange Road 2026 popisuje vojenské přesuny, řízení dopravy a civilně-vojenskou koordinaci na přibližně 6 000 km²; při simulovaném zničení mostu přes Rýn byla vojenská kolona odkloněna na náhradní přechod, Feldjäger řídili provoz a 5. rota Pionierbrückenbataillon 130 zajišťovala provoz přívozu. Jde o popis konkrétního cvičení, nikoli o důkaz univerzálního modelu C2 pro všechny přechody Bundeswehru nebo NATO.'))done.push('ENG-DOC-0056');
    if(put2('ENG-SIG-0014','NATO EOD COE popisuje rozšiřování VR výcvikových nástrojů pro komplexní scénáře EOD včetně simulace prostředí a postupů před reálným výcvikem.','Jde o technologický signál ve výcviku EOD, nikoli o důkaz plošného operačního zavedení nebo nahrazení živého výcviku.'))done.push('ENG-SIG-0014');
    if(put2('ENG-SIG-0015','Oficiální polské zdroje popisují program automatizovaných prostředků pro rychlé vytváření protivozidlových překážek a řízení bojiště, který má být integrován do ženijních vojsk.','Signál posiluje trend automatizace countermobility na východním křídle NATO, ale veřejné podklady zatím neumožňují přesně určit rozsah zavedení ani konečný počet systémů.'))done.push('ENG-SIG-0015');
    if(put2('ENG-SIG-0016','U.S. Army a programové zdroje k EABC popisují vývoj autonomního nebo BLOS robotického průlomu složitými překážkami a minovými poli s cílem snížit vystavení personálu.','Jde o vývojový program a technologický signál; výběr účastníků ani plánované demonstrace samy o sobě neprokazují operační zavedení.'))done.push('ENG-SIG-0016');
    if(put2('ENG-SIG-0017','Veřejné zdroje U.S. Army popisují experimenty s integrací UAS, robotických pozemních systémů a digitálních senzorů do ženijních úkolů průzkumu a průlomu.','Jde o trend experimentování a integrace manned-unmanned teaming; rozsah standardizace v TO&E a plošné zavedení zůstávají neprokázané.'))done.push('ENG-SIG-0017');
    if(put2('ENG-SIG-0018','Veřejné programové materiály popisují využití AI, senzorové fúze a robotických platforem pro detekci a klasifikaci výbušných hrozeb a podporu průlomu.','Jde o vývojový technologický signál, nikoli o důkaz plně autonomního rozhodování EOD nebo operačně zavedeného systému.'))done.push('ENG-SIG-0018');
    if(put2('ENG-SIG-0023','Oficiální ukrajinské zdroje popisují rozšiřování pozemních robotických systémů v logistice, průzkumu, minování, odminování a dalších podpůrných rolích.','Trend ukazuje rychlou institucionalizaci UGV, ale veřejné zdroje neumožňují bezpečně odvodit jednotnou šablonu organizace, počty ani připravenost napříč celými silami.'))done.push('ENG-SIG-0023');
    if(put2('ENG-TECH-0030','Oficiální a výrobní materiály popisují platformu jako bezosádkový systém pro ženijní nebo EOD úlohy se schopností dálkového ovládání a integrace specializovaných payloadů.','Veřejné údaje podporují existenci a deklarované technické role, ale neprokazují rozsah operačního zavedení ani připravenost v roce 2026.'))done.push('ENG-TECH-0030');
    if(put2('ENG-TECH-0042','Oficiální nebo výrobní zdroje popisují systém jako ženijní/robotickou platformu určenou pro podporu mobility, odminování nebo manipulaci s nebezpečnými objekty.','Jde o technologický a akviziční signál; současný počet kusů, připravenost a rozsah operačního použití zůstávají veřejně nejasné.'))done.push('ENG-TECH-0042');
    if(put2('ENG-UNIT-0034','Veřejné oficiální zdroje popisují ženijní jednotku a její deklarované úkoly nebo organizační vazby v konkrétním časovém snapshotu.','Záznam podporuje veřejný organizační profil, ale nelze jej bez dalšího promítat do úplného současného TO&E, počtů techniky ani připravenosti.'))done.push('ENG-UNIT-0034');
    if(put2('ENG-UNIT-0035','Veřejné oficiální zdroje popisují historický nebo současný organizační profil jednotky včetně ženijních/EOD rolí.','Záznam je užitečný pro ORBAT a vazby schopností, ale neprokazuje neveřejné personální počty, zásoby techniky ani aktuální bojovou připravenost.'))done.push('ENG-UNIT-0035');
    window.__ENGINEER_PUBLIC_CZ_0633__={processed_ids:done,english_preserved:true};

    const evt1136=[];
    if(putEvt('ENG-EVT-0011','Oficiální podklady k cvičení Northern Strike 26 popisují plánované experimentální hodnocení ženijního průlomu s robotickými prostředky a porovnání s tradičními postupy.','Událost poskytuje hodnotný experimentální rámec, ale bez veřejně vydaných výsledků po cvičení nelze tvrdit zlepšení času, potřeby personálu, spotřeby paliva ani účinnosti.',null,null))evt1136.push('ENG-EVT-0011');
    if(putEvt('ENG-EVT-0012','Oficiální U.S. Army materiály popisují integraci robotických prostředků do ženijního průlomu, včetně úkolů průzkumu, redukce překážek a podpory manévru.','Jde o experimentální a vývojový signál, nikoli o důkaz plošně zavedené standardní konfigurace ženijních jednotek.',null,null))evt1136.push('ENG-EVT-0012');
    if(putEvt('ENG-EVT-0013','Oficiální výrobní a programové zdroje popisují platformu v rámci ženijních/robotických úloh a její demonstraci či hodnocení.','Událost podporuje technologický trend, ale bez dalších primárních podkladů neprokazuje operační připravenost ani plošné zavedení.',null,null))evt1136.push('ENG-EVT-0013');
    if(putEvt('ENG-EVT-0014','Oficiální zdroje popisují výcvikovou nebo demonstrační aktivitu se ženijní technikou či robotickými prostředky v konkrétním časovém rámci.','Jde o doloženou aktivitu, ale samotná účast na cvičení nebo demonstraci není důkazem změny doktríny, TO&E ani zavedení schopnosti v celých silách.',null,null))evt1136.push('ENG-EVT-0014');
    if(putEvt('ENG-EVT-0015','Oficiální zdroje uvádějí výcvik nebo experiment s ženijními/EOD schopnostmi a bezosádkovými systémy.','Událost podporuje trend integrace robotiky do ženijního výcviku; rozsah institucionalizace zůstává omezený na veřejně doložený případ.',null,null))evt1136.push('ENG-EVT-0015');
    if(putEvt('ENG-EVT-0016','Royal Navy popsalo výcvik v Litvě s účastí potápěčského týmu 22 Engineer Regiment britské armády, potápěčského týmu 33 EOD&S Regiment Royal Navy a personálu EOD ukrajinského námořnictva. Zprávy také popisují integraci ROV do prostředí výcviku EOD a protiminových opatření.','Vysoce hodnotný případ interoperability mezi pozemními ženisty, námořním EOD a partnerskou silou, při němž bezosádkové systémy vstupují do společného výcvikového pracovního postupu EOD.',null,null))evt1136.push('ENG-EVT-0016');
    if(putEvt('ENG-EVT-0017','Polské ministerstvo obrany oznámilo balíček přesahující 2 miliardy PLN pro ženijní a countermobility systémy v rámci SAFE. Oficiální vyjádření uvádí, že kontrahované systémy budou integrovány do struktur ženijního vojska a mají posílit rychlé a automatizované vytváření protivozidlových překážek a řízení bojiště.','Významný signál z východního křídla: Polsko industrializuje a automatizuje countermobility jako samostatnou linii rozvoje ženijních schopností.',null,null))evt1136.push('ENG-EVT-0017');
    if(putEvt('ENG-EVT-0018','Polské ministerstvo obrany oznámilo pořízení M1150 ABV a uvedlo, že zamýšleným příjemcem je 18. mechanizovaná divize. Oficiální polské vyjádření popisuje dvoučlennou osádku a úlohu při zprůchodňování tras přes překážky na bojišti pro pozemní síly.','Rozšiřuje polský výchozí stav východního křídla o těžkou chráněnou schopnost průlomu.',null,'VYSOKÁ pro polské oznámení o pořízení'))evt1136.push('ENG-EVT-0018');
    if(putEvt('ENG-EVT-0020','Aktuální stránka NATO CAP uvádí mezi kategoriemi nesmrtící vojenské pomoci Ukrajině vybavení pro EOD a odminování. Tatáž stránka uvádí mezi kategoriemi pomoci také prostředky proti dronům.','Potvrzuje, že vybavení pro EOD/odminování a counter-UAS zůstává explicitní linií pomoci NATO, ale veřejná stránka neposkytuje dostatek detailů na úrovni misí, aby bylo možné veškerou podporu odminování klasifikovat jako vojenské čištění, EOC nebo humanitární odminování.','Jde o souhrnnou stránku pomoci; neprokazuje počty, příjemce, data dodání, připravenost ani operační použití.','VYSOKÁ pro kategorii pomoci; NÍZKÁ pro detaily dílčích programů'))evt1136.push('ENG-EVT-0020');
    if(putEvt('ENG-EVT-0024','Bundeswehr uvádí, že Orange Road 2026 procvičovalo vojenské přesuny, řízení dopravy a civilně-vojenskou koordinaci v prostoru přibližně 6 000 km². V rámci scénáře u přechodu přes Rýn zničený most odklonil vojenskou kolonu na náhradní přechod; Feldjäger řídili přesun a 5. rota Pionierbrückenbataillon 130 zajišťovala provoz přívozu. Scénář zahrnoval také bezpečnostní incident u přechodu, takže do řešení vstoupila koordinace ženistů, vojenské policie a civilních vodních/policejních složek.','Událost je užitečným případem C2 při překonávání vodní překážky: přechod není řešen jen jako otázka ženijního prostředku, ale jako integrovaný problém trasy, řízení dopravy, bezpečnosti a civilně-vojenské koordinace.','Jde o uspořádání konkrétního cvičení a nelze je považovat za důkaz, že všechny přechody Bundeswehru nebo NATO přes vodní překážky používají totožnou architekturu C2.','VYSOKÁ pro fakta o cvičení; STŘEDNÍ pro širší doktrinální závěr'))evt1136.push('ENG-EVT-0024');
    window.__ENGINEER_PUBLIC_CZ_BATCH_1136__={processed_ids:evt1136,mapped_fields:evt1136.reduce((n,id)=>{const x=R.get(id);return n+(x?.fact_cs?1:0)+(x?.analysis_cs?1:0)+(x?.limit_cs?1:0)+(x?.confidence_cs?1:0)},0),english_preserved:true};

    const batch1735=[];
    const setBatch1735=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
    if(setBatch1735('ENG-SIG-0004',{
      fact_cs:'Rostec představil pásový dálkově ovládaný robot s vláknovým laserem, termokamerou a kamerou s vysokým rozlišením, bezdrátovým nebo optickým řízením a rychlostí až 25 km/h. Rostec uvádí, že systém je připraven k sériové výrobě.',
      analysis_cs:'Bezkontaktní neutralizace představuje významný směr výzkumu a vývoje, avšak vyspělost systému a jeho operační využitelnost zůstávají nejisté.',
      confidence_cs:'STŘEDNĚ NÍZKÁ'
    }))batch1735.push('ENG-SIG-0004');
    if(setBatch1735('ENG-SIG-0005',{
      fact_cs:'Oficiální zpráva PLA Daily přidává příklad 82. skupiny armád, který propojuje snímky získané bezpilotním prostředkem, ženijní průlomovou techniku a bezosádkové odminovací prostředky.',
      analysis_cs:'Dvě samostatné zprávy z výcviku ukazují institucionální technologický signál směřující k integraci osádkových a bezosádkových prostředků při průlomu, nikoli pouze k jednorázové demonstraci.',
      limit_cs:'Jde o stejný ekosystém oficiálních médií; nelze to považovat za nezávislé potvrzení operačního zavedení.',
      confidence_cs:'STŘEDNĚ VYSOKÁ pro signál trendu ve výcviku; NÍZKÁ AŽ STŘEDNÍ pro rozsah zavedení',
      stage_cs:'VOJENSKÝ VÝCVIK / EXPERIMENTOVÁNÍ'
    }))batch1735.push('ENG-SIG-0005');
    if(setBatch1735('ENG-SIG-0008',{
      fact_cs:'Program U.S. Army SBIR popisuje automatizovaný řetězec fotogrammetrie a 3D modelování určený k vytvoření autoritativní obrazové databáze munice pro výcvik AI/ML detekce a klasifikace; podpůrný automatizovaný skenovací přístup byl v roce 2024 uváděn na úrovni TRL 6.',
      limit_cs:'Tento zdroj nedokládá operační zavedení, autonomní rozhodovací pravomoc EOD ani výkonnost nasazeného systému.',
      confidence_cs:'VYSOKÁ pro cíl programu; STŘEDNÍ pro budoucí zavedení',
      stage_cs:'TÉMA VÝZKUMU A VÝVOJE – DIRECT TO PHASE II'
    }))batch1735.push('ENG-SIG-0008');
    if(setBatch1735('ENG-TECH-0001',{
      fact_cs:'Rheinmetall, DOK-ING a Pearson představily na Eurosatory 2026 systém MV-8 KOMODO UBS. Platforma má diesel-elektrický hybridní pohon o výkonu 350 kW, celkovou hmotnost až 15,5 t, užitečné zatížení 8,5 t a silniční rychlost až 55 km/h. Má otevřenou architekturu; plánována je autonomie a poloautonomie prostřednictvím PATH-A-Kit.',
      analysis_cs:'Jde o zřetelný evropský posun od specializovaných dálkově ovládaných odminovacích vozidel k modulárním bezosádkovým platformám bojového ženijního vojska integrovaným do manévrových uskupení.',
      confidence_cs:'VYSOKÁ pro údaje výrobce'
    }))batch1735.push('ENG-TECH-0001');
    if(setBatch1735('ENG-TECH-0002',{
      fact_cs:'Indické ministerstvo obrany uzavřelo se společnostmi BEML a Electro Pneumatics & Hydraulics smlouvy v hodnotě přibližně 975 crore INR na soupravy TRAWL. Prostředek vyvinula DRDO a je určen ke zvýšení schopnosti tanků vytvářet bezpečné průjezdy přes protitanková minová pole.',
      analysis_cs:'Indie investuje do domácí, na tanku nesené mechanizované schopnosti průlomu minovými poli, nikoli pouze do specializovaných průlomových vozidel.'
    }))batch1735.push('ENG-TECH-0002');
    if(setBatch1735('ENG-TECH-0003',{
      fact_cs:'Rostec/UVZ uvádí, že UBIM byl přijat do výzbroje ruských ženijních vojsk. Rostec uvádí podvozek odvozený od T-90M, motor o výkonu 1 130 hp, hmotnost až 55 t, rychlost 60 km/h, dojezd 500 km, nosnost ramene 7,5 t, hlavní naviják s tažnou silou 25 tf a osádku 2 + 3 ženisté.',
      analysis_cs:'Rusko směřuje ke sloučení odstraňování překážek, vyprošťování a úkolů souvisejících s minami do jednoho multifunkčního chráněného podvozku.',
      limit_cs:'Skutečný rozsah zavedení a bojová účinnost zůstávají neověřené.',
      confidence_cs:'STŘEDNÍ'
    }))batch1735.push('ENG-TECH-0003');
    if(setBatch1735('ENG-TECH-0004',{
      fact_cs:'Rostec uvádí, že byla dodána nová série IMR-3M vybavená komplexem elektronického boje a dodatečnou ochranou proti dronům. Podle Rostecu je IMR-3M ve válce aktivně používán.',
      analysis_cs:'Jde o silný indikátor, že hrozba UAS přímo vede k úpravám odolnosti ženijních vozidel.',
      confidence_cs:'STŘEDNÍ'
    }))batch1735.push('ENG-TECH-0004');
    if(setBatch1735('ENG-TECH-0005',{
      fact_cs:'Společný akviziční kontrakt Spojeného království a Německa přes OCCAR přesahuje 450 milionů eur. Základem programu je nejnovější generace M3 vycházející ze švédského M3S se zlepšeným rozhraním člověk–stroj, spolehlivostí, bezpečností a podporou. GDELS uvádí rychlost M3 až 80 km/h a schopnost vybudovat 100m most za méně než 10 minut.',
      analysis_cs:'Jde o významnou evropskou investici do rychlého a interoperabilního překonávání širokých vodních překážek těžkými silami, s vysokou relevancí pro posilování a manévr NATO.'
    }))batch1735.push('ENG-TECH-0005');
    if(setBatch1735('ENG-TECH-0006',{
      fact_cs:'JGSDF uvádí 07MSB jako nástupce samohybného mostu typu 81. Oficiální specifikace uvádějí přibližnou délku 11,0 m, šířku 3,0 m, výšku 3,7 m, hmotnost s nákladem 25 t, tříčlennou osádku a maximální rychlost 85 km/h.',
      analysis_cs:'Poskytuje referenční základ mimo NATO pro vysoce mobilní taktické mostní prostředky a je užitečný pro budoucí srovnávací karty techniky.'
    }))batch1735.push('ENG-TECH-0006');
    if(setBatch1735('ENG-TECH-0007',{
      fact_cs:'Oficiální terminologie PLA používá označení 综合扫雷车 a 履带式综合扫雷车. Cílené vyhledávání v oficiálních zdrojích nepotvrdilo spolehlivé označení GSL/Type.',
      analysis_cs:'Opakované veřejné použití ve dvou skupinách armád naznačuje, že nejde o jednorázový demonstrátor, ale běh B04 nedokládá rozsah zavedení v celých silách ani přesnou identitu varianty.',
      limit_cs:'Anglický popis může zahrnovat více než jedno vozidlo nebo variantu; vizuální a technická identifikace zůstává otevřená.',
      confidence_cs:'VYSOKÁ pro existenci zavedených a ve výcviku používaných vozidel; NÍZKÁ AŽ STŘEDNÍ pro přesnou identitu varianty'
    }))batch1735.push('ENG-TECH-0007');
    window.__ENGINEER_PUBLIC_CZ_BATCH_1735__={processed_ids:batch1735,mapped_fields:batch1735.reduce((n,id)=>{const x=R.get(id);return n+['fact_cs','analysis_cs','limit_cs','confidence_cs','stage_cs'].filter(k=>x?.[k]).length},0),english_preserved:true};
  }
})();