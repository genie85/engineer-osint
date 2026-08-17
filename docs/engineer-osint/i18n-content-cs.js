(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const L=new Map((D.leads?.leads||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id)||L.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs='ENGINEER_OSINT_TRANSLATION_LAYER';};
  const translateClaims=(id,texts)=>{const x=R.get(id)||L.get(id);if(!x||!Array.isArray(x.claims))return;for(let i=0;i<Math.min(texts.length,x.claims.length);i++)if(texts[i])x.claims[i].text_cs=texts[i];};

  put('ENG-TECH-0011',{title_cs:'SDZ — Système de dépollution de zone',summary_cs:'Francouzský SDZ je teleoperovaný dvourobotový ženijní systém pro čištění rozsáhlejších prostorů od nebezpečné munice a min podle operačního kontextu.'});
  put('ENG-TECH-0012',{title_cs:'SYFRALL — modulární systém pro překonávání vodních překážek',summary_cs:'Francouzský modulární plovoucí mostní systém určený pro wet-gap crossing; DGA objednala osm systémů představujících přibližně 300 metrů přemostění.'});
  put('ENG-TECH-0014',{title_cs:'BLT Arjun — mostní tank',summary_cs:'Těžký mostní tank na podvozku Arjun s mostní nástavbou MLC-70.'});
  put('ENG-TECH-0015',{title_cs:'Short Span Bridge 10 m',summary_cs:'Mechanicky pokládaný mostní systém MLC-70 pro krátké překážky do 10 metrů.'});
  put('ENG-SIG-0007',{title_cs:'Indie — autonomie a robotika pro bojové ženijní zabezpečení',summary_cs:'Vývojové směry DRDO zahrnují autonomní UGV, computer vision a human–robot teaming; jde o R&D, nikoli důkaz operačního zavedení.'});
  put('ENG-UNIT-0012',{title_cs:'Izraelský Combat Engineering Corps / Yahalom',summary_cs:'IDF veřejně popisuje ženijní sbor a jeho zvláštní jednotku Yahalom pro specializované ženijní, minové, muniční a podzemní úkoly.'});
  put('ENG-TECH-0013',{title_cs:'Namer Engineering',summary_cs:'Ženijní větev silně chráněné rodiny Namer; detailní konfigurace vyžadují další primární ověření.'});
  put('ENG-EVT-0021',{title_cs:'240m plovoucí most přes Eufrat v Dajr az-Zauru',summary_cs:'Türkiye MSB 9. července 2026 uvedlo dokončení 240m plovoucího mostu ženijní brigádou 2. armády.'});
  put('ENG-UNIT-0013',{title_cs:'Ženijní brigáda 2. armády Türkiye',summary_cs:'Veřejně doložená turecká ženijní brigáda spojená s přemostěním Eufratu v roce 2026.'});
  put('LEAD-001',{title_cs:'EOC standardizace — identita annexu / study draftu',summary_cs:'Veřejné materiály NATO EOD WG potvrzují standardizační práci na EOC, ale přesné označení annexu/study draftu zůstává nezjištěné.'});

  // Batch 2026-08-17-2232: complete high-visibility UNIT translations without changing factual fields.
  put('ENG-UNIT-0012',{
    title_cs:'Izraelský Combat Engineering Corps / Yahalom',
    summary_cs:'IDF veřejně popisuje Combat Engineering Corps jako sbor odpovědný mimo jiné za odstraňování minových polí, budování mostů a opevnění. Yahalom je zvláštní jednotka sboru pro specializované ženijní úkoly, nebezpečnou munici, komplexní minová pole a podzemní prostředí; IDF výslovně uvádí také používání robotů a dálkově ovládaných zařízení.',
    intelligence_gaps_cs:['Aktuální vztahy velení praporů/brigád Combat Engineering Corps a úplné TO&E k roku 2026','Současné rozdělení techniky podle praporů a rot','Přesný one-to-one převod izraelských odpovědností za nebezpečnou munici a minová pole do terminologie NATO EOD/EOC/EOR','Aktuální personální počty a údaje o připravenosti']
  });
  translateClaims('ENG-UNIT-0012',[
    'IDF uvádí mezi odpovědnostmi Combat Engineering Corps odstraňování minových polí, výstavbu mostů a budování opevnění.',
    'IDF popisuje Yahalom jako zvláštní bojovou jednotku Combat Engineering Corps se specializovanými ženijními úkoly, úkoly souvisejícími s nebezpečnou municí, komplexními minovými poli a podzemním prostředím.',
    'IDF uvádí, že Yahalom v některých případech používá roboty a dálkově ovládaná zařízení ke snížení rizika pro personál.',
    'Tyto izraelské veřejné popisy nelze automaticky považovat za přesné ekvivalenty kategorií NATO EOD/EOC/EOR.'
  ]);

  put('ENG-UNIT-0013',{
    title_cs:'Ženijní brigáda 2. armády Türkiye',
    summary_cs:'2nd Army Engineer Brigade je veřejně doložena jako turecká ženijní brigáda schopná realizovat rozsáhlejší úkoly překonávání vodních překážek mimo území Türkiye. Veřejný záznam z července 2026 ji přímo spojuje s dokončením 240m plovoucího mostu přes Eufrat v Dajr az-Zauru.',
    intelligence_gaps_cs:['Mírová podřízenost a detailní struktura brigády','Složení praporů a rot','Organické mostní systémy a jejich počty','Další současná operační nasazení a údaje o připravenosti']
  });
  translateClaims('ENG-UNIT-0013',[
    'Turecké ministerstvo národní obrany veřejně jmenuje 2nd Army Engineer Brigade v souvislosti s 240m plovoucím mostem přes Eufrat v Dajr az-Zauru.',
    'Tato událost představuje veřejně doložený datapoint schopnosti překonávání vodních překážek na úrovni brigády, nikoli úplné TO&E brigády.'
  ]);

  // Batch 2026-08-17-2334: complete next TECH-priority translation batch.
  put('ENG-TECH-0011',{
    title_cs:'SDZ — Système de dépollution de zone',
    summary_cs:'Francouzský SDZ je teleoperovaný systém pro čištění rozsáhlejších prostorů od nebezpečné munice a min, vyvinutý společností CEFA jako náhrada staršího MADEM. Veřejný armádní zdroj jej popisuje jako dvourobotový systém s důrazem na omezení expozice obsluhy.',
    intelligence_gaps_cs:['Přesný aktuální stav flotily po zveřejnění údajů 21. dubna 2026','Úplná veřejná technická specifikace obou robotů a výměnných pracovních nástrojů','Přesné doktrinální přiřazení francouzské terminologie dépollution k NATO kategoriím EOC a route/area clearance']
  });
  translateClaims('ENG-TECH-0011',[
    'SDZ je teleoperovaný systém tvořený dvěma roboty.',
    'TerreMag popsal systém jako náhradu MADEM a k datu zveřejnění uvedl šest systémů ve službě.'
  ]);

  put('ENG-TECH-0012',{
    title_cs:'SYFRALL — modulární systém pro překonávání vodních překážek',
    summary_cs:'SYFRALL je francouzský modulární systém pro překonávání vodních překážek určený k obnově schopností wet-gap crossing. DGA objednala osm systémů, které mají dohromady představovat přibližně 300 metrů lineárního přemostění.',
    intelligence_gaps_cs:['Harmonogram dodávek a přidělení jednotlivým jednotkám','Aktuální stav kvalifikace nad rámec veřejně oznámených programových milníků','Přesné vojenské zatěžovací třídy a výkonnost jednotlivých konfigurací v autoritativních veřejně dostupných podkladech']
  });
  translateClaims('ENG-TECH-0012',[
    'DGA objednala SYFRALL 30. prosince 2025 od konsorcia CNIM SI, CEFA a SOFRAME.',
    'Objednávka zahrnuje osm systémů představujících přibližně 300 lineárních metrů a určených pro ženijní pluky francouzské armády.'
  ]);

  put('ENG-TECH-0014',{
    title_cs:'BLT Arjun — mostní tank',
    summary_cs:'BLT Arjun je těžký mostní tank na podvozku MBT Arjun. DRDO jej popisuje jako útočný mostní systém se způsobem pokládání slide-launch, mostní nástavbou MLC-70 a dvoučlennou osádkou.',
    intelligence_gaps_cs:['Aktuální počet zavedených kusů','Rozdělení mezi jednotky','Operační dostupnost a použití při cvičeních po posledním veřejném baseline','Současná omezení přepravy a vyprošťování']
  });
  translateClaims('ENG-TECH-0014',[
    'BLT Arjun používá podvozek Arjun a mostní nástavbu MLC-70.',
    'DRDO uvádí variantu 24m ocelového a 26m mostu z hliníkové slitiny a dvoučlennou osádku.',
    'DRDO uvádí dobu položení nebo stažení mostu 10 minut.'
  ]);

  put('ENG-TECH-0015',{
    title_cs:'Short Span Bridge 10 m',
    summary_cs:'Short Span Bridge 10 m je indický mechanicky pokládaný mostní systém MLC-70 určený pro menší mezery a kanály do 10 metrů. DRDO zdůrazňuje mobilní pokládací prostředek a konstrukci navrženou pro rychlou obsluhu s minimálním počtem personálu.',
    intelligence_gaps_cs:['Aktuální počet kusů ve výzbroji','Přesný podvozek a konfigurace pokládacího prostředku u současných zavedených sérií','Rozdělení mezi jednotky a doklady z cvičení','Doba rozvinutí v polních podmínkách podle nezávislých nebo armádních zdrojů']
  });
  translateClaims('ENG-TECH-0015',[
    'Systém je mechanicky pokládaný, má klasifikaci MLC-70 a je určen pro mezery a kanály do 10 metrů.',
    'DRDO uvádí vysoce mobilní pokládací platformu, dvojitou podpěru typu A a koncepci s minimálním počtem obsluhy.'
  ]);

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-17-2232',processed_ids:['ENG-UNIT-0012','ENG-UNIT-0013'],fully_translated:2,partially_translated:0,review_needed:0,scope:'UNIT priority; public entity fields and claim text',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-17-2334',processed_ids:['ENG-TECH-0011','ENG-TECH-0012','ENG-TECH-0014','ENG-TECH-0015'],fully_translated:4,partially_translated:0,review_needed:0,scope:'TECH priority; title, summary, intelligence gaps and claim text',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS__={translated_entities:[...R.values()].filter(x=>x.translation_status_cs).map(x=>x.id),version:'1.2',last_batch:'2026-08-17-2334'};
})();