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

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1313-israel-turkiye-rich',processed_ids:['ENG-UNIT-0012','ENG-TECH-0013','ENG-EVT-0021','ENG-UNIT-0013'],fully_translated:4,partially_translated:0,review_needed:0,scope:'Translate user-visible Israel/Türkiye rich presentation fields while preserving original English fields, source caveats and evidentiary strength.',english_preserved:true});
  window.__ENGINEER_I18N_ISRAEL_TURKIYE_RICH_CS__={version:'1.0',last_batch:'2026-08-18-1313-israel-turkiye-rich'};
})();
