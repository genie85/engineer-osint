(function(){
  const D=window.__ENGINEER_DATA__;
  if(!D?.records?.records)return;
  const R=new Map(D.records.records.map(x=>[x.id,x]));
  const setMissing=(id,p)=>{const x=R.get(id);if(!x)return false;for(const[k,v]of Object.entries(p))if(v!==undefined&&v!==null&&v!==''&&!x[k])x[k]=v;x.translation_status_cs=x.translation_status_cs||'ANALYST_TRANSLATION';x.translation_provenance_cs=x.translation_provenance_cs||'ENGINEER_OSINT_TRANSLATION_LAYER';return true;};
  const done=[];

  if(setMissing('ENG-TTP-0004',{
    fact_cs:'Případ použití systému Sonobot 5 u Bundeswehru výslovně cílí na rychlý a skrytý digitální průzkum vodních překážek s předáváním výsledků odpovědným velitelům v reálném čase. Britský program Map the Gap Phase 2 financoval autonomní a poloautonomní letecká, pozemní a obojživelná řešení průzkumu s cílem snížit riziko pro průzkumné týmy Royal Engineers a rychleji prozkoumat více míst přechodu. Výcvik U.S. Army Reserve při Yakima Strike využil ženijní potápěčský prvek pro hydrografický průzkum a zajištění bezpečnosti na vodě před překonáním překážky, což dokládá trvalou potřebu těchto informací i tam, kde sběr zůstává prováděn personálem.',
    analysis_cs:'Ve třech národních kontextech zůstává společným požadavkem hydrografický průzkum a průzkum břehů před překonáním vodní překážky; novým trendem je přesun sběru informací od exponovaných týmů k dálkovým multisenzorovým prostředkům a rychlejší digitální distribuci výsledků.',
    limit_cs:'Map the Gap je výzkumný a vývojový program a Sonobot 5 představuje jeden zavedený národní příklad; dostupné důkazy nestačí k tvrzení, že v NATO existuje standardizovaný autonomní TTP průzkumu vodních překážek.',
    confidence_cs:'STŘEDNĚ VYSOKÁ pro směr trendu; NÍZKÁ AŽ STŘEDNÍ pro míru standardizace'
  }))done.push('ENG-TTP-0004');

  if(setMissing('ENG-TTP-0005',{
    fact_cs:'Článek „Rethinking Survivability“ v U.S. Army Engineer Professional Bulletin z roku 2026 uvádí, že rozšířené průzkumné a úderné UAV mění problém ochrany vozidel, dělostřelectva a postavení. Doporučuje doplnit ochranu shora proti UAV a záměrně vyvažovat maskování a fyzické krytí podle převládající hrozby.',
    analysis_cs:'Pro ženijní štáby to znamená, že plánování přežití stále více vyžaduje řízení signatur a analýzu vzdušného pozorování vedle tradičních výpočtů objemu zemních prací a času potřebného pro jejich provedení.',
    limit_cs:'Jde o odborné doporučení, nikoli o důkaz formálně vyhlášené změny doktríny napříč celou U.S. Army; dělostřelecké a přímé palebné hrozby nadále mohou vyžadovat klasické zahloubení a zodolnění.',
    confidence_cs:'VYSOKÁ pro existenci publikace a doporučení; STŘEDNÍ pro trend napříč ozbrojenými silami'
  }))done.push('ENG-TTP-0005');

  if(setMissing('ENG-UNIT-0001',{
    fact_cs:'Síly podpory Ozbrojených sil Ukrajiny jsou samostatným druhem vojska sdružujícím ženijní vojsko, jednotky radiační, chemické a biologické ochrany, geoinformační, hydrometeorologické a kynologické služby. Oficiální popis připisuje ženijním jednotkám mimo jiné zřizování průchodů, budování opevnění a maskování.',
    analysis_cs:'Jde o užitečný výchozí organizační rámec pro sledování změn struktury a integrace různých podpůrných odborností.'
  }))done.push('ENG-UNIT-0001');

  if(setMissing('ENG-UNIT-0002',{
    fact_cs:'Čínské ministerstvo národní obrany uvedlo, že 5. ledna 2026 úspěšně absolvovalo kvalifikační hodnocení UNMAS pro odminování a EOD celkem 69 příslušníků 24. čínské mírové víceúčelové ženijní roty. UNMAS uvádí, že čínské a kambodžské týmy odminování/EOD v UNIFIL podléhají výcvikové podpoře, validaci, QA/QC a monitoringu. UNIFIL nezávisle identifikuje čínskou víceúčelovou ženijní jednotku provádějící humanitární odminování.',
    analysis_cs:'Veřejné podklady poskytují silný důkaz o formálně existující čínské mírové ženijní schopnosti v oblasti odminování a EOD s externí validací OSN.',
    limit_cs:'Kvalifikace a zajištění kvality v mírové operaci OSN nelze přímo převádět na důkaz schopnosti PLA provádět bojový průlom ve vysoce intenzivním konfliktu.'
  }))done.push('ENG-UNIT-0002');

  if(setMissing('ENG-UNIT-0003',{
    fact_cs:'Oficiální čínský zdroj uvádí, že při úkolu bylo nasazeno 38 osob a 22 vozidel. Práce trvaly téměř 50 dní, přesunuto bylo více než 20 000 m³ zeminy a opravovaná či budovaná trasa měla přibližně 150 km a spojovala několik prostorů mise a místních lokalit.',
    analysis_cs:'Záznam poskytuje užitečný veřejný poměr sil a prostředků k úkolu pro čínské expediční horizontální ženijní práce v podmínkách mise OSN.',
    limit_cs:'Jde o jediný národní zdroj; uvedené hodnoty zatím nejsou nezávisle ověřeny a stavební činnost v mírové misi OSN není přímo srovnatelná s obnovou komunikací v podmínkách boje.',
    confidence_cs:'STŘEDNÍ'
  }))done.push('ENG-UNIT-0003');

  if(setMissing('ENG-UNIT-0004',{
    fact_cs:'1st Armored Division aktivovala 15. června 2026 ve Fort Bliss Headquarters and Headquarters Company, 1st Engineer Brigade. U.S. Army spojuje aktivaci s Army Structure Guidance 2028–2032 a koncepcí Army 2030. Oficiální článek popisuje posun od modelu soustředěného na brigády ke konsolidovaným schopnostem na úrovni divize. Počáteční operační schopnost je plánována na začátek roku 2027 a plná operační schopnost na začátek roku 2028.',
    analysis_cs:'Jde o silný organizační signál, že se velení a řízení těžkých bojových ženijních a ochranných schopností pro LSCO znovu posiluje na úrovni obrněné divize.',
    limit_cs:'Aktivace HHC je přechodným krokem změny struktury sil; konečnou strukturu podřízených jednotek ani skutečně dosaženou schopnost nelze dovozovat před doložením IOC/FOC.'
  }))done.push('ENG-UNIT-0004');

  if(setMissing('ENG-UNIT-0005',{
    fact_cs:'Aktuální stránka British Army uvádí v sestavě 8 Engineer Brigade skupinu 29 (EOD & Search) Group. Stejná oficiální struktura zahrnuje 33., 35. a 101. Engineer Regiment (EOD&S), 11 (EOD&S) Regiment RLC, 28 Engineer Regiment (C-CBRN), další ženijní pluky a skupiny infrastrukturní podpory.',
    analysis_cs:'Publikovaná struktura představuje užitečný národní model soustředění konvenčního ženijního vojska, EOD/Search a dalších specializovaných podpůrných schopností pod brigádním rámcem.',
    limit_cs:'Veřejný seznam jednotek dokládá organizační příslušnost, ale sám o sobě nedefinuje válečné vztahy OPCOM/TACOM ani konkrétní úkolové uskupení při nasazení.'
  }))done.push('ENG-UNIT-0005');

  if(setMissing('ENG-UNIT-0006',{
    fact_cs:'Panzerpionierbataillon 1 je součástí Panzerbrigade 21 a sídlí v Holzmindenu. Oficiální stránka Bundeswehru uvádí přibližně 650 příslušníků. Mezi příklady techniky patří Pionierpanzer Dachs, Minenräumpanzer Keiler a Brückenlegepanzer Biber.',
    analysis_cs:'Jde o užitečný současný referenční příklad těžkého ženijního praporu obrněné brigády kombinující schopnosti mobility, countermobility a ochrany/přežití.'
  }))done.push('ENG-UNIT-0006');

  if(setMissing('ENG-UNIT-0007',{
    analysis_cs:'Francouzská reforma představuje další alianční signál návratu k soustředění ženijních schopností nad úroveň brigády pro operace vysoké intenzity a rozsáhlé bojové operace.'
  }))done.push('ENG-UNIT-0007');

  if(setMissing('ENG-UNIT-0008',{
    analysis_cs:'Pluk je užitečným příkladem spojení klasického bojového ženijního zabezpečení, těžké podpory nasazení, specializací EOD/Search a postupné integrace UAS.',
    limit_cs:'Veřejné sdělení neumožňuje určit konkrétní typy UAS, jejich počty ani stupeň zavedení napříč všemi rotami.',
    confidence_cs:'VYSOKÁ pro organizační strukturu; STŘEDNÍ pro vyspělost integrace dronů'
  }))done.push('ENG-UNIT-0008');

  if(setMissing('ENG-UNIT-0009',{
    fact_cs:'PLA Daily z roku 2018 identifikuje pontonový prapor uvnitř ženijní a chemické obranné brigády 73. skupiny armád. Zpráva popisuje přechod od dřívějšího pojetí specializovaného pontonového pluku k mezioborové kombinované ženijní podpoře po reformě.',
    analysis_cs:'Více oficiálních čínských zmínek o jednotkách spolu se dvěma nezávislými analýzami amerických vojenských institucí silně podporují opakující se vzorec ženijních a chemických obranných brigád na úrovni skupin armád PLA.',
    limit_cs:'Historický popis jednotky podporuje směr transformace, ale nedokládá přesnou tabulkovou strukturu a počty pro rok 2026.',
    confidence_cs:'STŘEDNĚ VYSOKÁ pro standardizovaný organizační vzorec; VYSOKÁ pro konkrétně citované příklady'
  }))done.push('ENG-UNIT-0009');

  if(setMissing('ENG-UNIT-0010',{
    fact_cs:'Oficiální článek 81. skupiny armád z roku 2021 výslovně uvádí, že cvičení prověřovalo kvalitu výcviku ženijní čety kombinovaného praporu.',
    analysis_cs:'Dostupný důkaz podporuje existenci organické nebo těsně přidělené bojové ženijní schopnosti na úrovni combined-arms brigade vedle ženijních brigád na úrovni skupiny armád.',
    limit_cs:'Jediný veřejný příklad nedokládá totožnou strukturu ženijní čety ve všech typech combined-arms brigád.'
  }))done.push('ENG-UNIT-0010');

  window.__ENGINEER_PUBLIC_CZ_BATCH_1817__={processed_ids:done,mapped_fields:36,english_preserved:true};
})();
