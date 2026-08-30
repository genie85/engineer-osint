import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';
import {PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=parseJsonStrict(readFileSync(join(src,'V459_COMPAT_TRANSITION_POLICY.json'),'utf8'),{source:'v4.5.9 transition policy'});
const stageA=parseJsonStrict(readFileSync(join(dist,'overlay-stage-a-patch-candidate.json'),'utf8'),{source:'Stage A candidate'});
const stageB=parseJsonStrict(readFileSync(join(dist,'overlay-stage-b-gap-patch-candidate.json'),'utf8'),{source:'Stage B candidate'});
const stageC=parseJsonStrict(readFileSync(join(dist,'overlay-stage-c-assessment-evidence-candidate.json'),'utf8'),{source:'Stage C candidate'});
const baseline=parseJsonStrict(readFileSync(join(src,'legacy-runtime-overlay-baseline.json'),'utf8'),{source:'legacy overlay baseline'});
const store=loadCanonicalRunStore({root:src});
const guardCode=readFileSync(join(src,'overlay-transition-runtime-guard.js'),'utf8');
const postprocess=readFileSync(join(src,'postprocess-ui.mjs'),'utf8');
const scope=[...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES];

if(store.report.current_run_id!==policy.persistent_tip_required)throw new Error(`RUNTIME_TRANSITION stale persistent tip: expected ${policy.persistent_tip_required}, got ${store.report.current_run_id}`);
if(JSON.stringify(scope)!==JSON.stringify(policy.scope_modules))throw new Error('RUNTIME_TRANSITION: guarded runtime scope differs from v4.5.9 reviewed scope');
if(scope.includes('data-integrity-identity-fixes.js'))throw new Error('RUNTIME_TRANSITION: identity-fix overlay must never be guarded in this slice');
if(PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file==='overlay-transition-runtime-guard.js')<0)throw new Error('RUNTIME_TRANSITION: runtime guard is not registered');
const guardIndex=PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file==='overlay-transition-runtime-guard.js');
for(const module of scope)if(PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file===module)<=guardIndex)throw new Error(`RUNTIME_TRANSITION: guard must load before ${module}`);
if(!postprocess.includes('catch(_error){skip=false}')||!postprocess.includes('if(skip)return'))throw new Error('RUNTIME_TRANSITION: postprocess wrapper is not fail-safe toward legacy execution');

const overlayHashes={};
for(const module of scope){
  const hash=sha256Text(readFileSync(join(src,module),'utf8')),expected=baseline.modules?.[module]?.file_sha256;
  overlayHashes[module]={actual:hash,expected,unchanged:hash===expected};
  if(hash!==expected)throw new Error(`RUNTIME_TRANSITION: pinned overlay ${module} changed; guard must not rewrite legacy source bytes`);
}

const executeOverlay=(context,module)=>vm.runInContext(readFileSync(join(src,module),'utf8'),context,{filename:module,timeout:3000});
const makeContext=data=>vm.createContext({window:{__ENGINEER_DATA__:data},console});
const installGuard=context=>vm.runInContext(guardCode,context,{filename:'overlay-transition-runtime-guard.js',timeout:3000});
const factualDiff=diff=>diff.filter(item=>!(item.path==='rich_backfill_meta'||item.path.startsWith('rich_backfill_meta.')));
const runSequence=(input,{guarded})=>{
  const data=structuredClone(input),context=makeContext(data),decisions=[];
  if(guarded)installGuard(context);
  for(const module of scope){
    let skip=false;
    if(guarded){
      try{skip=context.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME?.shouldShortCircuit?.(module,context.window.__ENGINEER_DATA__)===true}catch{skip=false}
    }
    decisions.push({module,skip});
    if(!skip)executeOverlay(context,module);
  }
  return {data:context.window.__ENGINEER_DATA__,decisions};
};

// Persistent B95 must be behaviorally identical with and without the installed guard.
const b95Unguarded=runSequence(store.data,{guarded:false});
const b95Guarded=runSequence(store.data,{guarded:true});
const b95ParityDiff=deepDiff(b95Unguarded.data,b95Guarded.data);
const b95OverlayDiff=deepDiff(store.data,b95Unguarded.data);
if(b95ParityDiff.length!==0)throw new Error(`RUNTIME_TRANSITION: B95 guard changed legacy output (${b95ParityDiff.length} leaf differences)`);
if(b95Guarded.decisions.some(item=>item.skip))throw new Error('RUNTIME_TRANSITION: B95 unexpectedly short-circuited a legacy overlay');
if(factualDiff(b95OverlayDiff).length===0)throw new Error('RUNTIME_TRANSITION: B95 baseline unexpectedly has no factual overlay mutations');

