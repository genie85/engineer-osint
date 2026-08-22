(function(){
  const D=window.__ENGINEER_DATA__;
  if(!D?.records?.records)return;
  const R=new Map(D.records.records.map(x=>[x.id,x]));
  const setMissing=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(v!==undefined&&v!==null&&v!==''&&!x[k])x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const done=[];

  if(setMissing('ENG-SIG-0009',{
    fact_cs:'Rostec/Švabe 9. června 2026 veřejně představil prototyp dálkově ovládaného pásového prostředku pro laserové odminování.',
    analysis_cs:'B44 přidává další dvě primární veřejné indicie šíření rolí bezosádkových prostředků v ženijních úlohách: dálkové minování 808. brigády podpory reportované a sledované v systému DELTA a náborovou pozici sapéra/operátora bezosádkového odminovacího systému u 154. mechanizované brigády. Důkazy o šíření jsou silnější, stále však neprokazují jednotnou tabulkovou strukturu napříč ozbrojenými silami, počty platforem, připravenost ani jednotný organizační model.',
    limit_cs:'V tomto běhu nebyly nalezeny nezávislé důkazy o pořízení, vojenském zavedení, sériové výrobě, operačním použití ani účinnosti.'
  }))done.push('ENG-SIG-0009');

  if(setMissing('ENG-SIG-0010',{
    fact_cs:'U.S. Army 8. července 2026 oznámila výběr společností Caterpillar, Forterra, IDV USA a Overland AI pro program EABC. Cílem programu je autonomní nebo za hranicí přímé viditelnosti vedené robotické vytváření průchodů ve složitých překážkách a minových polích při omezení vystavení personálu. Armáda uvedla, že formální udělení smluv očekává v následujících týdnech; demonstrační a hodnoticí akce a hodnocení u jednotky Transformation in Contact jsou plánovány na začátek roku 2027.',
    limit_cs:'Výběr dodavatelů není totéž jako udělení smlouvy. Citované oznámení nedokládá operační zavedení, dosažení IOC/FOC ani rozhodnutí o sériové výrobě.'
  }))done.push('ENG-SIG-0010');

  if(setMissing('ENG-TECH-0019',{
    fact_cs:'JGSDF popisuje plovoucí most Type 92 jako modulární mostní a přívozový systém tvořený mostními články, motorovými čluny a přepravními prvky pro překonávání vodních překážek těžkými vozidly včetně tanků.',
    limit_cs:'Veřejné materiály o systému nedokládají současné počty, operační dostupnost ani přesné přidělení jednotkám.'
  }))done.push('ENG-TECH-0019');

  if(setMissing('ENG-TECH-0024',{
    fact_cs:'Oficiální zpráva AČR ze 4. května 2022 zdokumentovala dodání sedmi nově modernizovaných EOD robotů, včetně variant TALON 5 a Dragon Runner 20, a uvedla, že 15. ženijní pluk tehdy disponoval 31 roboty. Současná veřejná stránka 152. ženijního praporu potvrzuje EOD/IEDD jako jeden z úkolů jednotky, ale neuvádí stav robotické techniky pro rok 2026.',
    analysis_cs:'Oficiální zpráva AČR ze 4. května 2022 zdokumentovala dodání sedmi nově modernizovaných EOD robotů, včetně variant TALON 5 a Dragon Runner 20, a uvedla, že 15. ženijní pluk tehdy disponoval 31 roboty. Současná veřejná stránka 152. ženijního praporu potvrzuje EOD/IEDD jako jeden z úkolů jednotky, ale neuvádí stav robotické techniky pro rok 2026.'
  }))done.push('ENG-TECH-0024');

  if(setMissing('ENG-TECH-0025',{
    fact_cs:'Veřejný Telegram kanál @VIUKSIDV uvedl, že na salonu Flot-2026 byla představena ženijní konfigurace pozemního robotického komplexu Katyusha určená k odminování a přepravě nákladu a že systémy již byly odesílány některým jednotkám v bojové zóně. Samotné vystavení platformy a její základní parametry jsou nezávisleji potvrzeny reportáží Kommersantu vycházející z TASS. Skutečný rozsah nasazení zůstává pouze tvrzením; v tomto běhu nebyl nalezen veřejný důkaz na úrovni konkrétní jednotky.',
    analysis_cs:'Veřejný Telegram kanál @VIUKSIDV uvedl, že na salonu Flot-2026 byla představena ženijní konfigurace pozemního robotického komplexu Katyusha určená k odminování a přepravě nákladu a že systémy již byly odesílány některým jednotkám v bojové zóně. Samotné vystavení platformy a její základní parametry jsou nezávisleji potvrzeny reportáží Kommersantu vycházející z TASS. Skutečný rozsah nasazení zůstává pouze tvrzením; v tomto běhu nebyl nalezen veřejný důkaz na úrovni konkrétní jednotky.'
  }))done.push('ENG-TECH-0025');

  if(setMissing('ENG-TECH-0026',{
    fact_cs:'Dne 6. února 2026 Pozemní síly AČR zdokumentovaly výcvik roty všeobecné ženijní podpory 152. ženijního praporu se soupravou MS-21. Zdroj popisuje modulární ocelový provizorní most sestavovaný z třímetrových dílů, s přemostěním přibližně do 21 m a vozovkou širokou asi 4 m, a zaznamenává zkušební použití teleskopického manipulátoru JLG 4017 jako alternativy k automobilnímu jeřábu. Starší článek AČR z roku 2021 uváděl pro konkrétní 21m sestavu nosnost až 60 t. Veřejné zdroje posouzené v tomto běhu nedokládají současný počet souprav, rozdělení vlastnictví mezi AČR a Správu státních hmotných rezerv ani jejich současné rozmístění.',
    analysis_cs:'Dne 6. února 2026 Pozemní síly AČR zdokumentovaly výcvik roty všeobecné ženijní podpory 152. ženijního praporu se soupravou MS-21. Zdroj popisuje modulární ocelový provizorní most sestavovaný z třímetrových dílů, s přemostěním přibližně do 21 m a vozovkou širokou asi 4 m, a zaznamenává zkušební použití teleskopického manipulátoru JLG 4017 jako alternativy k automobilnímu jeřábu. Starší článek AČR z roku 2021 uváděl pro konkrétní 21m sestavu nosnost až 60 t. Veřejné zdroje posouzené v tomto běhu nedokládají současný počet souprav, rozdělení vlastnictví mezi AČR a Správu státních hmotných rezerv ani jejich současné rozmístění.'
  }))done.push('ENG-TECH-0026');

  if(setMissing('ENG-TECH-0027',{
    fact_cs:'Dne 29. května 2026 AČR zdokumentovala intenzivní výcvik pontonové roty 152. ženijního praporu a jejího protějšku z Aktivní zálohy na Labi s použitím pontonové mostové soupravy PMS, motorových člunů, člunu Veronika MO-2000, vozidel multilift a nákladních automobilů Tatra T810. Oficiální stránka AČR k technice uvádí, že PMS slouží ke stavbě plovoucích mostů a přívozových přepravišť, lze ji dělit na poloviny a čtvrtiny a podle konfigurace má nosnost 20, 40, 60 nebo 80 t. Článek z roku 2020 uváděl u pontonové roty 12 přívěsů a tři vozidla s vozovkovými díly; tento historický údaj není přenášen jako stav techniky v roce 2026.',
    analysis_cs:'Dne 29. května 2026 AČR zdokumentovala intenzivní výcvik pontonové roty 152. ženijního praporu a jejího protějšku z Aktivní zálohy na Labi s použitím pontonové mostové soupravy PMS, motorových člunů, člunu Veronika MO-2000, vozidel multilift a nákladních automobilů Tatra T810. Oficiální stránka AČR k technice uvádí, že PMS slouží ke stavbě plovoucích mostů a přívozových přepravišť, lze ji dělit na poloviny a čtvrtiny a podle konfigurace má nosnost 20, 40, 60 nebo 80 t. Článek z roku 2020 uváděl u pontonové roty 12 přívěsů a tři vozidla s vozovkovými díly; tento historický údaj není přenášen jako stav techniky v roce 2026.'
  }))done.push('ENG-TECH-0027');

  if(setMissing('ENG-TTP-0002',{
    fact_cs:'Během cvičení 4. divize oficiální účet JGSDF uvádí, že 4. ženijní prapor podporoval divizi a budoval překážky, včetně použití min rozptylovaných z vrtulníku, v koordinaci se zdržením krycího uskupení; současně budoval ochranné objekty pro velitelské stanoviště divize.',
    analysis_cs:'Oficiální report ArmyInform z 15. června 2026 o 91. brigádě podpory popisuje ženijní práce při trvalé hrozbě dronů. Pracovní skupiny chrání krycí prvky vybavené detekčními a prostředky radioelektronického boje spolu s palebnou ochranou, zatímco brigáda zároveň instaluje a opravuje protidronové sítě podél dopravních tras. B42 tento poznatek vede jako jednotkově reportovanou adaptaci ke zvýšení přežití, nikoli jako univerzální ukrajinské SOP nebo standard napříč ozbrojenými silami.',
    limit_cs:'Podklad nedokládá nezměněné TTP v roce 2026, současný stav zásob munice ani praxi uplatňovanou napříč celou JGSDF.'
  }))done.push('ENG-TTP-0002');

  if(setMissing('ENG-TTP-0003',{
    fact_cs:'ArmyInform uvádí přisuzovaný popis, podle něhož byla po kurské operaci popsaná ženijní rota reorganizována na rotu dálkového minování; sapérské skupiny byly nahrazeny osádkami UAS a proběhl výcvik pilotů i pozemních týmů. U jednotky byly současně přítomny také UGV.',
    limit_cs:'Jde o popis konkrétní jednotky a nelze jej považovat za důkaz jednotného organizačního modelu napříč ozbrojenými silami.'
  }))done.push('ENG-TTP-0003');

  window.__ENGINEER_PUBLIC_CZ_BATCH_1834__={processed_ids:done,mapped_fields:20,english_preserved:true};
})();

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
  if(setMissing('ENG-UNIT-0022',{fact_cs:'Aktuální oficiální stránka 1 Warszawska Brygada Pancerna uvádí ve složení brigády Patrol Saperski nr 17. Oficiální zprávy polské policie současně dokumentují zásahy Patrolu 17 při nálezech nevybuchlé munice.',limit_cs:'To potvrzuje organizační vazbu a roli při reakci na ERW, nikoli úplnou národní architekturu velení a řízení EOD/EOC.'}))done.push('ENG-UNIT-0022');
  if(setMissing('ENG-UNIT-0023',{fact_cs:'Oficiální stránky 2. ženijního praporu JGSDF aktualizované v roce 2026 uvádějí mezi hlavní technikou 07MSB, minovací systém Type 83, odminovací vozidlo Type 92 a tankový most Type 91. Stránka aktivit zachycuje také výcvik s odminovacím vozidlem Type 92 v kontextu odpalování a ostrých demolic.',limit_cs:'Veřejné stránky neuvádějí počty, připravenost, zásoby munice ani úplnou válečnou tabulku organizace a výzbroje.'}))done.push('ENG-UNIT-0023');
  if(setMissing('ENG-UNIT-0024',{fact_cs:'Oficiální stránky 7. divize veřejně uvádějí mezi hlavní technikou tankový most Type 91, odminovací vozidlo Type 92, ženijní pracovní vozidlo a 07MSB. Historie praporu zaznamenává zavedení Type 92 MCV v roce 1995, ženijního pracovního vozidla v roce 2005 a 07MSB v roce 2016.'}))done.push('ENG-UNIT-0024');
  if(setMissing('ENG-UNIT-0025',{fact_cs:'Oficiální stránky JGSDF identifikují 3. ženijní prapor jako ženijní jednotku 3. divize odpovědnou za budování překážek, překonávání vodních překážek, dopravní a stavební podporu; velitel praporu současně zastává funkci náčelníka ženijního oddělení divize.'}))done.push('ENG-UNIT-0025');
  if(setMissing('ENG-UNIT-0026',{fact_cs:'Oficiální stránka JGSDF uvádí, že 8. ženijní prapor podporuje nadřízené velitelství především budováním postavení, zřizováním a překonáváním překážek, překonáváním vodních překážek a dopravními a stavebními úkoly.'}))done.push('ENG-UNIT-0026');
  if(setMissing('ENG-UNIT-0027',{fact_cs:'Aktuální oficiální stránka 10. divize uvádí 10. ženijní prapor v Kasugai jako jedinou jednotku ženijní odbornosti divize podporující útvary 10. divize; aktuální veřejné podrobnosti o konkrétní technice nebyly nalezeny.',confidence_cs:'VYSOKÁ pro identitu, umístění a roli; NÍZKÁ pro stav techniky'}))done.push('ENG-UNIT-0027');
  if(setMissing('ENG-UNIT-0028',{fact_cs:'Aktuální oficiální materiál 8. divize JGSDF identifikuje 8. ženijní prapor a popisuje úkoly zahrnující polní opevňování, zřizování a překonávání překážek, překonávání vodních překážek a dopravní a stavební podporu.',limit_cs:'Aktuální veřejný přehled hlavní techniky zůstává nevyřešen.'}))done.push('ENG-UNIT-0028');
  if(setMissing('ENG-UNIT-0029',{fact_cs:'Oficiální materiál Bundeswehru řadí binacionální prapor v Mindenu pod Panzerlehrbrigade 9. Prapor vznikl 1. října 2021 z Panzerpionierbataillon 130 a zahrnuje britskou 23 Amphibious Engineer Squadron. Veřejná stránka organizace uvádí devět rot a označuje M3 Amphibious Bridging System za charakteristickou schopnost praporu pro překonávání širokých vodních překážek.',analysis_cs:'Jde o vysoce hodnotný základní údaj pro analýzu binacionálního uspořádání sil pro překonávání širokých vodních překážek. Veřejně popsaná struktura podporuje analýzu interoperability, sama o sobě však neprokazuje válečnou připravenost, aktuální počty vozidel ani přesné složení dostupné pro konkrétní přechod.',confidence_cs:'VYSOKÁ pro veřejně doloženou organizační strukturu; NIŽŠÍ pro stav techniky a připravenost'}))done.push('ENG-UNIT-0029');
  window.__ENGINEER_PUBLIC_CZ_BATCH_1920__={processed_ids:done,mapped_fields:19,english_preserved:true};
})();

