(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=p.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';};
  const translateClaims=(id,texts)=>{const x=R.get(id);if(!x||!Array.isArray(x.claims))return;for(let i=0;i<Math.min(texts.length,x.claims.length);i++)if(texts[i])x.claims[i].text_cs=texts[i];};
  put('ENG-SIG-0003',{title_cs:'U.S. Army Engineer Autonomous Breaching Capability — výběr čtyř dodavatelů'});
  put('ENG-SIG-0008',{title_cs:'EODVOID — datová pipeline AI/ML pro vizuální identifikaci munice'});
  put('ENG-SIG-0006',{
    title_cs:'USA — experimentální doprava ženijního prostředku pro breaching pomocí UAS',
    summary_cs:'U.S. Army a Oregon Army National Guard veřejně doložily červnový proof-of-concept, při němž Bravo Company, 741st Brigade Engineer Battalion použila těžší bezpilotní systém Mule 28 k dopravě živého Bangalore prostředku proti překážce z koncertiny na Orchard Combat Training Center. Jde o jednotkový experiment a military testing, nikoli důkaz plošného zavedení nebo standardizovaného Army TTP.',
    technical_profile_cs:'Doprava ženijního prostředku pro breaching pomocí bezpilotního letounu s vyšší nosností. Armádní článek identifikuje použitý prostředek jako Lorica Technologies Mule 28 a ostrý prostředek jako Bangalore torpedo M1A3.',
    testing_evidence_cs:'Dne 22. června 2026 provedla Bravo Company, 741st Brigade Engineer Battalion, 41st Infantry Brigade Combat Team na Orchard Combat Training Center inertní a ostré proof-of-concept iterace. Armádní článek uvádí, že při ostré iteraci byl Bangalore dopraven k překážce z koncertiny a odpálen, čímž vytvořil průchod.',
    operational_evidence_cs:'Pouze MILITARY TESTING. Zdroj popisuje proof-of-concept během výročního výcviku a plánovaný battalion white paper pro ženijní komunitu; nedokládá operační nasazení, status programu zavedeného do výzbroje ani plošné přijetí TTP v U.S. Army.',
    why_it_matters_cs:'Experiment ukazuje praktické propojení UAS s klasickým ženijním účinkem při bojovém překonávání překážek s cílem omezit expozici personálu. Současně jde o konkrétní příklad, kdy americká ženijní jednotka uvádí inspiraci zkušenostmi z Ukrajiny.',
    staff_relevance_cs:'Relevantní pro plánování snižování rizika při překonávání překážek, integraci UAS do ženijních úkolů a experimentování v podmínkách elektronického boje. Při štábním použití je nutné oddělit místní proof-of-concept od schválené Army schopnosti nebo doktríny.',
    training_relevance_cs:'Vhodné jako Lessons Learned případ pro postupné experimentální ověřování, integraci UAS do ženijních úkolů a práci s failure modes; nejde o náhradu schválených postupů pro výbušniny ani UAS.',
    intelligence_gaps_cs:['Zda byl zveřejněn nebo formálně převzat avizovaný battalion white paper','Výsledky navazujících demonstrací a zkoušek','Zda koncept převzala některá Army capability-development nebo acquisition organizace','Aktuální stav prototypů Mule 28 po červnu 2026','Případná změna schváleného TTP nebo doktríny mimo původní prapor']
  });
  translateClaims('ENG-SIG-0006',[
    'Bravo Company, 741st Brigade Engineer Battalion provedla 22. června 2026 na Orchard Combat Training Center proof-of-concept překonání drátěné překážky pomocí prostředku pro breaching dopraveného dronem.',
    'Článek U.S. Army identifikuje použitý UAS jako Lorica Technologies Mule 28 a ostrý prostředek pro breaching jako Bangalore torpedo M1A3.',
    'Při ostré iteraci byl Bangalore dopraven k překážce z koncertiny, odpálen a vytvořil průchod.',
    'Událost je důkazem jednotkového military testing, nikoli plošného zavedení v U.S. Army ani standardizovaného TTP.',
    'Článek U.S. Army uvádí, že jedním ze zdrojů inspirace pro koncept byla pozorování z Ukrajiny.'
  ]);

  put('ENG-UNIT-0014',{
    title_cs:'ROK Army 1115 Engineer Group — veřejný výcvikový baseline',
    summary_cs:'Jihokorejské ministerstvo obrany veřejně uvádí Army 1115 Engineer Group jako jedno z míst konání programu UN Triangular Partnership. Šestitýdenní běh v roce 2026 probíhal od 4. května do 12. června a rozšířil výuku z obsluhy ženijní techniky také o identifikaci nebezpečných výbušných předmětů a řízení hrozeb IED.',
    mission_cs:'Veřejně doložená role hostitelského pracoviště pro mnohonárodní ženijní výcvik zaměřený na mírové operace OSN; citovaná zpráva nedefinuje úplný operační úkol jednotky ani její válečné TO&E.',
    organization_profile_cs:'Běh programu UN TPP v roce 2026 využil 18 instruktorů z Korejské republiky, Austrálie a Japonska a 72 frekventantů ze 13 zemí. Výcvik probíhal u Army 1115 Engineer Group a Medical School.',
    training_cs:'Osnova obsahovala čtyři oblasti: obsluhu ženijní techniky, identifikaci nebezpečných výbušných předmětů, řízení hrozeb IED a polní zdravotnickou přípravu.',
    operational_evidence_cs:'TRAINING_EVIDENCE. Zdroj dokládá využití 1115 Engineer Group jako hostitelského pracoviště pro mnohonárodní ženijní výcvik. Nedokládá ekvivalenci certifikace EOD/EOC, aktuální bojovou připravenost, velikost jednotky ani úplné stavy techniky.',
    why_it_matters_cs:'Záznam poskytuje aktuální organizační kotvu pro jihokorejský mezinárodní ženijní výcvik a ukazuje propojení výuky ženijní techniky s problematikou výbušných hrozeb a IED v rámci přípravy pro mírové operace OSN.',
    staff_relevance_cs:'Relevantní pro návrh multinational training, peacekeeping engineer capacity building a rozhraní ženijního, explosive-hazard a zdravotnického výcviku. Bez dalších podkladů z něj nelze odvozovat ekvivalenci s NATO EOD/EOC kvalifikacemi.',
    training_relevance_cs:'Program 2026 ukazuje širší balík přípravy než samotnou obsluhu ženijní techniky a je vhodný pro srovnání modelů mezinárodního budování ženijních schopností.',
    intelligence_gaps_cs:['Úplný mírový a válečný úkol 1115 Engineer Group','Aktuální struktura praporů/rot a personální síla','Organická technika a stav připravenosti','Přesné kvalifikační standardy modulů pro výbušné hrozby a IED','Další národní nebo mezinárodní kurzy pořádané jednotkou mimo UN TPP']
  });
  translateClaims('ENG-UNIT-0014',[
    'Výcvik ženijního a zdravotnického programu UN Triangular Partnership v první polovině roku 2026 probíhal od 4. května do 12. června u Army 1115 Engineer Group a Medical School.',
    'Běhu v roce 2026 se účastnilo 18 instruktorů z Korejské republiky, Austrálie a Japonska a 72 frekventantů ze 13 zemí.',
    'K výcviku obsluhy ženijní techniky byly v osnově doplněny identifikace nebezpečných výbušných předmětů, řízení hrozeb IED a polní zdravotnická příprava.',
    'Veřejná zpráva nedokládá ekvivalenci kvalifikací NATO EOD/EOC ani úplné operační TO&E jednotky.'
  ]);

  D.translation_audit_cs=D.translation_audit_cs||{batches:[]};
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1316-mapping-quarantine',processed_ids:['ENG-UNIT-0014'],fully_translated:0,partially_translated:0,review_needed:1,scope:'Historical quarantine pending mapping resolution.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1530-mapping-resolution',processed_ids:['ENG-UNIT-0014'],fully_translated:1,partially_translated:0,review_needed:0,scope:'Resolve historical ID mapping from materialized canonical runtime: ENG-UNIT-0014 title is ROK Army 1115 Engineer Group baseline. Restore matching Czech presentation overlay and claim translations; English fields and factual classifications unchanged.',english_preserved:true});
  D.translation_audit_cs.batches.push({batch:'2026-08-18-1919-sig-backlog',processed_ids:['ENG-SIG-0003','ENG-SIG-0008'],fully_translated:2,partially_translated:0,review_needed:0,scope:'SIG priority; translate the sole missing title_cs for two audited U.S. autonomy/AI technology signals while preserving program names, English/base fields and maturity caveats.',english_preserved:true});
  window.__ENGINEER_I18N_CONTENT_CS_USA_ROK__={translated_entities:['ENG-SIG-0003','ENG-SIG-0008','ENG-SIG-0006','ENG-UNIT-0014'],review_needed_entities:[],resolved_mapping_entities:['ENG-UNIT-0014'],version:'1.5',last_batch:'2026-08-18-1919-sig-backlog'};
})();
