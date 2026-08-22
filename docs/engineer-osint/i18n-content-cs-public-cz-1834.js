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
