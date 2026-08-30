(function(){
  'use strict';
  const SCOPE=new Set(['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js']);
  const RUN={base:'engineer-osint-20260826-B95',a:'engineer-osint-20260829-B96',b:'engineer-osint-20260830-B97',c:'engineer-osint-20260830-B98'};
  const OP_PREFIX='ENG-OP-B96-OVL-MIG-';
  const EXPECTED_OPERATION_IDS=Array.from({length:104},(_,i)=>`${OP_PREFIX}${String(i+1).padStart(3,'0')}`);
  const EXPECTED_GAP_IDS=Array.from({length:15},(_,i)=>`ENG-GAP-B97-OVL-${String(i+1).padStart(3,'0')}`);
  const EXPECTED_ASSESSMENT_IDS=Array.from({length:4},(_,i)=>`ENG-ASMT-B98-OVL-${String(i+1).padStart(3,'0')}`);
  const REVIEWED_SOURCES={
    'RICH-SRC-001':'https://www.terremag.defense.gouv.fr/enquetes/zoom-sur/le-sdz-nouveau-systeme-de-depollution-de-zone',
    'RICH-SRC-002':'https://www.defense.gouv.fr/dga/actualites/dga-commande-systeme-franchissement-syfrall',
    'RICH-SRC-003':'https://drdo.gov.in/drdo/en/offerings/products/bridge-layer-tank-blt-arjun',
    'RICH-SRC-004':'https://drdo.gov.in/drdo/en/offerings/products/short-span-bridge-10m',
    'RICH-SRC-005':'https://drdo.gov.in/drdo/en/offerings/technology-foresight/autonomous-systems-and-robotics',
    'RICH-SRC-006':'https://drdo.gov.in/drdo/en/offerings/technology-foresight/ugv',
    'RICH-SRC-007':'https://www.idf.il/en/mini-sites/our-units/combat-engineering-corps/combat-engineering-corps/',
    'RICH-SRC-008':'https://www.idf.il/en/articles/2022/get-to-know-the-yahalom-unit/',
    'RICH-SRC-009':'https://m.www.idf.il/en/mini-sites/our-units/yahalom-unit/yahalom-unit/',
    'RICH-SRC-010':'https://mod.gov.il/en/departments/merkava-and-armored-vehicles-directorate',
    'RICH-SRC-011':'https://mod.gov.il/en/press-releases/press-room/israel-defense-prize-2024-awarded-for-groundbreaking-defense-technologies-that-proved-critical-during-the-swords-of-iron-war',
    'RICH-SRC-012':'https://www.msb.gov.tr/SlaytHaber/cbf794296d9646ba86ad48cde9c729a9',
    'RICH-SRC-013':'https://www.eodcoe.org/en/news/the-68th-eod-wg-meeting.html',
    'RICH-SRC-014':'https://www.army.mil/article/293513/oregon_engineers_test_drone_delivered_breach_capability',
    'RICH-SRC-015':'https://www.europeafrica.army.mil/Innovation/videoid/1012370/dvpmoduleid/104815/dvpTag/drones/'
  };
  const asArray=value=>Array.isArray(value)?value:[];
  const stable=value=>{
    if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  };
  const equal=(a,b)=>stable(a)===stable(b);
  const idOf=item=>item?.id||item?.source_id||item?.evidence_id||item?.assessment_id||item?.gap_id||item?.contradiction_id||item?.relation_id||item?.asset_id||item?.media_id||item?.lead_id||item?.lesson_id;
  const unique=values=>[...new Set(asArray(values).filter(value=>typeof value==='string'&&value))];
  const intersects=(a,b)=>a.some(value=>b.includes(value));
  const collection=(data,name)=>{
    if(name==='records')return asArray(data?.records?.records);
    if(name==='sources')return asArray(data?.sources?.sources);
    if(name==='relations')return asArray(data?.relations?.relations);
    if(name==='evidence')return asArray(data?.evidence?.evidence);
    if(name==='visuals')return asArray(data?.visual_registry?.visuals);
    if(name==='media')return asArray(data?.media_registry?.media);
    if(name==='technology_signals')return asArray(data?.dashboard_patch_extras?.technology_signals);
    if(name==='leads')return asArray(data?.leads?.leads);
    if(name==='observed_minimum')return asArray(data?.dashboard_patch_extras?.observed_minimum_updates);
    if(name==='lessons_learned')return asArray(data?.lessons_learned?.lessons);
    return [];
  };
  const find=(items,id)=>items.find(item=>idOf(item)===id);
  const result=(checks,error=null)=>{
    const failures=checks.filter(item=>!item.pass);
    return {status:failures.length||error?'BLOCKED':'PASS',short_circuit_allowed:failures.length===0&&!error,check_count:checks.length,failed_check_count:failures.length,failures,error};
  };
  function evaluate(data){
    const checks=[];
    const add=(code,pass,detail='')=>checks.push({code,pass:Boolean(pass),detail});
    try{
      add('DATA_PRESENT',Boolean(data));
      add('STATE_LATEST_B98',data?.state_latest?.run_id===RUN.c,`${data?.state_latest?.run_id||'missing'}`);
      add('DASHBOARD_CURRENT_B98',data?.dashboard_materialization?.current_run_id===RUN.c,`${data?.dashboard_materialization?.current_run_id||'missing'}`);
      add('INTELLIGENCE_CURRENT_B98',data?.intelligence_materialization?.status==='ACTIVE'&&data?.intelligence_materialization?.current_run_id===RUN.c,`${data?.intelligence_materialization?.current_run_id||'missing'}`);

      const history=new Map(asArray(data?.run_history?.runs).map(item=>[item?.run_id,item]));
      add('RUN_HISTORY_B96',history.get(RUN.a)?.parent===RUN.base);
      add('RUN_HISTORY_B97',history.get(RUN.b)?.parent===RUN.a);
      add('RUN_HISTORY_B98',history.get(RUN.c)?.parent===RUN.b);

      const sources=collection(data,'sources');
      const sourceMap=new Map(sources.map(item=>[item?.id,item]));
      for(const [id,url] of Object.entries(REVIEWED_SOURCES)){
        const source=sourceMap.get(id);
        add(`SOURCE:${id}`,Boolean(source)&&source.url===url&&source.type==='PRIMARY'&&Number(source.tier)===1,id);
      }

      const log=asArray(data?.canonical_change_log?.operations).filter(item=>item?.run_id===RUN.a);
      const byOperationId=new Map(log.map(item=>[item?.operation_id,item]));
      add('B96_OPERATION_COUNT',log.length===EXPECTED_OPERATION_IDS.length,`${log.length}/${EXPECTED_OPERATION_IDS.length}`);
      add('B96_OPERATION_IDS_EXACT',byOperationId.size===EXPECTED_OPERATION_IDS.length&&EXPECTED_OPERATION_IDS.every(id=>byOperationId.has(id)));
      for(const operationId of EXPECTED_OPERATION_IDS){
        const operation=byOperationId.get(operationId);
        if(!operation){add(`OP:${operationId}`,false,'missing');continue;}
        const target=find(collection(data,operation.collection),operation.target_id);
        add(`OP_KIND:${operationId}`,operation.op==='REPLACE_FIELD');
        add(`OP_TARGET:${operationId}`,Boolean(target),`${operation.collection}:${operation.target_id}`);
        add(`OP_VALUE:${operationId}`,Boolean(target)&&typeof operation.field==='string'&&Object.prototype.hasOwnProperty.call(target,operation.field)&&equal(target[operation.field],operation.value),`${operation.target_id}.${operation.field||'missing'}`);
        const operationSources=unique(operation.source_ids);
        add(`OP_SOURCES:${operationId}`,operationSources.length>0&&operationSources.every(id=>sourceMap.has(id)),operationSources.join(','));
      }

      const gaps=asArray(data?.intelligence_gaps?.gaps),gapMap=new Map(gaps.map(item=>[item?.gap_id||item?.id,item]));
      for(const id of EXPECTED_GAP_IDS){
        const gap=gapMap.get(id);
        add(`GAP:${id}`,Boolean(gap)&&typeof gap.question==='string'&&gap.question.trim().length>0&&asArray(gap.related_ids).length>0&&asArray(gap.sources_checked).length>0&&asArray(gap.sources_checked).every(sourceId=>sourceMap.has(sourceId)),id);
      }

      const evidence=collection(data,'evidence'),evidenceMap=new Map(evidence.map(item=>[item?.evidence_id||item?.id,item]));
      const assessments=asArray(data?.assessments?.assessments),assessmentMap=new Map(assessments.map(item=>[item?.assessment_id||item?.id,item]));
      const assessmentEvidence=[];
      for(const id of EXPECTED_ASSESSMENT_IDS){
        const assessment=assessmentMap.get(id);
        const evidenceIds=unique(assessment?.supporting_evidence_ids);
        const assessmentSources=unique(assessment?.source_ids),assessmentTargets=unique(assessment?.related_ids);
        add(`ASSESSMENT:${id}`,Boolean(assessment)&&typeof assessment.assessment==='string'&&assessment.assessment.trim().length>0&&assessmentSources.length>0&&assessmentTargets.length>0&&evidenceIds.length>0,id);
        let linked=true;
        for(const evidenceId of evidenceIds){
          assessmentEvidence.push(evidenceId);
          const item=evidenceMap.get(evidenceId),itemSources=unique(item?.source_ids),itemTargets=unique(item?.related_ids);
          if(!item||!intersects(assessmentSources,itemSources)||!intersects(assessmentTargets,itemTargets))linked=false;
        }
        add(`ASSESSMENT_EVIDENCE:${id}`,Boolean(assessment)&&linked,id);
      }
      const distinctEvidence=unique(assessmentEvidence);
      add('ASSESSMENT_EVIDENCE_DISTINCT_COUNT',distinctEvidence.length===2,`${distinctEvidence.length}/2`);
      add('ASSESSMENT_EVIDENCE_ALL_PRESENT',distinctEvidence.every(id=>evidenceMap.has(id)));
      return result(checks);
    }catch(error){return result(checks,error instanceof Error?error.message:String(error));}
  }
  const api={
    version:'v4.5.10',
    scope:[...SCOPE],
    evaluate,
    shouldShortCircuit(moduleName,data){
      if(!SCOPE.has(moduleName))return false;
      try{
        const evaluation=evaluate(data);
        api.lastEvaluation={module:moduleName,...evaluation};
        return evaluation.short_circuit_allowed===true;
      }catch(error){
        api.lastEvaluation={module:moduleName,status:'BLOCKED',short_circuit_allowed:false,error:error instanceof Error?error.message:String(error)};
        return false;
      }
    },
    lastEvaluation:null
  };
  window.ENGINEER_OVERLAY_TRANSITION_RUNTIME=api;
})();
