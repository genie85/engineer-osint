const asArray=value=>Array.isArray(value)?value:[];
const idOf=item=>item?.id||item?.source_id||item?.evidence_id||item?.assessment_id||item?.gap_id||item?.contradiction_id||item?.relation_id||item?.asset_id||item?.media_id||item?.lead_id||item?.lesson_id;
const stable=value=>{
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const equal=(a,b)=>stable(a)===stable(b);
const subset=(actual,expected)=>{
  if(Array.isArray(expected))return Array.isArray(actual)&&equal(actual,expected);
  if(expected&&typeof expected==='object')return Boolean(actual)&&typeof actual==='object'&&!Array.isArray(actual)&&Object.entries(expected).every(([key,value])=>Object.hasOwn(actual,key)&&subset(actual[key],value));
  return equal(actual,expected);
};
const collection=(data,name)=>{
  if(name==='records')return asArray(data?.records?.records);
  if(name==='sources')return asArray(data?.sources?.sources);
  if(name==='evidence')return asArray(data?.evidence?.evidence);
  if(name==='relations')return asArray(data?.relations?.relations);
  if(name==='visuals')return asArray(data?.visual_registry?.visuals);
  if(name==='media')return asArray(data?.media_registry?.media);
  if(name==='technology_signals')return asArray(data?.dashboard_patch_extras?.technology_signals);
  if(name==='leads')return asArray(data?.leads?.leads);
  if(name==='observed_minimum')return asArray(data?.dashboard_patch_extras?.observed_minimum_updates);
  if(name==='lessons_learned')return asArray(data?.lessons_learned?.lessons);
  return [];
};
const find=(items,id)=>items.find(item=>idOf(item)===id);

export function evaluateFirstThreeOverlayTransition({data,stageA,stageB,stageC,policy}){
  const checks=[];
  const add=(code,pass,detail='')=>checks.push({code,pass:Boolean(pass),detail});
  const expected=policy?.expected||{};
  const stageAOperations=asArray(stageA?.extensions?.operations_v1);
  const stageASources=asArray(stageA?.sources);
  const stageBGaps=asArray(stageB?.extensions?.intelligence_v1?.gaps);
  const stageCAssessments=asArray(stageC?.extensions?.intelligence_v1?.assessments);
  const stageCEvidence=asArray(stageC?.evidence);

  add('STATE_LATEST_STAGE_C',data?.state_latest?.run_id===policy.stage_c_run_id,`expected ${policy.stage_c_run_id}; got ${data?.state_latest?.run_id||'missing'}`);
  add('CHAIN_STAGE_A',stageA?.state?.run_id===policy.stage_a_run_id&&stageA?.state?.parent_run_id===policy.persistent_tip_required);
  add('CHAIN_STAGE_B',stageB?.state?.run_id===policy.stage_b_run_id&&stageB?.state?.parent_run_id===policy.stage_a_run_id);
  add('CHAIN_STAGE_C',stageC?.state?.run_id===policy.stage_c_run_id&&stageC?.state?.parent_run_id===policy.stage_b_run_id);
  add('COUNT_STAGE_A_OPERATIONS',stageAOperations.length===expected.stage_a_operations,`${stageAOperations.length}/${expected.stage_a_operations}`);
  add('COUNT_STAGE_A_SOURCES',stageASources.length===expected.stage_a_sources,`${stageASources.length}/${expected.stage_a_sources}`);
  add('COUNT_NATIVE_GAPS',stageBGaps.length===expected.native_gaps,`${stageBGaps.length}/${expected.native_gaps}`);
  add('COUNT_NATIVE_ASSESSMENTS',stageCAssessments.length===expected.native_assessments,`${stageCAssessments.length}/${expected.native_assessments}`);
  add('COUNT_NATIVE_EVIDENCE',stageCEvidence.length===expected.native_evidence,`${stageCEvidence.length}/${expected.native_evidence}`);
  add('COUNT_NATIVE_ANALYTICAL',stageBGaps.length+stageCAssessments.length===expected.native_analytical_total,`${stageBGaps.length+stageCAssessments.length}/${expected.native_analytical_total}`);

  const operationLog=asArray(data?.canonical_change_log?.operations);
  const operationIds=new Set(operationLog.map(item=>item?.operation_id));
  for(const operation of stageAOperations){
    const target=find(collection(data,operation.collection),operation.target_id);
    add(`OP_TARGET:${operation.operation_id}`,Boolean(target),`${operation.collection}:${operation.target_id}`);
    if(target)add(`OP_VALUE:${operation.operation_id}`,Object.hasOwn(target,operation.field)&&equal(target[operation.field],operation.value),`${operation.target_id}.${operation.field}`);
    add(`OP_LOG:${operation.operation_id}`,operationIds.has(operation.operation_id));
  }

  const sources=collection(data,'sources');
  for(const source of stageASources){
    const id=idOf(source),actual=find(sources,id);
    add(`SOURCE:${id}`,Boolean(actual)&&subset(actual,source),id);
  }

  const gaps=asArray(data?.intelligence_gaps?.gaps);
  for(const gap of stageBGaps){
    const id=gap.gap_id||gap.id,actual=find(gaps,id);
    add(`GAP:${id}`,Boolean(actual)&&subset(actual,gap),id);
  }

  const evidence=collection(data,'evidence');
  for(const item of stageCEvidence){
    const id=item.evidence_id||item.id,actual=find(evidence,id);
    add(`EVIDENCE:${id}`,Boolean(actual)&&subset(actual,item),id);
  }

  const assessments=asArray(data?.assessments?.assessments);
  for(const assessment of stageCAssessments){
    const id=assessment.assessment_id||assessment.id,actual=find(assessments,id);
    add(`ASSESSMENT:${id}`,Boolean(actual)&&subset(actual,assessment),id);
    if(actual){
      const linkedEvidence=asArray(actual.supporting_evidence_ids).map(evidenceId=>find(evidence,evidenceId)).filter(Boolean);
      const targetMatch=linkedEvidence.some(item=>asArray(item.related_ids).some(target=>asArray(actual.related_ids).includes(target)));
      const sourceMatch=linkedEvidence.some(item=>asArray(item.source_ids).some(source=>asArray(actual.source_ids).includes(source)));
      add(`ASSESSMENT_EVIDENCE_TARGET:${id}`,targetMatch,id);
      add(`ASSESSMENT_EVIDENCE_SOURCE:${id}`,sourceMatch,id);
    }
  }

  const failures=checks.filter(item=>!item.pass);
  return {
    status:failures.length?'BLOCKED':'PASS',
    policy:policy?.policy||null,
    short_circuit_allowed:failures.length===0,
    check_count:checks.length,
    passed_check_count:checks.length-failures.length,
    failed_check_count:failures.length,
    checks,
    failures,
    counts:{
      stage_a_operations:stageAOperations.length,
      stage_a_sources:stageASources.length,
      native_gaps:stageBGaps.length,
      native_assessments:stageCAssessments.length,
      native_evidence:stageCEvidence.length,
      native_analytical:stageBGaps.length+stageCAssessments.length
    }
  };
}
