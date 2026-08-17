(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const now='2026-08-17';
  const records=D.records?.records||[];
  const byId=new Map(records.map(r=>[r.id,r]));
  const src={
    cze15:{id:'ENG-EXTSRC-CZE-0001',name:'15. ženijní pluk | Do armády',publisher:'Ministerstvo obrany ČR / Do armády',url:'https://doarmady.mo.gov.cz/o-armade/poznejte-armadu/utvary-a-posadky/15.-zenijni-pluk',source_class:'PRIMARY_OFFICIAL',role:'ORBAT_CURRENT_PUBLIC_PROFILE',language:'cs'},
    cze151:{id:'ENG-EXTSRC-CZE-0002',name:'151. ženijní prapor | Do armády',publisher:'Ministerstvo obrany ČR / Do armády',url:'https://doarmady.mo.gov.cz/o-armade/poznejte-armadu/utvary-a-posadky/151-zenijni-prapor',source_class:'PRIMARY_OFFICIAL',role:'UNIT_STRUCTURE_AND_CAPABILITY_PROFILE',language:'cs'},
    cze152:{id:'ENG-EXTSRC-CZE-0003',name:'152. ženijní prapor | Do armády',publisher:'Ministerstvo obrany ČR / Do armády',url:'https://doarmady.mo.gov.cz/o-armade/poznejte-armadu/utvary-a-posadky/152-zenijni-prapor',source_class:'PRIMARY_OFFICIAL',role:'UNIT_ROLE_AND_CAPABILITY_PROFILE',language:'cs'},
    cze153:{id:'ENG-EXTSRC-CZE-0004',name:'153. ženijní prapor | Do armády',publisher:'Ministerstvo obrany ČR / Do armády',url:'https://doarmady.mo.gov.cz/o-armade/poznejte-armadu/utvary-a-posadky/153-zenijni-prapor',source_class:'PRIMARY_OFFICIAL',role:'UNIT_HISTORY_AND_SUBORDINATION_PROFILE',language:'cs'},
    cze152tasks:{id:'ENG-EXTSRC-CZE-0005',name:'Úkoly 152. ženijního praporu',publisher:'152. ženijní prapor / AČR',url:'https://152zpr.mo.gov.cz/o-nas/ukoly-152-zenijniho-praporu',source_class:'PRIMARY_OFFICIAL',role:'EOD_ORGANIZATION_AND_TASK_PROFILE',language:'cs'},
    cze152az:{id:'ENG-EXTSRC-CZE-0006',name:'Aktivní záloha 152. žpr',publisher:'152. ženijní prapor / AČR',url:'https://152zpr.mo.gov.cz/aktivni-zaloha-152-zpr',source_class:'PRIMARY_OFFICIAL',role:'WET_GAP_PMS_CAPABILITY_PROFILE',language:'cs'},
    czeEod2021:{id:'ENG-SRC-0267',name:'Čeští pyrotechnici už dostali špičkové vybavení za miliony dolarů',publisher:'Armáda České republiky',url:'https://acr.mo.gov.cz/informacni-servis/zpravodajstvi/cesti-pyrotechnici-uz-dostali-od-usa-spickove-vybaveni-za-miliony-dolaru-227067/',source_class:'PRIMARY_OFFICIAL',role:'HISTORICAL_EOD_EQUIPMENT_SNAPSHOT',language:'cs',publication_date:'2021-04-15'},
    czeAz2022:{id:'ENG-EXTSRC-CZE-0007',name:'Záchranáři u záložáků končí, stane se z nich bojová jednotka',publisher:'Armáda České republiky',url:'https://acr.mo.gov.cz/informacni-servis/zpravodajstvi/zachranari-u-zalozaku-konci--stane-se-z-nich-bojova-jednotka-240164/',source_class:'PRIMARY_OFFICIAL',role:'FORCE_DESIGN_HISTORICAL_CHANGE',language:'cs',publication_date:'2022-11-02'},
    czeRcp2014:{id:'ENG-EXTSRC-CZE-0008',name:'Američtí odborníci školí české ženisty v nové schopnosti - bojový ženista',publisher:'Armáda České republiky',url:'https://acr.mo.gov.cz/informacni-servis/zpravodajstvi/americti-odbornici-skoli-ceske-zenisty-v-nove-schopnosti---bojovy-zenista-98536/',source_class:'PRIMARY_OFFICIAL',role:'RCP_CIED_TRAINING_HISTORICAL',language:'cs',publication_date:'2014-06-03'},
    czeBison2025:{id:'ENG-EXTSRC-CZE-0009',name:'Čeští a rakouští specialisté EOD a vojenského pátrání společně cvičili v rámci Bison readiness 2025',publisher:'Velitelství pozemních sil AČR',url:'https://vepozs.mo.gov.cz/en/node/181',source_class:'PRIMARY_OFFICIAL',role:'EOD_TRAINING_INTEROPERABILITY',language:'cs',publication_date:'2025-09-02'}
  };
  const sourceList=Object.values(src).map(x=>({...x,verified_at:now}));
  D.external_source_registry=D.external_source_registry||{version:'3.6-bootstrap-1',sources:[]};
  const sx=new Map((D.external_source_registry.sources||[]).map(x=>[x.id,x]));
  for(const s of sourceList)sx.set(s.id,{...(sx.get(s.id)||{}),...s});
  D.external_source_registry.sources=[...sx.values()];

  const golden=[
    {id:'ENG-UNIT-0030',role:'CZE_ORBAT_ROOT',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-UNIT-0031',role:'CZE_COMBAT_ENGINEER_4BRN_SUPPORT',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-UNIT-0032',role:'CZE_GENERAL_ENGINEER_EOD_WET_GAP',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-UNIT-0033',role:'CZE_COMBAT_ENGINEER_7MB_SUPPORT',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-TECH-0024',role:'CZE_EOD_ROBOTICS',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-TECH-0027',role:'CZE_PMS_WET_GAP',quality_target:'GOLDEN',priority:'P0'},
    {id:'ENG-TECH-0028',role:'CZE_AM50_BRIDGING',quality_target:'GOLDEN',priority:'P1'},
    {id:'ENG-TECH-0029',role:'CZE_MT55A_BRIDGING',quality_target:'GOLDEN',priority:'P1'},
    {id:'ENG-SIG-0006',role:'UAS_BREACHING_TRANSLATION_CANARY',quality_target:'GOLDEN',priority:'P1'},
    {id:'ENG-UNIT-0019',role:'GERMANY_EOD_INSTITUTION_TRANSLATION_CANARY',quality_target:'GOLDEN',priority:'P1'}
  ];
  D.golden_entities={version:'3.6-bootstrap-1',canonicalization_status:'PRESENTATION_BACKFILL_PENDING_CANONICALIZATION',entities:golden,notes_cs:'Referenční entity pro kontrolu úplnosti datového modelu a UI. Zařazení mezi golden entity samo o sobě nemění faktický obsah.',notes_en:'Reference entities used to test data-model and UI completeness. Golden designation itself does not alter factual content.'};
  for(const g of golden){const r=byId.get(g.id);if(r){r.golden_entity=true;r.golden_role=g.role;r.quality_target=g.quality_target;}}

  const annotate=(id,patch)=>{const r=byId.get(id);if(r)Object.assign(r,patch)};
  annotate('ENG-UNIT-0030',{temporal_status:'CURRENT_CONFIRMED',last_verified_date:now,orbat_role:'REGIMENT_ROOT',orbat_source_url:src.cze15.url});
  annotate('ENG-UNIT-0031',{parent_unit_id:'ENG-UNIT-0030',temporal_status:'CURRENT_CONFIRMED',last_verified_date:now,orbat_source_url:src.cze15.url});
  annotate('ENG-UNIT-0032',{parent_unit_id:'ENG-UNIT-0030',temporal_status:'CURRENT_CONFIRMED',last_verified_date:now,orbat_source_url:src.cze15.url});
  annotate('ENG-UNIT-0033',{parent_unit_id:'ENG-UNIT-0030',temporal_status:'CURRENT_CONFIRMED',last_verified_date:now,orbat_source_url:src.cze15.url});
  annotate('ENG-TECH-0024',{current_value_status:'HISTORICAL_SNAPSHOT_NOT_CURRENT',observed_minimum_status:'HISTORICAL_COUNT_2021',current_quantity:'UNKNOWN',current_quantity_reason:'No public 2026 quantity confirmed in canonical data; 2021 snapshot must not be projected forward.'});
  annotate('ENG-TECH-0027',{current_value_status:'CURRENT_QUANTITY_UNKNOWN',current_quantity:'UNKNOWN',observed_minimum_status:'CAPABILITY_CONFIRMED_QUANTITY_UNRESOLVED'});
  annotate('ENG-TECH-0028',{current_value_status:'CURRENT_QUANTITY_UNKNOWN',current_quantity:'UNKNOWN'});
  annotate('ENG-TECH-0029',{current_value_status:'CURRENT_QUANTITY_UNKNOWN',current_quantity:'UNKNOWN'});

  const rels=[
    {id:'ENG-REL-PB-0001',subject_id:'ENG-UNIT-0030',relation_type:'HAS_SUBORDINATE',object_id:'ENG-UNIT-0031',valid_from:'2025-12-18',valid_to:null,temporal_status:'CURRENT_CONFIRMED',confidence:'HIGH',source_ids:[src.cze15.id],exact_url:src.cze15.url,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-REL-PB-0002',subject_id:'ENG-UNIT-0030',relation_type:'HAS_SUBORDINATE',object_id:'ENG-UNIT-0032',valid_from:'2025-12-18',valid_to:null,temporal_status:'CURRENT_CONFIRMED',confidence:'HIGH',source_ids:[src.cze15.id],exact_url:src.cze15.url,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-REL-PB-0003',subject_id:'ENG-UNIT-0030',relation_type:'HAS_SUBORDINATE',object_id:'ENG-UNIT-0033',valid_from:'2025-12-18',valid_to:null,temporal_status:'CURRENT_CONFIRMED',confidence:'HIGH',source_ids:[src.cze15.id],exact_url:src.cze15.url,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-REL-PB-0004',subject_id:'ENG-UNIT-0032',relation_type:'PUBLIC_CAPABILITY_ASSOCIATION',object_id:'ENG-TECH-0027',valid_from:null,valid_to:null,temporal_status:'CURRENT_PUBLIC_PROFILE',confidence:'HIGH_FOR_CAPABILITY_ASSOCIATION_NOT_QUANTITY',source_ids:[src.cze152az.id],exact_url:src.cze152az.url,scope_cs:'Pontonová rota AZ — zřizování mostových a přívozových přepravišť s PMS.',scope_en:'Reserve pontoon company — bridge and ferry crossing sites using PMS.',canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-REL-PB-0005',subject_id:'ENG-UNIT-0030',relation_type:'HISTORICAL_EQUIPMENT_HOLDING',object_id:'ENG-TECH-0024',valid_from:'2021-04-15',valid_to:null,temporal_status:'HISTORICAL',confidence:'HIGH_FOR_2021_SNAPSHOT',source_ids:[src.czeEod2021.id],exact_url:src.czeEod2021.url,scope_cs:'Historický veřejný snapshot EOD robotů; neprokazuje současný inventář.',scope_en:'Historical public EOD robot snapshot; does not establish current inventory.',canonicalization_status:'PENDING_CANONICALIZATION'}
  ];
  D.relations=D.relations||{version:'3.6-bootstrap-1',relations:[]};
  const rx=new Map((D.relations.relations||[]).map(x=>[x.id,x]));for(const r of rels)rx.set(r.id,{...(rx.get(r.id)||{}),...r});D.relations.relations=[...rx.values()];

  const evid=[
    {id:'ENG-EVID-PB-0001',evidence_type:'OFFICIAL_ORBAT_PROFILE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'15. ženijní pluk je veřejně popsán jako útvar tvořený 151., 152. a 153. ženijním praporem.',what_it_supports_en:'The 15th Engineer Regiment is publicly described as comprising the 151st, 152nd and 153rd Engineer Battalions.',related_ids:['ENG-UNIT-0030','ENG-UNIT-0031','ENG-UNIT-0032','ENG-UNIT-0033'],source_ids:[src.cze15.id],exact_url:src.cze15.url,temporal_status:'CURRENT_PUBLIC_PROFILE',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0002',evidence_type:'OFFICIAL_UNIT_PROFILE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'Veřejný profil 151. žpr uvádí jeho strukturu a schopnosti včetně EOD/IEDD podpory, mostních provizorií, mobility, countermobility a ženijního průzkumu.',what_it_supports_en:'The public 151st Engineer Battalion profile lists its structure and capabilities including EOD/IEDD support, temporary bridging, mobility, countermobility and engineer reconnaissance.',related_ids:['ENG-UNIT-0031'],source_ids:[src.cze151.id],exact_url:src.cze151.url,temporal_status:'CURRENT_PUBLIC_PROFILE',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0003',evidence_type:'OFFICIAL_UNIT_PROFILE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'Veřejný profil 152. žpr uvádí všeobecnou ženijní podporu, mostní práce, odstraňování min, likvidaci nevybuchlé munice, EOD/IEDD a činnosti na vodních překážkách.',what_it_supports_en:'The public 152nd Engineer Battalion profile lists general engineer support, bridging, mine removal, UXO disposal, EOD/IEDD and water-obstacle tasks.',related_ids:['ENG-UNIT-0032'],source_ids:[src.cze152.id],exact_url:src.cze152.url,temporal_status:'CURRENT_PUBLIC_PROFILE',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0004',evidence_type:'OFFICIAL_EOD_ORGANIZATION_PROFILE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'Oficiální stránka úkolů 152. žpr explicitně popisuje rotu EOD a její pyrotechnické úkoly; úplné TO&E a počet týmů z ní nevyplývají.',what_it_supports_en:'The official 152nd Engineer Battalion tasks page explicitly describes an EOD company and its explosive-ordnance tasks; it does not establish full TO&E or team count.',related_ids:['ENG-UNIT-0032'],source_ids:[src.cze152tasks.id],exact_url:src.cze152tasks.url,temporal_status:'CURRENT_PUBLIC_PROFILE',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0005',evidence_type:'OFFICIAL_UNIT_PROFILE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'153. žpr je veřejně uváděn jako součást 15. ženijního pluku, dislokovaná v Olomouci.',what_it_supports_en:'The 153rd Engineer Battalion is publicly listed as part of the 15th Engineer Regiment and based in Olomouc.',related_ids:['ENG-UNIT-0033'],source_ids:[src.cze153.id],exact_url:src.cze153.url,temporal_status:'CURRENT_PUBLIC_PROFILE',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0006',evidence_type:'OFFICIAL_HISTORICAL_EQUIPMENT_SNAPSHOT',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'AČR 15. 4. 2021 veřejně uvedla 22 robotů u 15. ženijního pluku, z toho 6 v HAZMAT konfiguraci; jde pouze o historický snapshot.',what_it_supports_en:'On 15 April 2021 the Czech Armed Forces publicly reported 22 robots at the 15th Engineer Regiment, six in HAZMAT configuration; this is a historical snapshot only.',related_ids:['ENG-UNIT-0030','ENG-TECH-0024'],source_ids:[src.czeEod2021.id],exact_url:src.czeEod2021.url,event_date:'2021-04-15',temporal_status:'HISTORICAL',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0007',evidence_type:'OFFICIAL_FORCE_DESIGN_CHANGE',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'AČR v listopadu 2022 popsala transformaci záchranných rot AZ na roty bojové ženijní podpory u 151. a 153. žpr a pontonovou rotu AZ u 152. žpr.',what_it_supports_en:'In November 2022 the Czech Armed Forces described the transformation of reserve rescue companies into combat engineer support companies at the 151st and 153rd battalions, with a reserve pontoon company at the 152nd battalion.',related_ids:['ENG-UNIT-0031','ENG-UNIT-0032','ENG-UNIT-0033'],source_ids:[src.czeAz2022.id],exact_url:src.czeAz2022.url,event_date:'2022-11-02',temporal_status:'HISTORICAL',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0008',evidence_type:'OFFICIAL_TRAINING_RECORD',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'V roce 2014 byli příslušníci 151. a 153. žpr školeni americkým Mobile Mentoring Team v dismounted Route Clearance Patrol a základních C-IED drilech.',what_it_supports_en:'In 2014 personnel from the 151st and 153rd Engineer Battalions received U.S. Mobile Mentoring Team training in dismounted Route Clearance Patrol and basic C-IED drills.',related_ids:['ENG-UNIT-0031','ENG-UNIT-0033'],source_ids:[src.czeRcp2014.id],exact_url:src.czeRcp2014.url,event_date:'2014-06-03',temporal_status:'HISTORICAL',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-EVID-PB-0009',evidence_type:'OFFICIAL_INTEROPERABILITY_TRAINING_RECORD',evidence_status:'DIRECT_PRIMARY_REPORT',what_it_supports_cs:'Bison Readiness 2025 veřejně doložil součinnost českých a rakouských EOD a vojenských pátracích specialistů včetně prvků 152. a 153. žpr.',what_it_supports_en:'Bison Readiness 2025 publicly documented Czech-Austrian EOD and military-search interoperability involving elements of the 152nd and 153rd Engineer Battalions.',related_ids:['ENG-UNIT-0032','ENG-UNIT-0033'],source_ids:[src.czeBison2025.id],exact_url:src.czeBison2025.url,event_date:'2025-09-02',temporal_status:'HISTORICAL_RECENT',verified_at:now,canonicalization_status:'PENDING_CANONICALIZATION'}
  ];
  D.evidence=D.evidence||{version:'3.6-bootstrap-1',evidence:[]};
  const ex=new Map((D.evidence.evidence||[]).map(x=>[x.id,x]));for(const e of evid)ex.set(e.id,{...(ex.get(e.id)||{}),...e});D.evidence.evidence=[...ex.values()];

  const lessons=[
    {id:'ENG-LL-PB-0001',lesson_type:'OBSERVATION_FORCE_DESIGN_ADAPTATION',official_ll_status:'NOT_OFFICIAL_NATO_LL',title_cs:'AZ ženijního pluku — přechod od záchranné role k bojové ženijní podpoře',title_en:'Engineer regiment reserve — shift from rescue role to combat engineer support',observation_cs:'AČR v roce 2022 veřejně zdůvodnila změnu rolí AZ potřebou vytvořit protějšky profesionálním rotám bojové ženijní podpory a sladit zaměření se závazky vůči NATO a EU.',observation_en:'In 2022 the Czech Armed Forces publicly explained the reserve-role change as a need to mirror professional combat engineer support companies and align with NATO/EU commitments.',evidence_ids:['ENG-EVID-PB-0007'],related_ids:['ENG-UNIT-0031','ENG-UNIT-0032','ENG-UNIT-0033'],dotmlpf_i:['ORGANIZATION','TRAINING','PERSONNEL'],institutionalization_status:'PUBLICLY_DESCRIBED_FORCE_DESIGN_CHANGE',confidence:'HIGH_FOR_DESCRIBED_CHANGE',canonicalization_status:'PENDING_CANONICALIZATION'},
    {id:'ENG-LL-PB-0002',lesson_type:'OBSERVATION_CAPABILITY_DEVELOPMENT',official_ll_status:'NOT_OFFICIAL_NATO_LL',title_cs:'Dismounted RCP/C-IED — doložený výcvikový přenos schopnosti v roce 2014',title_en:'Dismounted RCP/C-IED — documented capability-transfer training in 2014',observation_cs:'Oficiální AČR doložila výcvik 151. a 153. žpr s americkým Mobile Mentoring Team v dismounted RCP, C-IED drilech a práci s detektory. Z veřejného zdroje nelze bez dalšího tvrdit pozdější force-wide institucionalizaci.',observation_en:'Official Czech Armed Forces reporting documented 151st and 153rd Engineer Battalion training with a U.S. Mobile Mentoring Team in dismounted RCP, C-IED drills and detector use. The public source alone does not establish later force-wide institutionalization.',evidence_ids:['ENG-EVID-PB-0008'],related_ids:['ENG-UNIT-0031','ENG-UNIT-0033'],dotmlpf_i:['DOCTRINE','TRAINING','MATERIEL'],institutionalization_status:'UNKNOWN',confidence:'HIGH_FOR_2014_TRAINING_EVENT',canonicalization_status:'PENDING_CANONICALIZATION'}
  ];
  D.lessons_learned=D.lessons_learned||{version:'3.6-bootstrap-1',lessons:[]};
  const lx=new Map((D.lessons_learned.lessons||[]).map(x=>[x.id,x]));for(const l of lessons)lx.set(l.id,{...(lx.get(l.id)||{}),...l});D.lessons_learned.lessons=[...lx.values()];

  D.historical_coverage=D.historical_coverage||{version:'3.6-bootstrap-1',rows:[]};
  const coverageRows=[
    {country:'CZE',capability:'ORGANIZATION',period:'2020-2026',coverage:'MEDIUM_HIGH',basis:'Current official profiles + 2022 force-design change'},
    {country:'CZE',capability:'EOD_CIED',period:'2010-2019',coverage:'MEDIUM',basis:'2014 RCP/C-IED training evidence; other historical EOD records remain incomplete'},
    {country:'CZE',capability:'EOD_CIED',period:'2020-2026',coverage:'MEDIUM',basis:'EOD company public profile, 2021 robot snapshot, 2025 interoperability training; current TO&E and quantities unresolved'},
    {country:'CZE',capability:'BRIDGING_WET_GAP',period:'2020-2026',coverage:'MEDIUM_LOW',basis:'PMS capability association confirmed; current fleet quantity/serviceability unresolved'},
    {country:'CZE',capability:'BRIDGING_LEGACY',period:'1993-2019',coverage:'LOW',basis:'AM-50/MT-55A historical series not yet systematically backfilled'},
    {country:'CZE',capability:'MOBILITY_COUNTERMOBILITY',period:'2020-2026',coverage:'MEDIUM',basis:'Unit roles publicly described; equipment matrices incomplete'},
    {country:'CZE',capability:'DOCTRINE_STANDARDIZATION',period:'2020-2026',coverage:'LOW',basis:'National EOD/EOC/EOR crosswalk remains incomplete'},
    {country:'CZE',capability:'VISUALS_MEDIA',period:'2020-2026',coverage:'LOW_MEDIUM',basis:'Official imagery/media exists but direct visual materialization remains incomplete'}
  ];
  const cx=new Map((D.historical_coverage.rows||[]).map(x=>[[x.country,x.capability,x.period].join('|'),x]));for(const c of coverageRows)cx.set([c.country,c.capability,c.period].join('|'),c);D.historical_coverage.rows=[...cx.values()];

  D.bootstrap_v36={
    version:'3.6-bootstrap-1',
    status:'ACTIVE',
    canonicalization_status:'PRESENTATION_BACKFILL_PENDING_CANONICALIZATION',
    golden_entity_count:golden.filter(g=>byId.has(g.id)).length,
    relation_count:rels.length,
    evidence_count:evid.length,
    lesson_count:lessons.length,
    external_source_count:sourceList.length,
    observed_minimum_audit_ids:['ENG-TECH-0024','ENG-TECH-0027','ENG-TECH-0028','ENG-TECH-0029'],
    next_canonicalization_priority:['ENG-REL-PB-0001','ENG-REL-PB-0002','ENG-REL-PB-0003','ENG-EVID-PB-0001','ENG-EVID-PB-0004','ENG-EVID-PB-0006'],
    qa_notes_cs:['Žádný vztah nebyl vytvořen z pouhé podobnosti názvů.','Historický počet EOD robotů je explicitně oddělen od současného inventáře.','P0 český ORBAT používá pouze veřejně doložené vazby.'],
    qa_notes_en:['No relationship was created from name similarity alone.','Historical EOD robot count is explicitly separated from current inventory.','P0 Czech ORBAT uses only publicly documented relationships.']
  };

  const known=new Set(records.map(r=>r.id));
  const relationOrphans=D.relations.relations.filter(r=>!known.has(r.subject_id)||!known.has(r.object_id)).map(r=>r.id);
  const evidenceOrphans=D.evidence.evidence.filter(e=>(e.related_ids||[]).some(id=>!known.has(id))).map(e=>e.id);
  const sourceKnown=new Set(D.external_source_registry.sources.map(s=>s.id));
  const sourceIssues=[...D.relations.relations,...D.evidence.evidence].filter(x=>(x.source_ids||[]).some(id=>!sourceKnown.has(id)&&id!=='ENG-SRC-0267')).map(x=>x.id);
  D.bootstrap_registry_audit={status:relationOrphans.length||evidenceOrphans.length||sourceIssues.length?'FAIL':'PASS',relation_orphans:relationOrphans,evidence_orphans:evidenceOrphans,source_reference_issues:sourceIssues,checked_at:now};
})();