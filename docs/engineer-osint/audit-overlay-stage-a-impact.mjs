import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=parseJsonStrict(readFileSync(join(src,'V455_STAGE_A_CANDIDATE.json'),'utf8'),{source:'v4.5.5 policy'});
const preview=parseJsonStrict(readFileSync(join(dist,'overlay-production-migration-preview.json'),'utf8'),{source:'v4.5.4 preview'});
const candidate=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),'utf8'),{source:'Stage A candidate'});
const store=loadCanonicalRunStore({root:src});
if(store.report.current_run_id!==policy.expected_parent_run_id)throw new Error('STAGE_A_IMPACT: current canonical tip changed');
if(candidate.state?.run_id!==policy.candidate_run_id||candidate.state?.parent_run_id!==policy.expected_parent_run_id)throw new Error('STAGE_A_IMPACT: candidate identity mismatch');
if(preview.current_run_id!==policy.expected_parent_run_id)throw new Error('STAGE_A_IMPACT: stale production preview');

const simulated=applyStrictPatchToCanonicalData(structuredClone(store.data),candidate);
const rawToLogical={records:'records',sources:'sources',relations:'relations',evidence:'evidence',visuals:'visuals',media:'media',technology_signals:'technology_signals',leads:'leads',lessons:'lessons_learned',lessons_learned:'lessons_learned'};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const isOverlayMeta=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const residualSignature=(change,before,after)=>{
  const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
  if(!match)return `UNSCOPED|${change.path}`;
  const top=match[1],raw=match[2],index=Number(match[3]),relative=match[4]||'';
  const beforeItem=objectAt(before,top,raw,index),afterItem=objectAt(after,top,raw,index);
  const id=itemId(afterItem)||itemId(beforeItem)||'UNKNOWN';
  const field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');
  return `${rawToLogical[raw]||raw}|${id}|${field}`;
};
const expectedDecision=decision=>[
  'INTELLIGENCE_V1_GAP_OBJECTIZATION_REQUIRED',
  'INTELLIGENCE_V1_ASSESSMENT_LIMITATION_OBJECTIZATION_REQUIRED',
  'INTELLIGENCE_V1_ASSESSMENT_OBJECTIZATION_REQUIRED',
  'UNION_CANONICAL_AND_REVIEWED_SOURCE_IDS',
  'GENERATE_AT_REAL_APPEND_RUN_DATE',
  'DROP_LEGACY_PRESENTATION_STATUS_NO_WRITE',
  'DROP_LEGACY_MIGRATION_NOTE_NO_WRITE',
  'OMIT_NO_CANONICAL_FACTUAL_WRITE',
  'REPLACE_WITH_PRIMARY_SOURCE_PRECISION',
  'NARROW_TO_CURRENT_REVIEWED_SOURCE_SCOPE'
].includes(decision);
const expectedByModule=new Map(policy.scope_modules.map(module=>[module,new Map()]));
for(const item of preview.decisions){
  if(!expectedByModule.has(item.module)||!item.field||!expectedDecision(item.decision))continue;
  expectedByModule.get(item.module).set(`${item.collection}|${item.target_id}|${item.field}`,item.decision);
}

