(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id); if(!x)return; Object.assign(x,p); x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION'; x.translation_provenance_cs=p.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';};

  put('ENG-UNIT-0005',{title_cs:'8 Engineer Brigade — aktuální britský baseline víceoborové ženijní a EOD&S struktury'});
  put('ENG-UNIT-0006',{title_cs:'Panzerpionierbataillon 1 — základní profil'});
  put('ENG-UNIT-0007',{title_cs:'Francouzská Brigade du génie — základní profil obnovené brigády'});
  put('ENG-UNIT-0008',{title_cs:'19e régiment du génie — širokospektrální ženijní/EOD schopnosti a modernizace pomocí dronů'});
  put('ENG-UNIT-0009',{title_cs:'Ženijní a chemická brigáda skupinové armády PLAA — historické doklady reformy'});
  put('ENG-UNIT-0010',{title_cs:'Ženijní prvek vševojskové brigády PLAA — doklad ženijní čety vševojskového praporu'});
  put('ENG-UNIT-0022',{title_cs:'Patrol Saperski nr 17 / 1 Warszawska Brygada Pancerna — sapérská hlídka č. 17'});
  put('ENG-UNIT-0029',{title_cs:'Deutsch/Britisches Pionierbrückenbataillon 130 — německo-britský ženijní mostní prapor'});
  put('ENG-UNIT-FR-31RG',{title_cs:'31e Régiment du génie — 31. ženijní pluk'});

  put('ENG-TECH-0001',{title_cs:'MV-8 KOMODO — bezosádkový systém pro breaching'});
  put('ENG-TECH-0005',{title_cs:'Britsko-německý program Wide Wet Gap Crossing založený na nejnovější generaci M3'});

  put('ENG-UNIT-0011',{
    title_cs:'19e Régiment du génie — 19. ženijní pluk',
    summary_cs:'Francouzský 19. ženijní pluk je veřejně popisován jako mnohostranný ženijní útvar s úkoly v oblasti bojové ženijní podpory, infrastruktury, překonávání překážek, vyhledávání, odminování a potápěčských činností. Veřejný snapshot z roku 2026 jej zároveň spojuje s prvním zaváděním systému SDZ.',
    why_it_matters_cs:'Jde o užitečný veřejný organizační bod pro sledování toho, jak Francie soustřeďuje klasickou ženijní podporu, specializované vyhledávací/odminovací úkoly a nové teleoperované prostředky v jednom plukovním rámci.',
    staff_relevance_cs:'Relevantní pro srovnání národních modelů plukovní ženijní podpory, přidělování specializovaných schopností a vztahu mezi manévrovou podporou, search/demining a novými teleoperovanými systémy.',
    intelligence_gaps_cs:['Úplné aktuální TO&E pluku','Přesné rozdělení SDZ a dalších specializovaných systémů mezi podřízené roty','Současný C2 model pro EOD/EOC/search úkoly','Přesný vztah francouzské terminologie dépollution/déminage k NATO EOD/EOC/EOR kategoriím']
  });

  put('ENG-UNIT-0019',{
    title_cs:'Bundeswehr Kampfmittelabwehrschule — škola Kampfmittelabwehr',
    summary_cs:'Bundeswehr veřejně označuje Kampfmittelabwehrschule ve Stetten am kalten Markt za ústřední výcvikové pracoviště pro Kampfmittelabwehr v rámci Pionierschule. Veřejné materiály spojují tuto oblast s průzkumem, identifikací a zneškodňováním výbušných hrozeb a s používáním specializovaných detekčních, rentgenových a ochranných prostředků.',
    why_it_matters_cs:'Německý model ukazuje centralizované institucionální ukotvení Kampfmittelabwehr uvnitř ženijního školského systému. Je proto vhodný pro srovnání s armádami, které EOD/EOC schopnosti organizují více decentralizovaně u operačních útvarů.',
    staff_relevance_cs:'Relevantní pro návrh výcvikových a certifikačních modelů, standardizaci odborné přípravy a porovnání institucionální vazby mezi ženijním vojskem a činnostmi v oblasti výbušných hrozeb.',
    intelligence_gaps_cs:['Aktuální úplná struktura školy a specializovaných kurzů','Přesná kvalifikační návaznost na NATO EOD/EOC/EOR','Operační vazba školy na nasazené EOD/Kampfmittelabwehr prvky','Aktuální počty specialistů a kapacita výcviku'],
    terminology_note_cs:'Německý pojem Kampfmittelabwehr je zachován zdrojově věrně a není automaticky převáděn one-to-one na EOD, EOC nebo EOR.'
  });

  put('ENG-UNIT-0020',{
    title_cs:'Centralny Ośrodek Koordynacji Rozminowania — centrální koordinační pracoviště rozminování',
    summary_cs:'Polský veřejný baseline popisuje centralizovaný koordinační prvek pro rozminování a činnosti související s výbušnými hrozbami. Záznam je důležitý především jako C2 a koordinační datapoint, nikoli jako úplný model všech polských EOD/clearance jednotek.',
    why_it_matters_cs:'Polský model přidává do srovnání centralizovanou koordinační vrstvu. To umožňuje sledovat rozdíl mezi národními systémy, kde jsou clearance/EOD schopnosti organizovány převážně v operačních jednotkách, a systémy s výraznějším centrálním koordinačním prvkem.',
    staff_relevance_cs:'Relevantní pro srovnání C2, taskingu, evidence hrozeb, koordinace rozminování a vztahu mezi ženijními, EOD a dalšími specializovanými prvky.',
    intelligence_gaps_cs:['Přesné současné pravomoci centra v míru a za operace','Úplná vazba na polské ženijní a EOD jednotky','Rozhraní se systémem civilního odstraňování munice','Přesný NATO EOD/EOC/EOR crosswalk a certifikační model']
  });

  put('ENG-TECH-0011',{
    technical_profile_cs:{manufacturer:'CEFA',remote_control:'Teleoperované ovládání',configuration:'Dva teleoperované roboty na podvozcích',weight:'TerreMag uvádí 10 t pro systém/vozidlo; údaj není interpretován jako hmotnost každého robota.'},
    engineering_equipment_cs:'Dva teleoperované roboty pro úkoly plošného čištění prostoru / dépollution.',
    operational_evidence_cs:'Veřejný materiál francouzské armády uváděl k 21. dubnu 2026 šest systémů ve službě, mimo jiné u École du génie a podpůrných rot 19e a 31e Régiment du génie.'
  });

  put('ENG-TECH-0012',{
    technical_profile_cs:'Modulární plovoucí mostní systém přepravovaný na nákladních vozidlech, konfigurovatelný jako přívoz nebo most sestavováním plovoucích modulů a nájezdových ramp.',
    operational_evidence_cs:'DGA zadala objednávku 30. prosince 2025; veřejná zpráva DGA uvádí osm systémů určených pro ženijní pluky francouzské armády. Jde o důkaz akvizičního programu, nikoli o důkaz operačního zavedení.'
  });

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1106',processed_ids:['ENG-TECH-0011','ENG-TECH-0012'],fully_translated:2,partially_translated:0,review_needed:0,scope:'France TECH continuation; translate rich technical/operational presentation fields while preserving English source fields and evidentiary meaning',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1316-mapping-quarantine',processed_ids:['ENG-UNIT-0011'],fully_translated:0,partially_translated:0,review_needed:1,scope:'Historical quarantine pending mapping resolution.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1504-canonical-title-preservation',processed_ids:['ENG-UNIT-0019','ENG-UNIT-0020'],fully_translated:0,partially_translated:0,review_needed:0,scope:'Align overlay title_cs exactly with B26 TRANSLATION_CANONICALIZATION while retaining existing translated presentation fields.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1530-mapping-resolution',processed_ids:['ENG-UNIT-0011'],fully_translated:1,partially_translated:0,review_needed:0,scope:'Resolve historical ID mapping from materialized canonical runtime: ENG-UNIT-0011 title is 19e Régiment du génie. Restore matching Czech presentation overlay; English fields unchanged.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1610-unit-title-backlog',processed_ids:['ENG-UNIT-0005','ENG-UNIT-0006','ENG-UNIT-0007','ENG-UNIT-0008','ENG-UNIT-0009','ENG-UNIT-0010'],fully_translated:6,partially_translated:0,review_needed:0,scope:'Translate the only missing public presentation field (title_cs) for six highest-priority ENG-UNIT backlog entities; preserve canonical English/base fields and evidentiary classifications.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1618-unit-title-backlog',processed_ids:['ENG-UNIT-0021','ENG-UNIT-0022','ENG-UNIT-0029','ENG-UNIT-FR-31RG'],fully_translated:3,partially_translated:0,review_needed:1,scope:'Translate sole missing title_cs for three unambiguous remaining European ENG-UNIT records. ENG-UNIT-0021 retains TRANSLATION_REVIEW_NEEDED because canonical runtime title is only the record ID and assigning a patrol identity from surrounding evidence would exceed presentation translation.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1802-tech-backlog',processed_ids:['ENG-TECH-0001','ENG-TECH-0005','ENG-TECH-0011'],fully_translated:3,partially_translated:0,review_needed:0,scope:'Translate sole missing title_cs for two Germany/UK-linked ENG-TECH records and complete technical_profile_cs for SDZ from the exact canonical runtime object; English/base fields and claim classifications unchanged.',english_preserved:true});

  window.__ENGINEER_I18N_CONTENT_CS_FGP__={translated_entities:['ENG-UNIT-0005','ENG-UNIT-0006','ENG-UNIT-0007','ENG-UNIT-0008','ENG-UNIT-0009','ENG-UNIT-0010','ENG-UNIT-0011','ENG-UNIT-0019','ENG-UNIT-0020','ENG-UNIT-0022','ENG-UNIT-0029','ENG-UNIT-FR-31RG','ENG-TECH-0001','ENG-TECH-0005','ENG-TECH-0011','ENG-TECH-0012'].filter(id=>R.has(id)),review_needed_entities:['ENG-UNIT-0021'],resolved_mapping_entities:['ENG-UNIT-0011'],version:'1.7',last_batch:'2026-08-18-1802-tech-backlog'};
})();