// The reviewed hypothetical B96 -> B97 -> B98 state must satisfy the browser guard and make all three overlays no-op.
const afterA=applyStrictPatchToCanonicalData(structuredClone(store.data),stageA);
const afterAB=applyStrictPatchToCanonicalData(structuredClone(afterA),stageB);
const afterABC=applyStrictPatchToCanonicalData(structuredClone(afterAB),stageC);
const b98Guarded=runSequence(afterABC,{guarded:true});
const b98Diff=deepDiff(afterABC,b98Guarded.data);
if(b98Guarded.decisions.length!==3||b98Guarded.decisions.some(item=>!item.skip))throw new Error('RUNTIME_TRANSITION: complete hypothetical B98 did not short-circuit all three overlays');
if(b98Diff.length!==0)throw new Error(`RUNTIME_TRANSITION: guarded hypothetical B98 still mutated data (${b98Diff.length})`);

const idOf=item=>item?.id||item?.source_id||item?.evidence_id||item?.assessment_id||item?.gap_id||item?.asset_id;
const removeById=(items,id)=>{if(!Array.isArray(items))return false;const index=items.findIndex(item=>idOf(item)===id);if(index<0)return false;items.splice(index,1);return true;};
const canonicalCollection=(data,name)=>{
  if(name==='records')return data?.records?.records;
  if(name==='sources')return data?.sources?.sources;
  if(name==='evidence')return data?.evidence?.evidence;
  if(name==='visuals')return data?.visual_registry?.visuals;
  if(name==='relations')return data?.relations?.relations;
  if(name==='media')return data?.media_registry?.media;
  if(name==='technology_signals')return data?.dashboard_patch_extras?.technology_signals;
  if(name==='leads')return data?.leads?.leads;
  if(name==='observed_minimum')return data?.dashboard_patch_extras?.observed_minimum_updates;
  if(name==='lessons_learned')return data?.lessons_learned?.lessons;
  return undefined;
};
const negativeCases=[];
const verifyFallback=(name,mutate)=>{
  const data=structuredClone(afterABC);mutate(data);
  const before=structuredClone(data),result=runSequence(data,{guarded:true});
  const diff=deepDiff(before,result.data),facts=factualDiff(diff);
  const firstDecision=result.decisions[0];
  if(firstDecision?.skip!==false)throw new Error(`RUNTIME_TRANSITION negative case ${name} did not fail closed before first overlay`);
  if(facts.length===0)throw new Error(`RUNTIME_TRANSITION negative case ${name} did not execute observable legacy fallback`);
  negativeCases.push({name,first_overlay_skip:firstDecision.skip,total_mutations:diff.length,factual_mutations:facts.length,decisions:result.decisions});
};
verifyFallback('MISSING_NATIVE_GAP',data=>{const gap=stageB.extensions.intelligence_v1.gaps[0];if(!removeById(data.intelligence_gaps?.gaps,gap.gap_id))throw new Error('could not remove gap');});
verifyFallback('MISSING_NATIVE_ASSESSMENT',data=>{const assessment=stageC.extensions.intelligence_v1.assessments[0];if(!removeById(data.assessments?.assessments,assessment.assessment_id))throw new Error('could not remove assessment');});
verifyFallback('MISSING_NATIVE_EVIDENCE',data=>{const evidence=stageC.evidence[0];if(!removeById(data.evidence?.evidence,evidence.evidence_id))throw new Error('could not remove evidence');});
verifyFallback('MISSING_REVIEWED_SOURCE',data=>{if(!removeById(data.sources?.sources,'RICH-SRC-001'))throw new Error('could not remove source');});
verifyFallback('STAGE_A_FACTUAL_VALUE_DRIFT',data=>{const operation=stageA.extensions.operations_v1[0],items=canonicalCollection(data,operation.collection),target=Array.isArray(items)?items.find(item=>idOf(item)===operation.target_id):null;if(!target)throw new Error('could not find drift target');target[operation.field]='__V4510_FACTUAL_DRIFT__';});
verifyFallback('MISSING_STAGE_A_OPERATION_LOG',data=>{const operation=stageA.extensions.operations_v1[0],items=data.canonical_change_log?.operations;if(!removeById(items,operation.operation_id)){const index=Array.isArray(items)?items.findIndex(item=>item.operation_id===operation.operation_id):-1;if(index<0)throw new Error('could not remove operation log');items.splice(index,1);}});
if(negativeCases.length!==policy.expected.guard_negative_cases)throw new Error(`RUNTIME_TRANSITION: negative suite ${negativeCases.length}/${policy.expected.guard_negative_cases}`);

