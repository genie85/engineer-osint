(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const records=D.records?.records||[];
  const rm=new Map(records.map(x=>[x.id,x]));
  const put=(id,p)=>{const x=rm.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs='ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

  put('ENG-UNIT-0012',{
    mission_cs:'Bojové ženijní zabezpečení zahrnující mimo jiné odstraňování minových polí, budování mostů, opevňování a specializované ženijní úkoly.',
    organization_profile_cs:'Veřejné materiály IDF označují Yahalom za zvláštní jednotku Combat Engineering Corps; veřejná stránka Yahalom uvádí, že jednotce velí důstojník v hodnosti plukovníka.',
    equipment_cs:'IDF ve veřejných materiálech výslovně zmiňuje při úkolech Yahalom roboty a dálkově ovládaná zařízení. Úplné současné stavy techniky z těchto stránek nelze určit.',
    operational_evidence_cs:'Veřejné materiály IDF popisují Yahalom jako jednotku poskytující specializovanou ženijní podporu při řešení nebezpečné munice, komplexních minových polí, pozemních a vodních překážek a podzemních hrozeb. Tyto stránky dokládají rozsah úkolů, nikoli úplné současné TO&E.'
  });

  put('ENG-TECH-0013',{
    technical_profile_cs:'Těžká pásová rodina obrněných transportérů vyvinutá v rámci izraelského programu obrněných vozidel Merkava/Namer. Aktuální oficiální materiály ředitelství potvrzují Namer jako jednu z hlavních pokročilých rodin obrněných platforem.',
    operational_evidence_cs:'Izraelské ministerstvo obrany ve zprávě o Israel Defense Prize 2024 veřejně uvedlo, že Namer APC prokázal význam během války Swords of Iron. To podporuje závěr o operačním použití rodiny Namer, samo o sobě však neidentifikuje specializovanou ženijní konfiguraci.'
  });

  put('ENG-EVT-0021',{
    capability_demonstrated_cs:'Překonávání vodní překážky / výstavba plovoucího mostu o veřejně uvedené délce 240 m.',
    operational_evidence_cs:'Turecké ministerstvo obrany přímo dokládá konkrétní ženijní brigádu, operační prostor, řeku, typ přemostění (plovoucí most) a uvedenou délku.',
    what_it_does_not_prove_cs:'Veřejné sdělení neuvádí model mostního systému, počet modulů, MLC, dobu výstavby, dopravní kapacitu, přívozovou konfiguraci ani zamýšlenou dobu používání přechodu.'
  });

  put('ENG-UNIT-0013',{
    mission_cs:'Veřejně doložené ženijní zabezpečení zahrnující překonávání vodních překážek a výstavbu plovoucích mostů.',
    operational_evidence_cs:'Turecké ministerstvo obrany přímo připisuje ženijní brigádě 2. armády vybudování 240m plovoucího mostu přes Eufrat v Dajr az-Zauru.'
  });

  put('ENG-TECH-0022',{title_cs:'KUNDUZ / Armoured Amphibious Combat Earthmover (AACE) — obrněný obojživelný ženijní zemní stroj'});

  put('ENG-TECH-0014',{
    engineering_equipment_cs:'Jednopolový mostní komplet; 24m ocelový nebo 26m most z hliníkové slitiny; samostatná pohonná jednotka pro pokládání a stažení mostu.',
    technical_profile_cs:'Mostní tank na podvozku Arjun s mostní nástavbou MLC-70, mechanismem pokládání typu slide-launch a veřejně uváděnou dobou položení/stažení 10 minut.',
    operational_evidence_cs:'Aktuální produktová stránka DRDO potvrzuje konstrukční a technický baseline systému, sama však neprokazuje současný počet kusů v Indian Army ani jejich rozdělení mezi jednotky.'
  });

  put('ENG-TECH-0015',{
    technical_profile_cs:'Mechanicky pokládaný most pro krátké mezery s klasifikací MLC-70, určený pro překážky a kanály do 10 m; používá vysoce mobilní pokládací platformu, dvojitou podpěru typu A pro stabilitu a beta světlo pro noční rozvinutí.',
    operational_evidence_cs:'Produktová stránka DRDO dokládá konstrukční baseline systému; současné počty ve výzbroji a jednotkové rozdělení na ní uvedeny nejsou.'
  });

  put('ENG-SIG-0007',{
    technical_profile_cs:'Technologický výhled DRDO zahrnuje autonomní vnímání a navigaci, kolaborativní manipulaci, human–robot teaming, robotické manipulátory a autonomní úkoly podpory bojového ženijního zabezpečení.',
    operational_evidence_cs:'Citované foresight stránky nedokládají akvizici Indian Army ani operační zavedení; představují důkaz výzkumných, vývojových a technologických úkolů.'
  });

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1313-israel-turkiye-rich',processed_ids:['ENG-UNIT-0012','ENG-TECH-0013','ENG-EVT-0021','ENG-UNIT-0013'],fully_translated:4,partially_translated:0,review_needed:0,scope:'Translate user-visible Israel/Türkiye rich presentation fields while preserving original English fields, source caveats and evidentiary strength.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1313-india-rich',processed_ids:['ENG-TECH-0014','ENG-TECH-0015','ENG-SIG-0007'],fully_translated:3,partially_translated:0,review_needed:0,scope:'Translate user-visible India rich technical/equipment/operational fields while preserving original English fields, R&D maturity and evidentiary limitations.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1848-tech-backlog',processed_ids:['ENG-TECH-0022'],fully_translated:1,partially_translated:0,review_needed:0,scope:'TECH priority; translate the sole missing title_cs for KUNDUZ/AACE while preserving the manufacturer designation, English/base fields and evidentiary caveats.',english_preserved:true});
  window.__ENGINEER_I18N_ISRAEL_TURKIYE_RICH_CS__={version:'1.2',last_batch:'2026-08-18-1848-tech-backlog'};
})();
