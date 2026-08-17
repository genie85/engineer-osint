(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const R=new Map((D.records?.records||[]).map(x=>[x.id,x]));
  const put=(id,p)=>{const x=R.get(id);if(!x)return;Object.assign(x,p);x.translation_status_cs=p.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=p.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';};
  put('ENG-SIG-0006',{
    title_cs:'USA — experimentální doprava ženijního prostředku pro breaching pomocí UAS',
    summary_cs:'U.S. Army a Oregon Army National Guard veřejně doložily červnový proof-of-concept, při němž Bravo Company, 741st Brigade Engineer Battalion použila těžší bezpilotní systém Mule 28 k dopravě živého Bangalore prostředku proti překážce z koncertiny na Orchard Combat Training Center. Jde o jednotkový experiment a military testing, nikoli důkaz plošného zavedení nebo standardizovaného Army TTP.',
    why_it_matters_cs:'Experiment ukazuje praktické propojení UAS s klasickým ženijním účinkem při bojovém překonávání překážek s cílem omezit expozici personálu. Současně jde o konkrétní příklad, kdy americká ženijní jednotka uvádí inspiraci zkušenostmi z Ukrajiny.',
    staff_relevance_cs:'Relevantní pro plánování snižování rizika při překonávání překážek, integraci UAS do ženijních úkolů a experimentování v podmínkách elektronického boje. Při štábním použití je nutné oddělit místní proof-of-concept od schválené Army schopnosti nebo doktríny.',
    training_relevance_cs:'Vhodné jako Lessons Learned případ pro postupné experimentální ověřování, integraci UAS do ženijních úkolů a práci s failure modes; nejde o náhradu schválených postupů pro výbušniny ani UAS.',
    intelligence_gaps_cs:['Zda byl zveřejněn nebo formálně převzat avizovaný battalion white paper','Výsledky navazujících demonstrací a zkoušek','Zda koncept převzala některá Army capability-development nebo acquisition organizace','Aktuální stav prototypů Mule 28 po červnu 2026','Případná změna schváleného TTP nebo doktríny mimo původní prapor']
  });
  put('ENG-UNIT-0014',{
    title_cs:'ROK Army 1115 Engineer Group — veřejný výcvikový baseline',
    summary_cs:'Jihokorejské ministerstvo obrany veřejně uvádí Army 1115 Engineer Group jako jedno z míst konání programu UN Triangular Partnership. Šestitýdenní běh v roce 2026 probíhal od 4. května do 12. června a rozšířil výuku z obsluhy ženijní techniky také o identifikaci nebezpečných výbušných předmětů a řízení hrozeb IED.',
    why_it_matters_cs:'Záznam poskytuje aktuální organizační kotvu pro jihokorejský mezinárodní ženijní výcvik a ukazuje propojení výuky ženijní techniky s problematikou výbušných hrozeb a IED v rámci přípravy pro mírové operace OSN.',
    staff_relevance_cs:'Relevantní pro návrh multinational training, peacekeeping engineer capacity building a rozhraní ženijního, explosive-hazard a zdravotnického výcviku. Bez dalších podkladů z něj nelze odvozovat ekvivalenci s NATO EOD/EOC kvalifikacemi.',
    training_relevance_cs:'Program 2026 ukazuje širší balík přípravy než samotnou obsluhu ženijní techniky a je vhodný pro srovnání modelů mezinárodního budování ženijních schopností.',
    intelligence_gaps_cs:['Úplný mírový a válečný úkol 1115 Engineer Group','Aktuální struktura praporů/rot a personální síla','Organická technika a stav připravenosti','Přesné kvalifikační standardy modulů pro výbušné hrozby a IED','Další národní nebo mezinárodní kurzy pořádané jednotkou mimo UN TPP']
  });
  window.__ENGINEER_I18N_CONTENT_CS_USA_ROK__={translated_entities:['ENG-SIG-0006','ENG-UNIT-0014'],version:'1.0'};
})();