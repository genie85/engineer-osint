(function(){
  const D=window.__ENGINEER_DATA__;
  if(!D?.records?.records)return;
  const R=new Map(D.records.records.map(x=>[x.id,x]));
  const setMissing=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(v!==undefined&&v!==null&&v!==''&&!x[k])x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const done=[];

  if(setMissing('ENG-UNIT-0017',{fact_cs:'Ženijní škola JGSDF popisuje ženijní odbornost jako podporu sil prostřednictvím budování postavení, zřizování a překonávání překážek včetně min a ničení, výstavby a oprav komunikací a mostů. Škola zajišťuje vzdělávání, výzkum, podporu hodnocení a mezinárodní budování kapacit a ročně přijímá přibližně 1 000 posluchačů.'}))done.push('ENG-UNIT-0017');
  if(setMissing('ENG-UNIT-0018',{fact_cs:'Oficiální stránka JGSDF uvádí velitelské družstvo, zásobovací družstvo, tři ženijní čety, dopravní četu a četu prostředků pro překonávání vodních překážek. Velitel jednotky současně zastává funkci náčelníka ženijního oddělení štábu 11. brigády.'}))done.push('ENG-UNIT-0018');
  if(setMissing('ENG-UNIT-0019',{fact_cs:'Bundeswehr označuje školu za ústřední výcvikové zařízení pro Kampfmittelabwehr podřízené Pionierschule. Ženijní vojsko v této oblasti plní celoresortní vedoucí odbornou funkci a škola připravuje personál pro průzkum, identifikaci a činnosti spojené s likvidací výbušných hrozeb; využívá přitom dálkově ovládané manipulátory, detekční vozidla a další specializované prostředky.'}))done.push('ENG-UNIT-0019');
  if(setMissing('ENG-UNIT-0020',{fact_cs:'Veřejný materiál Polských ozbrojených sil uvádí, že od 1. prosince 2023 jsou hlášení týkající se vojenských výbušných a nebezpečných předmětů přijímána prostřednictvím jediného Centralny Ośrodek Koordynacji Rozminowania; vysílání a koordinaci podporuje systém SI PATROL.'}))done.push('ENG-UNIT-0020');
  if(setMissing('ENG-UNIT-0021',{confidence_cs:'VYSOKÁ pro příslušnost Patrolu 18; STŘEDNÍ pro širší současnou strukturu pyrotechnických hlídek'}))done.push('ENG-UNIT-0021');
  if(setMissing('ENG-UNIT-0022',{
    fact_cs:'Aktuální oficiální stránka 1 Warszawska Brygada Pancerna uvádí ve složení brigády Patrol Saperski nr 17. Oficiální zprávy polské policie současně dokumentují zásahy Patrolu 17 při nálezech nevybuchlé munice.',
    limit_cs:'To potvrzuje organizační vazbu a roli při reakci na ERW, nikoli úplnou národní architekturu velení a řízení EOD/EOC.'
  }))done.push('ENG-UNIT-0022');
  if(setMissing('ENG-UNIT-0023',{
    fact_cs:'Oficiální stránky 2. ženijního praporu JGSDF aktualizované v roce 2026 uvádějí mezi hlavní technikou 07MSB, minovací systém Type 83, odminovací vozidlo Type 92 a tankový most Type 91. Stránka aktivit zachycuje také výcvik s odminovacím vozidlem Type 92 v kontextu odpalování a ostrých demolic.',
    limit_cs:'Veřejné stránky neuvádějí počty, připravenost, zásoby munice ani úplnou válečnou tabulku organizace a výzbroje.'
  }))done.push('ENG-UNIT-0023');
  if(setMissing('ENG-UNIT-0024',{fact_cs:'Oficiální stránky 7. divize veřejně uvádějí mezi hlavní technikou tankový most Type 91, odminovací vozidlo Type 92, ženijní pracovní vozidlo a 07MSB. Historie praporu zaznamenává zavedení Type 92 MCV v roce 1995, ženijního pracovního vozidla v roce 2005 a 07MSB v roce 2016.'}))done.push('ENG-UNIT-0024');
  if(setMissing('ENG-UNIT-0025',{fact_cs:'Oficiální stránky JGSDF identifikují 3. ženijní prapor jako ženijní jednotku 3. divize odpovědnou za budování překážek, překonávání vodních překážek, dopravní a stavební podporu; velitel praporu současně zastává funkci náčelníka ženijního oddělení divize.'}))done.push('ENG-UNIT-0025');
  if(setMissing('ENG-UNIT-0026',{fact_cs:'Oficiální stránka JGSDF uvádí, že 8. ženijní prapor podporuje nadřízené velitelství především budováním postavení, zřizováním a překonáváním překážek, překonáváním vodních překážek a dopravními a stavebními úkoly.'}))done.push('ENG-UNIT-0026');
  if(setMissing('ENG-UNIT-0027',{
    fact_cs:'Aktuální oficiální stránka 10. divize uvádí 10. ženijní prapor v Kasugai jako jedinou jednotku ženijní odbornosti divize podporující útvary 10. divize; aktuální veřejné podrobnosti o konkrétní technice nebyly nalezeny.',
    confidence_cs:'VYSOKÁ pro identitu, umístění a roli; NÍZKÁ pro stav techniky'
  }))done.push('ENG-UNIT-0027');
  if(setMissing('ENG-UNIT-0028',{
    fact_cs:'Aktuální oficiální materiál 8. divize JGSDF identifikuje 8. ženijní prapor a popisuje úkoly zahrnující polní opevňování, zřizování a překonávání překážek, překonávání vodních překážek a dopravní a stavební podporu.',
    limit_cs:'Aktuální veřejný přehled hlavní techniky zůstává nevyřešen.'
  }))done.push('ENG-UNIT-0028');
  if(setMissing('ENG-UNIT-0029',{
    fact_cs:'Oficiální materiál Bundeswehru řadí binacionální prapor v Mindenu pod Panzerlehrbrigade 9. Prapor vznikl 1. října 2021 z Panzerpionierbataillon 130 a zahrnuje britskou 23 Amphibious Engineer Squadron. Veřejná stránka organizace uvádí devět rot a označuje M3 Amphibious Bridging System za charakteristickou schopnost praporu pro překonávání širokých vodních překážek.',
    analysis_cs:'Jde o vysoce hodnotný základní údaj pro analýzu binacionálního uspořádání sil pro překonávání širokých vodních překážek. Veřejně popsaná struktura podporuje analýzu interoperability, sama o sobě však neprokazuje válečnou připravenost, aktuální počty vozidel ani přesné složení dostupné pro konkrétní přechod.',
    confidence_cs:'VYSOKÁ pro veřejně doloženou organizační strukturu; NIŽŠÍ pro stav techniky a připravenost'
  }))done.push('ENG-UNIT-0029');

  window.__ENGINEER_I18N_PUBLIC_CZ_1920__={status:'loaded',items:done};
})();
