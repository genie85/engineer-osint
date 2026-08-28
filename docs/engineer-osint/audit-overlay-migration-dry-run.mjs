import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('OVERLAY_MIGRATION_DRY_RUN: ENGINEER_DATA marker missing');
const canonical=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});
const map=parseJsonStrict(readFileSync(join(dist,'overlay-migration-map.json'),'utf8'),{source:'overlay migration map'});
if(map.status!=='PASS'||map.schema_version!=='engineer-osint-overlay-migration-map-v1')throw new Error('OVERLAY_MIGRATION_DRY_RUN: migration map is not valid');
if(map.current_run_id!==canonical.state_latest?.run_id)throw new Error('OVERLAY_MIGRATION_DRY_RUN: migration map run does not match built canonical run');

const rawToLogical={
  materialized_records:'records',records:'records',new_records:'records',updated_records:'records',
  sources:'sources',relations:'relations',new_relations:'relations',updated_relations:'relations',
  evidence:'evidence',new_evidence:'evidence',updated_evidence:'evidence',
  visuals:'visuals',new_visuals:'visuals',media:'media',new_media:'media',technology_signals:'technology_signals',
  external_leads:'leads',updated_external_leads:'leads',lead_updates:'leads',leads:'leads',
  observed_minimum:'observed_minimum',observed_minimum_updates:'observed_minimum',
  lessons:'lessons_learned',lessons_learned:'lessons_learned',lessons_learned_changes:'lessons_learned',
  assessments:'assessments',gaps:'gaps',contradictions:'contradictions'
};
const canonicalLocations=new Set([
  'records.records','sources.sources','relations.relations','evidence.evidence','visual_registry.visuals','media_registry.media',
  'dashboard_patch_extras.technology_signals','leads.leads','dashboard_patch_extras.observed_minimum_updates','lessons_learned.lessons',
  'assessments.assessments','intelligence_gaps.gaps','contradictions.contradictions'
]);
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id||item?.assessment_id||item?.gap_id||item?.contradiction_id;
const isMetaPath=path=>path==='rich_backfill_meta'||path.startsWith('rich_backfill_meta.');
const candidateSignature=item=>`${item.logical_collection||item.raw_collection||'UNKNOWN'}|${item.target_id||'UNKNOWN'}|${item.field||item.action||'WHOLE_ITEM'}`;
const parseResidualPath=path=>{
  const match=path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
  if(!match)return null;
  return {top:match[1],raw:match[2],index:Number(match[3]),relative:match[4]||'',location:`${match[1]}.${match[2]}`};
};
const residualClass=change=>{
  if(isMetaPath(change.path))return 'OVERLAY_META';
  const parsed=parseResidualPath(change.path);
  if(!parsed)return 'UNSCOPED';
  return canonicalLocations.has(parsed.location)?'CANONICAL':'LEGACY_OR_DERIVED_MIRROR';
};
const residualSignature=(change,before,after)=>{
  const parsed=parseResidualPath(change.path);
  if(!parsed)return `UNSCOPED|${change.path}`;
  const {top,raw,index,relative}=parsed;
  const beforeItem=objectAt(before,top,raw,index),afterItem=objectAt(after,top,raw,index);
  const id=itemId(afterItem)||itemId(beforeItem)||'UNKNOWN';
  const field=relative.match(/^([^.[]+)/)?.[1]||(beforeItem===undefined?'APPEND_ITEM':afterItem===undefined?'RETRACT_ITEM':'WHOLE_ITEM');
  return `${rawToLogical[raw]||raw}|${id}|${field}`;
};
const counts=({operations,sources})=>({
  CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,
  NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:operations.length,CONTRADICTION:0,LEAD:0,
  NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,
  NEW_SOURCES:sources.length,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0
});
const patchFor=(moduleIndex,module,candidates,parentRunId)=>{
  const append=candidates.filter(item=>item.route==='STRICT_COLLECTION_APPEND');
  const unsupportedAppend=append.filter(item=>item.logical_collection!=='sources');
  if(unsupportedAppend.length)throw new Error(`OVERLAY_MIGRATION_DRY_RUN: ${module} has unsupported non-source strict append candidates`);
  const sources=append.map(item=>{
    if(item.payload?.present!==true||!item.payload.value)throw new Error(`OVERLAY_MIGRATION_DRY_RUN: ${module} append candidate ${item.target_id} has no payload`);
    return structuredClone(item.payload.value);
  });
  const operationCandidates=candidates.filter(item=>item.route==='OPERATIONS_V1_REPLACE_FIELD'||item.route==='OPERATIONS_V1_RETRACT');
  const operations=operationCandidates.map((item,index)=>{
    if(!Array.isArray(item.source_id_hints)||item.source_id_hints.length===0)throw new Error(`OVERLAY_MIGRATION_DRY_RUN: ${module} candidate ${candidateSignature(item)} has no supporting source hint`);
    const operation={
      operation_id:`ENG-OP-DRYRUN-V452-${moduleIndex+1}-${String(index+1).padStart(3,'0')}`,
      op:item.route==='OPERATIONS_V1_RETRACT'?'RETRACT':'REPLACE_FIELD',
      collection:item.logical_collection,
      target_id:item.target_id,
      reason:'Synthetic v4.5.2 structural equivalence dry-run only',
      source_ids:[...item.source_id_hints]
    };
    if(operation.op==='REPLACE_FIELD'){
      if(!item.field||item.after_value?.present!==true)throw new Error(`OVERLAY_MIGRATION_DRY_RUN: invalid replace candidate ${candidateSignature(item)}`);
      operation.field=item.field;operation.value=structuredClone(item.after_value.value);
    }
    return operation;
  });
  const runId=`engineer-osint-20991231-B${9901+moduleIndex}`;
  const second=moduleIndex*2;
  return {
    runId,
    patch:{
      schema_version:'engineer-osint-patch-v1',
      state:{
        run_id:runId,parent_run_id:parentRunId,status:'SUCCESS',
        window_from:`2099-12-31T00:00:${String(second).padStart(2,'0')}Z`,
        window_to:`2099-12-31T00:00:${String(second+1).padStart(2,'0')}Z`,
        counts:counts({operations,sources})
      },
      continuity:{status:'SYNTHETIC_DRY_RUN_ONLY'},
      true_delta:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0},
      new_records:[],updated_records:[],sources,relations:[],evidence:[],visuals:[],media:[],technology_signals:[],
      lead_updates:[],observed_minimum_updates:[],lessons_learned:[],qa:{status:'SYNTHETIC_DRY_RUN_ONLY'},
      extensions:{operations_v1:operations}
    },
    operationCount:operations.length,sourceAppendCount:sources.length
  };
};

