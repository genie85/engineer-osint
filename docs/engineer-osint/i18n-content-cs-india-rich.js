(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const records=D.records?.records||[];
  const rm=new Map(records.map(x=>[x.id,x]));
  const put=(id,p)=>{const x=rm.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs='ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};

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
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1313-india-rich',processed_ids:['ENG-TECH-0014','ENG-TECH-0015','ENG-SIG-0007'],fully_translated:3,partially_translated:0,review_needed:0,scope:'Translate user-visible India rich technical/equipment/operational fields while preserving original English fields, R&D maturity and evidentiary limitations.',english_preserved:true});
  window.__ENGINEER_I18N_INDIA_RICH_CS__={version:'1.0',last_batch:'2026-08-18-1313-india-rich'};
})();
