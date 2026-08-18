(function(){
  const D=window.__ENGINEER_DATA__; if(!D)return;
  const records=D.records?.records||[];
  const sources=D.sources?.sources||[];
  const visuals=D.visual_registry?.visuals||[];
  const rm=new Map(records.map(x=>[x.id,x]));
  const sm=new Map(sources.map(x=>[x.id,x]));
  const vm=new Map(visuals.map(x=>[x.id||x.asset_id,x]));
  const addSource=s=>{if(!sm.has(s.id)){sm.set(s.id,s);sources.push(s)}};
  const merge=(id,p)=>{const r=rm.get(id);if(!r)return;const q={...p};if(Object.prototype.hasOwnProperty.call(q,'summary')){q.summary_en=q.summary;delete q.summary}Object.assign(r,q);if(q.source_ids)r.source_ids=[...new Set([...(r.source_ids||[]),...q.source_ids])];r.rich_backfill_status='PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION';};

  addSource({id:'RICH-SRC-014',name:'U.S. Army — Soldiers test drone-delivered breach capability',type:'PRIMARY',tier:1,publication_date:'2026-06-25',url:'https://www.army.mil/article/293513/oregon_engineers_test_drone_delivered_breach_capability',lineage:'U.S. Army / Oregon National Guard Public Affairs'});
  addSource({id:'RICH-SRC-015',name:'U.S. Army Europe and Africa / DVIDS — Oregon engineers breach wire obstacle with drone-delivered Bangalore',type:'PRIMARY',tier:1,publication_date:'2026-06-25',url:'https://www.europeafrica.army.mil/Innovation/videoid/1012370/dvpmoduleid/104815/dvpTag/drones/',lineage:'U.S. Army / Oregon National Guard Public Affairs'});
  addSource({id:'RICH-SRC-016',name:'Republic of Korea Ministry of National Defense — 2026 first-half UN Triangular Partnership engineer and medical training completed',type:'PRIMARY',tier:1,publication_date:'2026-06-12',url:'https://mnd.go.kr/bbs/mnd/13000005/DPIM_115268/artclView.do',lineage:'Republic of Korea Ministry of National Defense'});

  merge('ENG-SIG-0006',{
    summary:'U.S. Army / Oregon Army National Guard publicly documented a June 2026 proof-of-concept in which Bravo Company, 741st Brigade Engineer Battalion used a heavy-lift Mule 28 UAS to deliver a live M1A3 Bangalore torpedo against a concertina-wire obstacle at Orchard Combat Training Center, Idaho. The event demonstrates a unit-level experimental breaching TTP intended to reduce Soldier exposure; it is not evidence of Army-wide standardization or fielding.',
    country:'United States',stage:'MILITARY_TESTING',maturity:'MILITARY_TESTING',mine_action_context:'COMBAT_BREACHING',
    technical_profile:'Heavy-lift unmanned aircraft delivery of an engineer breaching charge. The Army article identifies the airframe as the Lorica Technologies Mule 28 and the live charge as an M1A3 Bangalore torpedo.',
    testing_evidence:'On 22 Jun 2026, Bravo Company, 741st Brigade Engineer Battalion, 41st Infantry Brigade Combat Team, conducted inert and live proof-of-concept iterations at Orchard Combat Training Center. The Army article states the live Bangalore was delivered to and detonated against concertina wire, opening a lane.',
    operational_evidence:'MILITARY TESTING only. The source describes annual-training proof-of-concept activity and a planned battalion white paper for the engineer community; it does not establish operational deployment, program-of-record status or Army-wide TTP adoption.',
    why_it_matters:'The experiment combines UAS with a conventional combat-engineering breaching effect to displace personnel from a high-risk obstacle-reduction task. It is also a concrete example of battlefield observations from Ukraine influencing U.S. unit-level engineer innovation.',
    staff_relevance:'Relevant to engineer planning for risk reduction, EW-resilient remote delivery, obstacle reduction and rapid experimentation. Any staff use should distinguish local proof-of-concept from approved Army capability or doctrine.',
    training_relevance:'Useful as a lessons-learned and experimentation case for crawl-walk-run testing, integration of UAS into engineer tasks and explicit evaluation of failure modes under contested-electromagnetic assumptions; not a substitute for approved demolition or UAS procedures.',
    intelligence_gaps:['Whether the battalion white paper was published or accepted by a broader Army engineer organization','Results of follow-on demonstrations and inert-drop iterations','Whether any Army capability developer or acquisition organization adopted the concept','Current status and configuration of Mule 28 prototypes after June 2026','Any approved doctrine/TTP change beyond the originating battalion'],
    last_evidence_date:'2026-06-25',last_verified_date:'2026-08-17',source_ids:['RICH-SRC-014','RICH-SRC-015'],
    claims:[
      {text:'Bravo Company, 741st Brigade Engineer Battalion conducted a proof-of-concept drone-delivered breach against a wire obstacle on 22 Jun 2026 at Orchard Combat Training Center.',classification:'FACT',source_ids:['RICH-SRC-014','RICH-SRC-015']},
      {text:'The Army article identifies the UAS as a Lorica Technologies Mule 28 and the live breaching charge as an M1A3 Bangalore torpedo.',classification:'FACT',source_ids:['RICH-SRC-014']},
      {text:'The live iteration delivered and detonated the Bangalore against concertina wire and opened a lane.',classification:'FACT',source_ids:['RICH-SRC-014']},
      {text:'The event is evidence of unit-level military testing, not Army-wide fielding or standardized TTP.',classification:'INFERENCE',source_ids:['RICH-SRC-014','RICH-SRC-015']},
      {text:'The Army article states that observations from Ukraine were among the inspirations for the concept.',classification:'FACT',source_ids:['RICH-SRC-014']}
    ],provenance_granularity:'CLAIM_LEVEL'
  });

  merge('ENG-UNIT-0014',{
    summary:'ROK Ministry of National Defense publicly identifies Army 1115 Engineer Group as a host location for the 2026 first-half UN Triangular Partnership Program engineer/medical course. The six-week iteration ran from 4 May to 12 Jun 2026 and expanded beyond engineer-equipment training to hazardous-explosive identification and IED threat-management training.',
    country:'Republic of Korea',
    mission:'Publicly documented role as a host for multinational UN peacekeeping-oriented engineer training; the cited release does not define the unit’s complete operational mission or wartime TO&E.',
    organization_profile:'The 2026 UN TPP iteration used 18 instructors from the Republic of Korea, Australia and Japan and 72 trainees from 13 countries. Training was conducted at Army 1115 Engineer Group and the Medical School.',
    training:'The curriculum contained four subjects: engineer-equipment training, hazardous-explosive identification, IED threat management and field medical training.',
    operational_evidence:'TRAINING_EVIDENCE. The source proves use of 1115 Engineer Group as a multinational engineer-training host. It does not prove EOD/EOC certification equivalence, current combat readiness, unit size or full equipment holdings.',
    why_it_matters:'The release provides a current organizational anchor for ROK multinational engineer training and shows explicit coupling of engineer-equipment training with explosive-hazard and IED-threat content in a UN peacekeeping framework.',
    staff_relevance:'Relevant to multinational training design, peacekeeping engineer capacity building and the interface between engineer, explosive-hazard and medical training. It should not be used to infer NATO qualification equivalence without additional evidence.',
    training_relevance:'The 2026 curriculum demonstrates a broader training package than equipment operation alone and may be useful for comparing multinational engineer capacity-building models.',
    intelligence_gaps:['Full peacetime and wartime mission of 1115 Engineer Group','Current battalion/company structure and personnel strength','Organic equipment holdings and operational readiness','Exact qualification standards for hazardous-explosive and IED-threat modules','Whether the unit hosts additional national or multinational courses outside UN TPP'],
    last_evidence_date:'2026-06-12',last_verified_date:'2026-08-17',source_ids:['RICH-SRC-016'],
    claims:[
      {text:'The 2026 first-half UN Triangular Partnership engineer/medical training ran from 4 May to 12 Jun at Army 1115 Engineer Group and the Medical School.',classification:'FACT',source_ids:['RICH-SRC-016']},
      {text:'The 2026 iteration used 18 instructors from Korea, Australia and Japan and 72 trainees from 13 countries.',classification:'FACT',source_ids:['RICH-SRC-016']},
      {text:'The curriculum added hazardous-explosive identification, IED threat management and field medical training to engineer-equipment training.',classification:'FACT',source_ids:['RICH-SRC-016']},
      {text:'The public release does not establish NATO EOD/EOC qualification equivalence or the unit’s complete operational TO&E.',classification:'INFERENCE',source_ids:['RICH-SRC-016']}
    ],provenance_granularity:'CLAIM_LEVEL'
  });

  const v=vm.get('ENG-VIS-0009');
  if(v){v.source_ids=[...new Set([...(v.source_ids||[]),'RICH-SRC-014','RICH-SRC-015'])];v.source_url=v.source_url||'https://www.army.mil/article/293513/oregon_engineers_test_drone_delivered_breach_capability';v.last_verified_date='2026-08-17';v.rich_backfill_status='PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION';v.verification_note='Current enrichment re-verifies the official Army article/video and event metadata. It does not substitute caption evidence for a new pixel-level inspection.';}

  D.rich_backfill_meta=D.rich_backfill_meta||{};
  D.rich_backfill_meta.usa_rok={status:'PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION',entities:['ENG-SIG-0006','ENG-UNIT-0014'],visuals:vm.has('ENG-VIS-0009')?['ENG-VIS-0009']:[],source_ids:['RICH-SRC-014','RICH-SRC-015','RICH-SRC-016'],not_enriched:['ENG-EVT-0022 — corresponding primary page was not re-located during this enrichment pass; historical record remains unchanged.']};
})();