const output={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-runtime-transition-audit-v1',
  persistent_tip:store.report.current_run_id,hypothetical_tip:afterABC.state_latest?.run_id,
  runtime_guard_installed:true,runtime_guard_fail_safe:true,canonical_write_performed:false,append_run_invoked:false,
  persistent_b95_short_circuit_enabled:false,future_b98_short_circuit_capable:true,safe_to_append:false,safe_to_retire_overlays:false,
  guarded_modules:[...scope],identity_fix_guarded:false,overlay_hashes:overlayHashes,
  b95:{parity_leaf_differences:b95ParityDiff.length,legacy_overlay_factual_leaf_mutations:factualDiff(b95OverlayDiff).length,short_circuited_modules:b95Guarded.decisions.filter(item=>item.skip).length,decisions:b95Guarded.decisions},
  hypothetical_b98:{guarded_modules:b98Guarded.decisions.filter(item=>item.skip).length,total_mutations:b98Diff.length,decisions:b98Guarded.decisions},
  negative_cases_passed:negativeCases.length,negative_cases:negativeCases
};
writeFileSync(join(dist,'overlay-runtime-transition-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.10 — inert runtime transition guard','',
  `Generated: ${output.generated_at}`,
  `Persistent tip: **${output.persistent_tip}**`,
  `Status: **${output.status}**`,'',
  'The browser runtime guard is installed before the first three pinned factual overlays. It is fail-safe toward legacy execution: missing/invalid transition state, a thrown guard error, or any failed content check executes the original overlay. The pinned overlay source files remain byte-identical.','',
  `- Persistent B95 parity differences: **${output.b95.parity_leaf_differences}**`,
  `- Persistent B95 short-circuited modules: **${output.b95.short_circuited_modules}/3**`,
  `- Hypothetical complete B98 short-circuited modules: **${output.hypothetical_b98.guarded_modules}/3**`,
  `- Hypothetical B98 mutations after guarded overlays: **${output.hypothetical_b98.total_mutations}**`,
  `- Negative fail-closed cases passed: **${output.negative_cases_passed}/${policy.expected.guard_negative_cases}**`,
  '- `data-integrity-identity-fixes.js` guarded: **NO**','',
  '## Pinned overlay hashes','',
  ...Object.entries(overlayHashes).map(([module,item])=>`- \`${module}\` — ${item.unchanged?'UNCHANGED':'DRIFT'} — \`${item.actual}\``),'',
  '## Negative cases','',
  ...negativeCases.map(item=>`- ${item.name}: fallback factual mutations=${item.factual_mutations}; first overlay skipped=${item.first_overlay_skip}`),'',
  '## Safety','',
  '- No B96/B97/B98 run is persisted by this audit.',
  '- The current B95 public data path remains behaviorally identical.',
  '- The guard only becomes effective after full native B98 content is present and internally consistent.',
  '- Overlay retirement is still forbidden; a real B96→B97→B98 append and post-persistence parity audit must happen first.'
].join('\n');
writeFileSync(join(dist,'overlay-runtime-transition-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_runtime_transition=pass\noverlay_runtime_transition_guard=installed-fail-safe\noverlay_runtime_transition_b95_parity=pass\noverlay_runtime_transition_b95_short_circuits=0\noverlay_runtime_transition_b98_short_circuits=3\noverlay_runtime_transition_b98_mutations=0\noverlay_runtime_transition_negative_cases=${negativeCases.length}\noverlay_runtime_transition_overlay_hash_drift=0\noverlay_runtime_transition_identity_fix_guarded=0\noverlay_runtime_transition_canonical_writes=0\noverlay_runtime_transition_safe_to_append=0\noverlay_runtime_transition_safe_to_retire=0\n`,'utf8');
console.log(`Runtime transition PASS: B95 parity=0 diff; B95 skips=0/3; hypothetical B98 skips=3/3; B98 mutations=0; negative=${negativeCases.length}/${policy.expected.guard_negative_cases}; overlay hashes unchanged; identity-fix unguarded`);