let simulated=structuredClone(canonical),parentRunId=canonical.state_latest?.run_id;
const moduleReports=[];
let fatal=null;
for(const [moduleIndex,[,file]] of LEGACY_FACTUAL_OVERLAY_MODULES.entries()){
  const candidates=map.candidates.filter(item=>item.module===file);
  const manualCandidates=candidates.filter(item=>!['OPERATIONS_V1_REPLACE_FIELD','OPERATIONS_V1_RETRACT','STRICT_COLLECTION_APPEND'].includes(item.route));
  const expectedManual=new Set(manualCandidates.map(candidateSignature));
  const report={
    module:file,candidate_count:candidates.length,manual_candidate_count:manualCandidates.length,
    expected_manual_signatures:[...expectedManual].sort(),strict_patch_status:'PENDING'
  };
  try{
    const built=patchFor(moduleIndex,file,candidates,parentRunId);
    report.synthetic_run_id=built.runId;
    report.operation_count=built.operationCount;
    report.strict_source_append_count=built.sourceAppendCount;
    simulated=applyStrictPatchToCanonicalData(simulated,built.patch);
    parentRunId=built.runId;
    report.strict_patch_status='PASS';

    const beforeProbe=structuredClone(simulated),afterProbe=structuredClone(simulated);
    const code=readFileSync(join(src,file),'utf8');
    vm.runInNewContext(code,{window:{__ENGINEER_DATA__:afterProbe},console},{filename:file,timeout:3000});
    const residual=deepDiff(beforeProbe,afterProbe);
    const meta=residual.filter(item=>residualClass(item)==='OVERLAY_META');
    const canonicalResidual=residual.filter(item=>residualClass(item)==='CANONICAL');
    const mirrorResidual=residual.filter(item=>residualClass(item)==='LEGACY_OR_DERIVED_MIRROR');
    const unscopedResidual=residual.filter(item=>residualClass(item)==='UNSCOPED');
    const canonicalSignatures=[...new Set(canonicalResidual.map(item=>residualSignature(item,beforeProbe,afterProbe)))].sort();
    const mirrorSignatures=[...new Set(mirrorResidual.map(item=>residualSignature(item,beforeProbe,afterProbe)))].sort();
    const unscopedSignatures=[...new Set(unscopedResidual.map(item=>residualSignature(item,beforeProbe,afterProbe)))].sort();
    const unexpectedCanonical=canonicalSignatures.filter(signature=>!expectedManual.has(signature));
    const expectedStillResidual=[...expectedManual].filter(signature=>canonicalSignatures.includes(signature)).sort();
    const expectedAlreadySatisfied=[...expectedManual].filter(signature=>!canonicalSignatures.includes(signature)).sort();
    report.residual_leaf_mutations=residual.length;
    report.residual_canonical_leaf_mutations=canonicalResidual.length;
    report.residual_legacy_mirror_leaf_mutations=mirrorResidual.length;
    report.residual_meta_mutations=meta.length;
    report.residual_unscoped_leaf_mutations=unscopedResidual.length;
    report.canonical_residual_signatures=canonicalSignatures;
    report.legacy_mirror_residual_signatures=mirrorSignatures;
    report.unscoped_residual_signatures=unscopedSignatures;
    report.unexpected_residual_signatures=[...unexpectedCanonical,...unscopedSignatures];
    report.expected_manual_still_residual=expectedStillResidual;
    report.expected_manual_already_satisfied=expectedAlreadySatisfied;
    report.canonical_residual_paths=canonicalResidual.map(item=>item.path).sort();
    report.legacy_mirror_residual_paths=mirrorResidual.map(item=>item.path).sort();
    report.unscoped_residual_paths=unscopedResidual.map(item=>item.path).sort();
    if(report.unexpected_residual_signatures.length)report.result='STRUCTURAL_EQUIVALENCE_FAILED_UNEXPECTED_CANONICAL_RESIDUAL';
    else if(canonicalResidual.length===0&&manualCandidates.length===0&&mirrorResidual.length===0)report.result='STRUCTURALLY_EQUIVALENT_PENDING_PROVENANCE_REVIEW';
    else if(canonicalResidual.length===0&&manualCandidates.length===0&&mirrorResidual.length>0)report.result='CANONICALLY_EQUIVALENT_WITH_LEGACY_MIRROR_DEBT';
    else if(mirrorResidual.length>0)report.result='STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS_WITH_MIRROR_DEBT';
    else report.result='STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS';
  }catch(error){
    report.strict_patch_status='FAIL';report.result='STRICT_PATCH_DRY_RUN_FAILED';report.error=error.message;
    fatal=error;moduleReports.push(report);break;
  }
  moduleReports.push(report);
}

