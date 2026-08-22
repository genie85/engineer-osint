(function(){
  const D=window.__ENGINEER_DATA__;if(!D)return;
  const ex=D.dashboard_patch_extras||{};
  const sirkoSummaryCs='Ministerstvo obrany Ukrajiny 25. 3. 2025 uvedlo, že SIRKO-S1 patří mezi kodifikované a pořizované pozemní robotické platformy a může nést modulární vybavení pro logistiku, průzkum a některé minové/odminovací úkoly. Záznam zachovává pouze schopnostní úroveň; nepřenáší taktické parametry ani neprojektuje množství nebo rozdělení systému do srpna 2026.';
  const sirkoSummaryEn="On 25 Mar 2025, Ukraine’s Ministry of Defence stated that SIRKO-S1 was among codified and procured ground robotic platforms and could carry modular payloads for logistics, reconnaissance and selected mine/de-mining tasks. The record retains only capability-level information; it does not carry tactical parameters or project quantities/distribution into August 2026.";
  let sirkoFixed=0,neoEvidenceFixed=0,katyushaFixed=0;

  // ENG-TECH-0036 was created in B53 (18 Aug 2026) as SIRKO-S1. B10 on 19 Aug
  // accidentally applied a NEO-1 enrichment to the same ID. Restore the original
  // SIRKO identity and remove only NEO-specific fields introduced by that collision.
  const recordObjects=[...(D.records?.records||[]),...(ex.updated_records||[])];
  for(const x of recordObjects){
    if(!x||x.id!=='ENG-TECH-0036')continue;
    Object.assign(x,{
      type:'ENG-TECH',country:'UKR',record_role:'HISTORICAL_BACKFILL_AND_TECHNOLOGY_ENRICHMENT',
      title_cs:'SIRKO-S1 — ukrajinský modulární pozemní robotický systém pro logistiku, průzkum a ženijní úkoly (veřejný snapshot 2025)',
      title_en:'SIRKO-S1 — Ukrainian modular ground robotic system for logistics, reconnaissance and engineer-related tasks (2025 public snapshot)',
      event_date:'2025-03-25',date_precision:'PUBLICATION_DATE',temporal_status:'HISTORICAL_OFFICIAL_FIELDING_SNAPSHOT',
      summary_cs:sirkoSummaryCs,summary_en:sirkoSummaryEn,
      fact_cs:sirkoSummaryCs,analysis_cs:sirkoSummaryCs,
      mine_action_context:'UNKNOWN_NEEDS_REVIEW',secondary_contexts:['COUNTERMOBILITY_MINE_EMPLACEMENT'],
      source_ids:['ENG-SRC-0372'],evidence_ids:['ENG-EVID-0080'],
      classification:'FACT_ABOUT_2025_OFFICIAL_PLATFORM_STATUS_WITH_SCOPE_LIMIT',confidence:'HIGH_FOR_2025_OFFICIAL_STATUS',
      translation_status:'ANALYST_TRANSLATION'
    });
    delete x.timeline_events;
    delete x.temporal_observations;
    sirkoFixed++;
  }

  // NEO-1 already has its own canonical record ENG-TECH-0032. Preserve the B10
  // certification evidence there rather than on SIRKO-S1.
  const neo=(D.records?.records||[]).find(x=>x?.id==='ENG-TECH-0032');
  if(neo){
    neo.source_ids=[...new Set([...(neo.source_ids||[]),'ENG-SRC-0403'])];
    neo.evidence_ids=[...new Set([...(neo.evidence_ids||[]),'ENG-EVID-0113'])];
  }
  for(const e of [...(D.evidence?.evidence||[]),...(ex.evidence||[])]){
    if(!e||(e.evidence_id||e.id)!=='ENG-EVID-0113')continue;
    e.related_ids=['ENG-TECH-0032'];
    neoEvidenceFixed++;
  }

  // ENG-VIS-0054 originated in B21 (17 Aug 2026) as Katyusha / Flot-2026 media
  // metadata. Restore that identity and remove Czech EOD-gallery fields that were
  // later merged onto this visual by mistake.
  const visualObjects=[...(D.visual_registry?.visuals||[]),...(D.visuals?.visuals||[]),...(ex.visuals||[])];
  for(const v of visualObjects){
    if(!v||(v.asset_id||v.id)!=='ENG-VIS-0054')continue;
    Object.assign(v,{
      related_ids:['ENG-TECH-0025'],source_ids:['ENG-SRC-0239','ENG-SRC-0238'],
      image_page_url:'https://rutube.ru/video/c283841dfaaa8e2e2fe362e23a5aabf8/',direct_image_url:null,
      caption:'TASS Media metadata identifies NRTK «Катюша» at Flot-2026 in Kronstadt.',
      caption_cs:'Metadata TASS Media identifikují NRTK „Katjuša“ na salonu Flot-2026 v Kronštadtu.',
      visual_observation_basis:'MEDIA_METADATA_ONLY',verification_status:'NOT_PIXEL_INSPECTED',
      rights_note:'Link/metadata only; no rehosting.',
      what_it_supports:'Public exhibition of Katyusha platform at Flot-2026.',
      what_it_supports_cs:'Veřejné vystavení platformy Katjuša na salonu Flot-2026.',
      what_it_does_not_prove:'Operational deployment, recipient unit, clearance effectiveness, or production scale.',
      what_it_does_not_prove_cs:'Neprokazuje operační nasazení, konkrétní přijímající jednotku, účinnost odminování ani rozsah výroby.'
    });
    for(const k of ['title_cs','title_en','source_page_url','publication_date','rights_or_license_status','media_type','confidence'])delete v[k];
    katyushaFixed++;
  }

  // Hard regression assertions: fail audit/runtime validation rather than silently
  // allowing either identity collision to return in a later cumulative replay.
  const sirko=(D.records?.records||[]).find(x=>x?.id==='ENG-TECH-0036');
  const neoEvidence=[...(D.evidence?.evidence||[]),...(ex.evidence||[])].find(e=>(e?.evidence_id||e?.id)==='ENG-EVID-0113');
  const katyusha=visualObjects.find(v=>(v?.asset_id||v?.id)==='ENG-VIS-0054');
  if(!sirko||!String(sirko.title_cs||'').startsWith('SIRKO-S1')||!(sirko.source_ids||[]).includes('ENG-SRC-0372')||(sirko.source_ids||[]).some(id=>['ENG-SRC-0312','ENG-SRC-0313','ENG-SRC-0403'].includes(id)))throw new Error('DATA_IDENTITY_ASSERT: ENG-TECH-0036 is not clean SIRKO-S1');
  if(!neo||!(neo.source_ids||[]).includes('ENG-SRC-0403')||!(neo.evidence_ids||[]).includes('ENG-EVID-0113')||!neoEvidence||(neoEvidence.related_ids||[]).length!==1||neoEvidence.related_ids[0]!=='ENG-TECH-0032')throw new Error('DATA_IDENTITY_ASSERT: NEO-1 certification evidence is not bound to ENG-TECH-0032');
  if(!katyusha||(katyusha.related_ids||[]).length!==1||katyusha.related_ids[0]!=='ENG-TECH-0025'||!(katyusha.source_ids||[]).includes('ENG-SRC-0238')||!(katyusha.source_ids||[]).includes('ENG-SRC-0239')||(katyusha.source_ids||[]).includes('ENG-SRC-0289')||!/Катюша|Katyusha/.test(String(katyusha.caption||'')))throw new Error('DATA_IDENTITY_ASSERT: ENG-VIS-0054 is not clean Katyusha / Flot-2026');

  window.__ENGINEER_DATA_IDENTITY_FIX_20260822__={
    sirko_record_fixed:sirkoFixed,
    neo_evidence_rebound:neoEvidenceFixed,
    katyusha_visual_fixed:katyushaFixed,
    assertions:'PASS',
    provenance:{
      'ENG-TECH-0036':'B53 2026-08-18 SIRKO-S1 creation; B10 2026-08-19 NEO-1 wrong-ID enrichment corrected',
      'ENG-VIS-0054':'B21 2026-08-17 Katyusha/Flot-2026 visual identity restored'
    }
  };
})();