(function(){
  const D=window.__ENGINEER_DATA__;
  if(!D?.records?.records)return;
  const R=new Map(D.records.records.map(x=>[x.id,x]));
  const setMissing=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(v!==undefined&&v!==null&&v!==''&&!x[k])x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const done=[];
  if(setMissing('ENG-UNIT-0030',{
    fact_cs:'15. ženijní pluk je ve veřejných materiálech AČR popisován jako plukovní ženijní útvar pro ženijní podporu operací. Současné veřejné podklady identifikují tři ženijní prapory a spojují 151. ženijní prapor s úkolovými uskupeními založenými na 4. brigádě rychlého nasazení a 153. ženijní prapor s úkolovými uskupeními založenými na 7. mechanizované brigádě.',
    analysis_cs:'15. ženijní pluk je ve veřejných materiálech AČR popisován jako plukovní ženijní útvar pro ženijní podporu operací. Současné veřejné podklady identifikují tři ženijní prapory a spojují 151. ženijní prapor s úkolovými uskupeními založenými na 4. brigádě rychlého nasazení a 153. ženijní prapor s úkolovými uskupeními založenými na 7. mechanizované brigádě.',
    intelligence_gaps_cs:['úplné současné TO&E pod úrovní praporu','současné rozdělení techniky podle praporů a rot','podrobné vztahy velení a řízení v konkrétních scénářích nasazení NATO','veřejné mapování národních ženijních kvalifikací na kategorie NATO EOD/EOC/EOR']
  }))done.push('ENG-UNIT-0030');
  if(setMissing('ENG-UNIT-0031',{
    fact_cs:'151. ženijní prapor je ve veřejných podkladech popisován jako útvar posilující úkolová uskupení komplexní ženijní podporou, podporou EOD a provizorním mostním zabezpečením; veřejně popsaná struktura zahrnuje dvě roty bojové ženijní podpory a rotu ženijního zabezpečení.',
    analysis_cs:'151. ženijní prapor je ve veřejných podkladech popisován jako útvar posilující úkolová uskupení komplexní ženijní podporou, podporou EOD a provizorním mostním zabezpečením; veřejně popsaná struktura zahrnuje dvě roty bojové ženijní podpory a rotu ženijního zabezpečení.',
    intelligence_gaps_cs:['současná podrobná organizace EOD uvnitř praporu','rozdělení techniky mezi roty bojové ženijní podpory','současný model připravenosti a certifikace','mapování kontextu úkolů mine action']
  }))done.push('ENG-UNIT-0031');
  if(setMissing('ENG-UNIT-0032',{
    operational_evidence_cs:{training_evidence:'Bison Readiness 2025 — mnohonárodní výcvik C-IED/EOD',operational_evidence:'VEŘEJNÁ DATA NENALEZENA',combat_evidence:'VEŘEJNÁ DATA NENALEZENA'}
  }))done.push('ENG-UNIT-0032');
  if(setMissing('ENG-UNIT-0033',{
    fact_cs:'153. ženijní prapor sídlí v Olomouci. Veřejné materiály jej popisují jako útvar poskytující bojovou ženijní podporu brigádním a praporním úkolovým uskupením a jako útvar předurčený pro úkolová uskupení založená na 7. mechanizované brigádě.',
    analysis_cs:'153. ženijní prapor sídlí v Olomouci. Veřejné materiály jej popisují jako útvar poskytující bojovou ženijní podporu brigádním a praporním úkolovým uskupením a jako útvar předurčený pro úkolová uskupení založená na 7. mechanizované brigádě.',
    intelligence_gaps_cs:['současné TO&E praporu a rot','současná matice techniky bojové ženijní podpory','podrobnosti velení a řízení v brigádních úkolových uskupeních','současný příspěvek k EOD/EOC, pokud existuje']
  }))done.push('ENG-UNIT-0033');
  if(setMissing('ENG-UNIT-0036',{
    fact_cs:'Aktuálně dostupný profil Ministerstva obrany Ukrajiny popisuje Síly podpory jako samostatný druh vojska sdružující pět složek: ženijní vojsko, ochranu proti CBRN, geodetické zabezpečení, hydrometeorologickou službu a kynologickou službu. Veřejně přisuzuje ženijnímu vojsku vytváření průchodů pro obrněná vozidla, budování opevnění a maskovací úkoly. Stránka neuvádí podrobnou podřízenou organizační strukturu ani početní stavy.',
    analysis_cs:'Aktuálně dostupný profil Ministerstva obrany Ukrajiny popisuje Síly podpory jako samostatný druh vojska sdružující pět složek: ženijní vojsko, ochranu proti CBRN, geodetické zabezpečení, hydrometeorologickou službu a kynologickou službu. Veřejně přisuzuje ženijnímu vojsku vytváření průchodů pro obrněná vozidla, budování opevnění a maskovací úkoly. Stránka neuvádí podrobnou podřízenou organizační strukturu ani početní stavy.'
  }))done.push('ENG-UNIT-0036');
  if(setMissing('ENG-TECH-0028',{
    operational_evidence_cs:{historical_training_and_disaster_response:'POTVRZENO',current_2026_quantity:'VEŘEJNÁ DATA NENALEZENA',current_2026_serviceability:'VEŘEJNÁ DATA NENALEZENA'},
    fact_cs:'Kolový mostní automobil na podvozku Tatra T-815 8×8 určený k rychlému překonávání překážek. AČR uvádí délku jednoho přemostění 10 až 12,5 m, možnost až osmi polí, pohotovostní hmotnost 25,9 t, mostní pole o rozměrech 13,5 × 4,0 m a nosnost jednoho pole 50 t.',
    analysis_cs:'Kolový mostní automobil na podvozku Tatra T-815 8×8 určený k rychlému překonávání překážek. AČR uvádí délku jednoho přemostění 10 až 12,5 m, možnost až osmi polí, pohotovostní hmotnost 25,9 t, mostní pole o rozměrech 13,5 × 4,0 m a nosnost jednoho pole 50 t.'
  }))done.push('ENG-TECH-0028');
  if(setMissing('ENG-TECH-0029',{
    operational_evidence_cs:{historical_quantity_2016:6,current_2026_quantity:'VEŘEJNÁ DATA NENALEZENA',current_2026_serviceability:'VEŘEJNÁ DATA NENALEZENA'},
    fact_cs:'Pásový mostní tank na upraveném podvozku T-55A. Ministerstvo obrany ČR uvádí hmotnost 36 t, dvoučlennou osádku, délku přemostění až 18 m, šířku 3,3 m a nosnost až 50 t. Nejnovější nalezený oficiální údaj o počtu je historický: šest vozidel k 1. lednu 2016; není považován za stav flotily v roce 2026.',
    analysis_cs:'Pásový mostní tank na upraveném podvozku T-55A. Ministerstvo obrany ČR uvádí hmotnost 36 t, dvoučlennou osádku, délku přemostění až 18 m, šířku 3,3 m a nosnost až 50 t. Nejnovější nalezený oficiální údaj o počtu je historický: šest vozidel k 1. lednu 2016; není považován za stav flotily v roce 2026.'
  }))done.push('ENG-TECH-0029');
  if(setMissing('ENG-TECH-0032',{
    fact_cs:'Ministerstvo obrany Ukrajiny 9. června 2026 oznámilo, že NEO-1 byl kodifikován a povolen k provozu v Ozbrojených silách Ukrajiny. Oficiální certifikační registr uvádí certifikát UA.017.ПО.089-26 ze dne 23. února 2026. Veřejné zdroje B38 neprokazují počet dodaných kusů, rozdělení k jednotkám, provozuschopnost ani bojovou účinnost.',
    analysis_cs:'Ministerstvo obrany Ukrajiny 9. června 2026 oznámilo, že NEO-1 byl kodifikován a povolen k provozu v Ozbrojených silách Ukrajiny. Oficiální certifikační registr uvádí certifikát UA.017.ПО.089-26 ze dne 23. února 2026. Veřejné zdroje B38 neprokazují počet dodaných kusů, rozdělení k jednotkám, provozuschopnost ani bojovou účinnost.'
  }))done.push('ENG-TECH-0032');
  if(setMissing('ENG-TECH-0034',{
    fact_cs:'Ministerstvo obrany Ukrajiny 3. března 2025 uvedlo, že v různých regionech Ukrajiny působilo 62 strojů GCS-200 a během roku 2025 očekávalo dalších 26. Zdroj také odkazoval na dřívější dodávky vojenskému útvaru Sil podpory. ArmyInform 16. dubna 2026 informoval o příslušníkovi 48. brigády podpory, který se cvičil na GCS-200. Údaj 62 je historický celoukrajinský veřejný snapshot napříč operátory a nesmí být vykládán jako vojenský inventář ani jako současný stav v srpnu 2026.',
    analysis_cs:'Ministerstvo obrany Ukrajiny 3. března 2025 uvedlo, že v různých regionech Ukrajiny působilo 62 strojů GCS-200 a během roku 2025 očekávalo dalších 26. Zdroj také odkazoval na dřívější dodávky vojenskému útvaru Sil podpory. ArmyInform 16. dubna 2026 informoval o příslušníkovi 48. brigády podpory, který se cvičil na GCS-200. Údaj 62 je historický celoukrajinský veřejný snapshot napříč operátory a nesmí být vykládán jako vojenský inventář ani jako současný stav v srpnu 2026.'
  }))done.push('ENG-TECH-0034');
  if(setMissing('ENG-TECH-0035',{
    fact_cs:'Ministerstvo obrany Ukrajiny v červnu 2025 kodifikovalo a povolilo TERMIT k použití v obranných silách a veřejně uvedlo konfigurace pro logistiku, zdravotnickou evakuaci, minování a přepravu vybavení. V červnu 2026 Ukrajina a Německo oznámily prováděcí ujednání pro společnou výrobu UGV Termit v Německu s deklarovaným cílem několika tisíc systémů. Aktuální profil Termit 2.0 společnosti Tencore uvádí rovněž minování a ženijní podporu. Parametry se změnily: zpráva MO z roku 2025 uváděla nosnost do 300 kg, zatímco současná stránka Termit 2.0 uvádí až 400 kg. Nejpravděpodobnějším vysvětlením je novější iterace, avšak přesná konfigurační návaznost není veřejně doložena.',
    analysis_cs:'Ministerstvo obrany Ukrajiny v červnu 2025 kodifikovalo a povolilo TERMIT k použití v obranných silách a veřejně uvedlo konfigurace pro logistiku, zdravotnickou evakuaci, minování a přepravu vybavení. V červnu 2026 Ukrajina a Německo oznámily prováděcí ujednání pro společnou výrobu UGV Termit v Německu s deklarovaným cílem několika tisíc systémů. Aktuální profil Termit 2.0 společnosti Tencore uvádí rovněž minování a ženijní podporu. Parametry se změnily: zpráva MO z roku 2025 uváděla nosnost do 300 kg, zatímco současná stránka Termit 2.0 uvádí až 400 kg. Nejpravděpodobnějším vysvětlením je novější iterace, avšak přesná konfigurační návaznost není veřejně doložena.'
  }))done.push('ENG-TECH-0035');
  if(setMissing('ENG-TECH-0037',{
    fact_cs:'Ministerstvo obrany Ukrajiny 23. dubna 2026 uvedlo, že Bizon-L byl kodifikován a povolen k operačnímu použití. Veřejný profil uvádí rychlost do 12 km/h, nosnost do 300 kg a dojezd do 50 km; s doplňkovým vybavením může zřizovat ženijní překážky a provádět plošné minování. Počet, rozdělení a provozuschopnost nejsou veřejně doloženy.',
    analysis_cs:'Ministerstvo obrany Ukrajiny 23. dubna 2026 uvedlo, že Bizon-L byl kodifikován a povolen k operačnímu použití. Veřejný profil uvádí rychlost do 12 km/h, nosnost do 300 kg a dojezd do 50 km; s doplňkovým vybavením může zřizovat ženijní překážky a provádět plošné minování. Počet, rozdělení a provozuschopnost nejsou veřejně doloženy.'
  }))done.push('ENG-TECH-0037');
  if(setMissing('ENG-TECH-0038',{
    fact_cs:'Oficiální ukrajinské zdroje potvrzují víceletou certifikační stopu systému MV-10, lokální montáž a opravy i významné historické dodávky. Registr obsahuje nové certifikační záznamy MV-10 od ledna do března 2026. Veřejná data ke konci roku 2025 uvádějí pouze souhrnný počet 69 systémů DOK-ING MV-10/MV-4; přesný počet MV-10, jejich rozdělení a provozuschopnost k 19. srpnu 2026 zůstávají neznámé.',
    analysis_cs:'Oficiální ukrajinské zdroje potvrzují víceletou certifikační stopu systému MV-10, lokální montáž a opravy i významné historické dodávky. Registr obsahuje nové certifikační záznamy MV-10 od ledna do března 2026. Veřejná data ke konci roku 2025 uvádějí pouze souhrnný počet 69 systémů DOK-ING MV-10/MV-4; přesný počet MV-10, jejich rozdělení a provozuschopnost k 19. srpnu 2026 zůstávají neznámé.'
  }))done.push('ENG-TECH-0038');
  window.__ENGINEER_PUBLIC_CZ_BATCH_1930__={processed_ids:done,mapped_fields:28,english_preserved:true,review_skipped:['ENG-TECH-0036']};
})();