let runtime=simulated;
const modules=[];
const allUnexpected=[];
for(const module of policy.scope_modules){
  const before=structuredClone(runtime),after=structuredClone(runtime);
  const code=readFileSync(join(src,module),'utf8');
  vm.runInNewContext(code,{window:{__ENGINEER_DATA__:after},console},{filename:module,timeout:3000});
  const residual=deepDiff(before,after);
  const meta=residual.filter(item=>isOverlayMeta(item.path));
  const factual=residual.filter(item=>!isOverlayMeta(item.path));
  const signatureMap=new Map();
  for(const change of factual){
    const signature=residualSignature(change,before,after);
    if(!signatureMap.has(signature))signatureMap.set(signature,[]);
    signatureMap.get(signature).push(change.path);
  }
  const expected=expectedByModule.get(module);
  const signatures=[...signatureMap.keys()].sort();
  const unexpected=signatures.filter(signature=>!expected.has(signature));
  const expectedStillResidual=signatures.filter(signature=>expected.has(signature));
  const expectedAlreadySatisfied=[...expected.keys()].filter(signature=>!signatureMap.has(signature)).sort();
  for(const signature of unexpected)allUnexpected.push(`${module}:${signature}`);
  modules.push({
    module,expected_transition_signatures:expected.size,residual_leaf_mutations:residual.length,
    residual_factual_leaf_mutations:factual.length,residual_overlay_meta_leaf_mutations:meta.length,
    residual_signature_count:signatures.length,unexpected_signature_count:unexpected.length,
    expected_still_residual_count:expectedStillResidual.length,expected_already_satisfied_count:expectedAlreadySatisfied.length,
    residual_signatures:signatures,unexpected_signatures:unexpected,
    expected_still_residual:expectedStillResidual.map(signature=>({signature,reason:expected.get(signature),paths:signatureMap.get(signature)})),
    expected_already_satisfied:expectedAlreadySatisfied.map(signature=>({signature,reason:expected.get(signature)}))
  });
  runtime=after;
}
const expectedTransitionSignatures=[...expectedByModule.values()].reduce((sum,map)=>sum+map.size,0);
const residualSignatures=modules.reduce((sum,item)=>sum+item.residual_signature_count,0);
const residualFactualLeafs=modules.reduce((sum,item)=>sum+item.residual_factual_leaf_mutations,0);
const residualMetaLeafs=modules.reduce((sum,item)=>sum+item.residual_overlay_meta_leaf_mutations,0);
const stageB=preview.stage_b?.candidate_count||0;
const retirementReadyAfterStageA=residualSignatures===0&&stageB===0;
const pass=allUnexpected.length===0&&modules.length===policy.scope_modules.length&&retirementReadyAfterStageA===false;
const output={
  generated_at:new Date().toISOString(),status:pass?'PASS':'FAIL',schema_version:'engineer-osint-stage-a-impact-audit-v1',
  candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,parent_canonical_sha256:store.report.canonical_sha256,
  policy:'ALL_POST_STAGE_A_OVERLAY_RESIDUALS_MUST_MAP_TO_REVIEWED_TRANSITION_DEBT',
  canonical_write_performed:false,append_run_invoked:false,safe_to_append:false,safe_to_retire_overlays:false,
  expected_transition_signatures:expectedTransitionSignatures,residual_signature_count:residualSignatures,
  residual_factual_leaf_mutations:residualFactualLeafs,residual_overlay_meta_leaf_mutations:residualMetaLeafs,
  unexpected_signature_count:allUnexpected.length,unexpected_signatures:allUnexpected,
  stage_b_intelligence_candidates:stageB,retirement_ready_after_stage_a:retirementReadyAfterStageA,
  modules
};
writeFileSync(join(dist,'overlay-stage-a-impact-preview.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.5 post-Stage-A overlay impact','',
  `Generated: ${output.generated_at}`,
  `Candidate run: **${output.candidate_run_id}**`,
  `Status: **${output.status}**`,'',
  'The Stage A candidate was applied only in memory. The first three legacy overlays were then re-executed in runtime order. Every remaining factual mutation must match a transition-debt class already reviewed in v4.5.4; any other residual fails this audit.','',
  `- Expected transition signatures: **${expectedTransitionSignatures}**`,
  `- Actual residual signatures: **${residualSignatures}**`,
  `- Residual factual leaf mutations: **${residualFactualLeafs}**`,
  `- Overlay-only metadata leaf mutations: **${residualMetaLeafs}**`,
  `- Unexpected signatures: **${allUnexpected.length}**`,
  `- Stage B Intelligence v1 candidates still pending: **${stageB}**`,
  `- Retirement ready immediately after Stage A: **${retirementReadyAfterStageA?'YES':'NO'}**`,'',
  '| Module | Expected transition signatures | Residual signatures | Residual factual leafs | Already satisfied | Unexpected |','|---|---:|---:|---:|---:|---:|',
  ...modules.map(item=>`| \`${item.module}\` | ${item.expected_transition_signatures} | ${item.residual_signature_count} | ${item.residual_factual_leaf_mutations} | ${item.expected_already_satisfied_count} | ${item.unexpected_signature_count} |`),'',
  '## Residual transition debt','',
  ...modules.flatMap(item=>[
    `### ${item.module}`,'',
    ...(item.expected_still_residual.length?item.expected_still_residual.map(entry=>`- \`${entry.signature}\` — **${entry.reason}**`):['- No factual transition residuals.']),'']),
  '## Safety','',
  '- This audit does not append the candidate or alter the manifest.',
  '- Residuals are not waived; they define the exact work required before retirement.',
  '- Stage B Intelligence v1 objectization and a reviewed overlay transition/no-op mechanism remain required before the first three overlays can reach zero current mutations.'
].join('\n');
writeFileSync(join(dist,'overlay-stage-a-impact-preview.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_stage_a_impact=${pass?'pass':'fail'}\noverlay_stage_a_impact_expected_transition_signatures=${expectedTransitionSignatures}\noverlay_stage_a_impact_residual_signatures=${residualSignatures}\noverlay_stage_a_impact_residual_factual_leafs=${residualFactualLeafs}\noverlay_stage_a_impact_unexpected=${allUnexpected.length}\noverlay_stage_a_impact_stage_b_pending=${stageB}\noverlay_stage_a_impact_retirement_ready=${retirementReadyAfterStageA?1:0}\noverlay_stage_a_impact_canonical_writes=0\n`,'utf8');
console.log(`Stage A impact ${output.status}: expected-transition=${expectedTransitionSignatures}; residual-signatures=${residualSignatures}; factual-leafs=${residualFactualLeafs}; meta-leafs=${residualMetaLeafs}; unexpected=${allUnexpected.length}; stageB=${stageB}; retirement-ready=${retirementReadyAfterStageA?'YES':'NO'}`);
if(!pass)throw new Error(`STAGE_A_IMPACT failed: unexpected=${allUnexpected.length}; retirement-ready=${retirementReadyAfterStageA}`);
await import('./audit-overlay-stage-b-intelligence.mjs');
