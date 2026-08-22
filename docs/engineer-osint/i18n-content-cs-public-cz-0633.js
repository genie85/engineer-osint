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
    VERIFIED_DIRECT_DEEP_LINK_TITLE_PUBLISHER_DATE_BODY_MATCH:'OVĚŘENO PŘÍMÝM ODKAZEM — SOUHLASÍ NÁZEV, VYDAVATEL, DATUM A OBSAH'
  });
  window.__ENGINEER_PUBLIC_CZ_ENUM_BATCH_0633__={
    processed_ids:['ENG-UNIT-0035','ENG-SRC-0473','ENG-REL-0013','ENG-EVID-0180','ENG-SIG-0026','ENG-SRC-0474','ENG-SRC-0475','ENG-EVID-0181'],
    mapped_fields:15,
    english_preserved:true
  };

  const D=window.__ENGINEER_DATA__;
  if(D?.records?.records){
    const R=new Map(D.records.records.map(x=>[x.id,x]));
    const put=(id,text)=>{const x=R.get(id);if(!x)return false;if(!x.fact_cs)x.fact_cs=text;if(!x.analysis_cs)x.analysis_cs=text;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
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
    if(put('ENG-DOC-0055','Veřejná 12stránková studie z roku 2024, zpřístupněná přes NATO Lessons Learned Portal, systematizuje úkoly ženijní podpory na základě ukrajinské zkušenosti z války a práce s NATO publikacemi. Navrhuje čtyři skupiny: podpora mobility vlastních vojsk; omezení mobility protivníka; zvýšení přežití a bezpečnosti vojsk a objektů; všeobecná ženijní podpora. Mezi konkrétní úkoly řadí ženijní průzkum, přípravu a údržbu tras, přechody a průchody přes překážky, průchody v zátarasech a destrukcích, odminování, heliporty, zřizování zátarasů, destrukce/zesilování překážek, fortifikace, maskování, polní zásobování vodou a ženijně-technickou podporu. Studie zároveň odkazuje na ukrajinské řídicí dokumenty z let 2019–2021 a na NATO MILENG publikace.'))done.push('ENG-DOC-0055');
    window.__ENGINEER_PUBLIC_CZ_BATCH_0737__={processed_ids:done,mapped_fields:done.length*2,english_preserved:true};
  }
})();
