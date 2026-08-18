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

  const v=vm.get('ENG-VIS-0009');
  if(v){v.source_ids=[...new Set([...(v.source_ids||[]),'RICH-SRC-014','RICH-SRC-015'])];v.source_url=v.source_url||'https://www.army.mil/article/293513/oregon_engineers_test_drone_delivered_breach_capability';v.last_verified_date='2026-08-17';v.rich_backfill_status='PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION';v.verification_note='Current enrichment re-verifies the official Army article/video and event metadata. It does not substitute caption evidence for a new pixel-level inspection.';}

  D.rich_backfill_meta=D.rich_backfill_meta||{};
  D.rich_backfill_meta.usa_rok={status:'PRESENTATION_ENRICHMENT_PENDING_CANONICALIZATION',entities:['ENG-SIG-0006'],visuals:vm.has('ENG-VIS-0009')?['ENG-VIS-0009']:[],source_ids:['RICH-SRC-014','RICH-SRC-015'],mapping_review_needed:['ENG-UNIT-0014'],not_enriched:['ENG-UNIT-0014 — presentation enrichment quarantined because historical canonical ID mapping remains unresolved.','ENG-EVT-0022 — corresponding primary page was not re-located during this enrichment pass; historical record remains unchanged.']};
})();