const unexpectedResiduals=moduleReports.reduce((n,item)=>n+(item.unexpected_residual_signatures?.length||0),0);
const mirrorResidualSignatures=moduleReports.reduce((n,item)=>n+(item.legacy_mirror_residual_signatures?.length||0),0);
const mirrorResidualLeafs=moduleReports.reduce((n,item)=>n+(item.residual_legacy_mirror_leaf_mutations||0),0);
const exactModules=moduleReports.filter(item=>item.result==='STRUCTURALLY_EQUIVALENT_PENDING_PROVENANCE_REVIEW').length;
const canonicalEquivalentWithMirrorDebt=moduleReports.filter(item=>item.result==='CANONICALLY_EQUIVALENT_WITH_LEGACY_MIRROR_DEBT').length;
const partialModules=moduleReports.filter(item=>item.result==='STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS'||item.result==='STRUCTURALLY_EQUIVALENT_EXCEPT_MANUAL_FIELDS_WITH_MIRROR_DEBT').length;
const mirrorDebtModules=moduleReports.filter(item=>(item.residual_legacy_mirror_leaf_mutations||0)>0).length;
const failedModules=moduleReports.filter(item=>item.result?.includes('FAILED')).length;
const operationCount=moduleReports.reduce((n,item)=>n+(item.operation_count||0),0);
const sourceAppendCount=moduleReports.reduce((n,item)=>n+(item.strict_source_append_count||0),0);
const manualCount=moduleReports.reduce((n,item)=>n+item.manual_candidate_count,0);
const expectedModuleCount=LEGACY_FACTUAL_OVERLAY_MODULES.length;
const pass=!fatal&&moduleReports.length===expectedModuleCount&&failedModules===0&&unexpectedResiduals===0;
const output={
  generated_at:new Date().toISOString(),status:pass?'PASS':'FAIL',schema_version:'engineer-osint-overlay-migration-dry-run-v1',
  current_run_id:map.current_run_id,canonical_sha256:map.canonical_sha256,
  policy:'IN_MEMORY_STRICT_PATCH_EQUIVALENCE_NO_CANONICAL_WRITE',
  residual_policy:'CANONICAL_RESIDUALS_BLOCK_MIGRATION_MIRROR_RESIDUALS_REMAIN_SEPARATE_DEBT',
  canonical_write_performed:false,append_run_invoked:false,safe_to_append:false,safe_to_retire_overlays:false,
  provenance_note:'Structural equivalence does not prove that source hints support each migrated value. Every operation and source append still requires independent provenance review before a real canonical run.',
  mirror_note:'Residual mutations outside the authoritative canonical collection locations are reported as legacy/derived mirror debt. They do not prove a canonical-value mismatch, but they must still be resolved or proven presentation-irrelevant before overlay retirement.',
  module_count:moduleReports.length,exact_equivalence_modules:exactModules,canonical_equivalent_with_mirror_debt_modules:canonicalEquivalentWithMirrorDebt,
  partial_manual_modules:partialModules,legacy_mirror_debt_modules:mirrorDebtModules,failed_modules:failedModules,
  operation_candidates_exercised:operationCount,strict_source_appends_exercised:sourceAppendCount,manual_candidates:manualCount,
  unexpected_residual_signatures:unexpectedResiduals,legacy_mirror_residual_signatures:mirrorResidualSignatures,
  legacy_mirror_residual_leaf_mutations:mirrorResidualLeafs,modules:moduleReports
};
writeFileSync(join(dist,'overlay-migration-dry-run.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.2 strict migration dry-run','',
  `Generated: ${output.generated_at}`,
  `Current canonical run: **${output.current_run_id}**`,
  `Status: **${output.status}**`,'',
  'This is an in-memory structural equivalence test. It does not create or append a canonical run, alter the manifest, write source data, or authorize retirement.','',
  `- Exact structural equivalence modules: **${exactModules}**`,
  `- Canonically equivalent modules with legacy mirror debt: **${canonicalEquivalentWithMirrorDebt}**`,
  `- Partial modules with mapped manual residuals: **${partialModules}**`,
  `- Modules with legacy/derived mirror debt: **${mirrorDebtModules}**`,
  `- Failed modules: **${failedModules}**`,
  `- operations_v1 candidates exercised: **${operationCount}**`,
  `- strict source appends exercised: **${sourceAppendCount}**`,
  `- manual candidates: **${manualCount}**`,
  `- unexpected canonical/unscoped residual signatures: **${unexpectedResiduals}**`,
  `- legacy mirror residual signatures: **${mirrorResidualSignatures}**`,
  `- legacy mirror residual leaf mutations: **${mirrorResidualLeafs}**`,'',
  '| Module | Ops | Sources | Manual | Canonical residual leafs | Mirror residual leafs | Unexpected | Result |','|---|---:|---:|---:|---:|---:|---:|---|',
  ...moduleReports.map(item=>`| \`${item.module}\` | ${item.operation_count||0} | ${item.strict_source_append_count||0} | ${item.manual_candidate_count} | ${item.residual_canonical_leaf_mutations??'—'} | ${item.residual_legacy_mirror_leaf_mutations??'—'} | ${item.unexpected_residual_signatures?.length??'—'} | \`${item.result}\` |`),'',
  '## Manual canonical residuals','',
  ...moduleReports.filter(item=>item.manual_candidate_count).flatMap(item=>[
    `### ${item.module}`,'',
    ...(item.expected_manual_still_residual?.length?item.expected_manual_still_residual.map(value=>`- residual: \`${value}\``):['- No mapped manual candidate remained in an authoritative canonical collection after strict-patch materialization.']),
    ...(item.expected_manual_already_satisfied?.length?item.expected_manual_already_satisfied.map(value=>`- already satisfied in authoritative canonical collections: \`${value}\``):[]),'']),
  '## Legacy / derived mirror debt','',
  ...moduleReports.filter(item=>(item.residual_legacy_mirror_leaf_mutations||0)>0).flatMap(item=>[
    `### ${item.module}`,'',
    ...item.legacy_mirror_residual_signatures.map(value=>`- signature: \`${value}\``),'',
    ...item.legacy_mirror_residual_paths.map(value=>`  - path: \`${value}\``),'']),
  'Mirror residuals are not ignored: they are separated from canonical equivalence because some legacy collections are historical/derived rather than authoritative. They remain a retirement blocker until public-output comparison or explicit mirror cleanup proves them safe.','',
  '## Provenance gate','',
  output.provenance_note
].join('\n');
writeFileSync(join(dist,'overlay-migration-dry-run.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_migration_dry_run=${pass?'pass':'fail'}\noverlay_migration_dry_run_exact_modules=${exactModules}\noverlay_migration_dry_run_canonical_equivalent_mirror_debt=${canonicalEquivalentWithMirrorDebt}\noverlay_migration_dry_run_partial_modules=${partialModules}\noverlay_migration_dry_run_mirror_debt_modules=${mirrorDebtModules}\noverlay_migration_dry_run_failed_modules=${failedModules}\noverlay_migration_dry_run_operations=${operationCount}\noverlay_migration_dry_run_source_appends=${sourceAppendCount}\noverlay_migration_dry_run_manual=${manualCount}\noverlay_migration_dry_run_unexpected_residuals=${unexpectedResiduals}\noverlay_migration_dry_run_mirror_residual_signatures=${mirrorResidualSignatures}\noverlay_migration_dry_run_mirror_residual_leafs=${mirrorResidualLeafs}\noverlay_migration_dry_run_canonical_writes=0\noverlay_migration_dry_run_safe_to_retire=0\n`,'utf8');
console.log(`Overlay migration dry-run ${output.status}: exact=${exactModules}; canonical+mirror=${canonicalEquivalentWithMirrorDebt}; partial=${partialModules}; mirror-debt=${mirrorDebtModules}; failed=${failedModules}; ops=${operationCount}; sources=${sourceAppendCount}; manual=${manualCount}; unexpected-canonical=${unexpectedResiduals}; mirror-signatures=${mirrorResidualSignatures}; mirror-leafs=${mirrorResidualLeafs}`);
if(!pass)throw new Error(`OVERLAY_MIGRATION_DRY_RUN failed${fatal?`: ${fatal.message}`:''}`);
