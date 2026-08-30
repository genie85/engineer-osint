import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {canonicalDigest,deepDiff} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4536_IDENTITY_FIX_B99_MIRROR_SYNC_READINESS.json'),'utf8'));
const v4533=JSON.parse(readFileSync(join(src,'V4533_IDENTITY_FIX_CANDIDATE_READINESS.json'),'utf8'));
const readiness=JSON.parse(readFileSync(join(src,'V4531_IDENTITY_FIX_MIGRATION_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`IDENTITY_FIX_B99_MIRROR_SYNC: ${message}`)};
const sha256=text=>createHash('sha256').update(text).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const store=loadCanonicalRunStore({root:src});
if(store.report.current_run_id!==policy.expected_parent_run_id||store.report.canonical_sha256!==policy.expected_parent_canonical_sha256)fail('persistent B98 parent anchor drift');
if(policy.candidate_run_id!==v4533.candidate_run_id||policy.expected_parent_run_id!==v4533.expected_parent_run_id)fail('v4.5.33 candidate lineage drift');

execFileSync(process.execPath,[join(src,'build-identity-fix-b99-candidate.mjs')],{stdio:'inherit'});
const historicalPath=join(dist,'identity-fix-b99-candidate.json');
const historicalRaw=readFileSync(historicalPath,'utf8');
if(sha256(historicalRaw)!==policy.historical_v4533_candidate_file_sha256)fail('historical v4.5.33 candidate SHA drift');
const historical=JSON.parse(historicalRaw);
const operations=historical.extensions?.operations_v1||[];
const replaceCount=operations.filter(item=>item.op==='REPLACE_FIELD').length;
const removeCount=operations.filter(item=>item.op==='REMOVE_FIELD').length;
if(operations.length!==policy.expected_operation_count||replaceCount!==policy.expected_replace_field_count||removeCount!==policy.expected_remove_field_count)fail('historical operation scope drift');
if(historical.extensions?.legacy_mirror_sync_v1!==undefined)fail('historical candidate unexpectedly contains mirror sync');

const fields=[...policy.legacy_mirror_sync_fields];
if(policy.legacy_mirror_sync_request_count!==1||policy.legacy_mirror_sync_target_id!=='ENG-TECH-0036')fail('mirror-sync request identity drift');
if(fields.length!==18||new Set(fields).size!==fields.length)fail('mirror-sync field scope must be exactly 18 unique fields');
const protectedFields=new Set(['id','first_seen_run','run_id','last_update_run']);
if(fields.some(field=>protectedFields.has(field)))fail('mirror-sync scope contains protected field');
const expectedFields=['record_role','title_cs','title_en','temporal_status','summary_cs','summary_en','source_ids','evidence_ids','timeline_events','confidence','event_date','date_precision','fact_cs','analysis_cs','mine_action_context','secondary_contexts','classification','translation_status'];
if(!same(fields,expectedFields))fail(`mirror-sync field order/scope drift: ${fields.join(',')}`);

const patch=structuredClone(historical);
patch.continuity={
  ...patch.continuity,
  legacy_mirror_cleanup_required:false,
  legacy_mirror_sync_contract:'V4535_EXPLICIT_FAIL_CLOSED_LEGACY_MIRROR_SYNC',
  legacy_mirror_sync_review:'V4536_EXACT_ENG_TECH_0036_FIELD_SCOPE',
  identity_fix_runtime_removal_authorized:false
};
patch.qa={...patch.qa,mode:'READ_ONLY_IDENTITY_FIX_MIGRATION_WITH_EXACT_LEGACY_MIRROR_SYNC',canonical_write_performed:false};
patch.extensions={
  ...patch.extensions,
  legacy_mirror_sync_v1:{updated_records:[{target_id:policy.legacy_mirror_sync_target_id,fields}]}
};

const overlayCode=readFileSync(join(src,readiness.overlay_file),'utf8');
const runOverlay=data=>{
  const resolved=structuredClone(data),context={window:{__ENGINEER_DATA__:resolved},console};
  vm.runInNewContext(overlayCode,context,{filename:readiness.overlay_file,timeout:3000});
  return resolved;
};
const preOverlay=runOverlay(store.data);
const overlayMutationsBefore=deepDiff(store.data,preOverlay).length;
if(overlayMutationsBefore!==policy.expected_overlay_mutations_before)fail(`pre-candidate overlay mutation count ${overlayMutationsBefore}`);

const result=applyStrictPatchToCanonicalData(store.data,patch);
const afterOverlay=runOverlay(result);
const residual=deepDiff(result,afterOverlay);
const mirrorPrefix='dashboard_patch_extras.updated_records[70].';
const legacyMirrorResidual=residual.filter(change=>change.path.startsWith(mirrorPrefix));
const canonicalResidual=residual.filter(change=>!change.path.startsWith(mirrorPrefix));
if(residual.length!==policy.expected_overlay_mutations_after||legacyMirrorResidual.length!==policy.expected_legacy_mirror_mutations_after||canonicalResidual.length!==policy.expected_canonical_overlay_mutations_after){
  writeFileSync(join(dist,'identity-fix-b99-mirror-sync-residual-diagnostic.json'),JSON.stringify({count:residual.length,legacy_mirror_count:legacyMirrorResidual.length,canonical_count:canonicalResidual.length,residual},null,2)+'\n');
  fail(`post-sync identity overlay residual mismatch total=${residual.length} legacy=${legacyMirrorResidual.length} canonical=${canonicalResidual.length}`);
}

const raw=JSON.stringify(patch,null,2)+'\n';
const candidateFileSha=sha256(raw);
const resultingCanonicalSha=canonicalDigest(result);
if(policy.exact_candidate_file_sha256!==null&&policy.exact_candidate_file_sha256!==candidateFileSha)fail('pinned v4.5.36 candidate file SHA drift');
if(policy.expected_resulting_canonical_sha256!==null&&policy.expected_resulting_canonical_sha256!==resultingCanonicalSha)fail('pinned v4.5.36 resulting canonical SHA drift');
writeFileSync(join(dist,'identity-fix-b99-mirror-sync-candidate.json'),raw,'utf8');
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-b99-mirror-sync-candidate-audit-v1',
  candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,parent_canonical_sha256:policy.expected_parent_canonical_sha256,
  historical_v4533_candidate_file_sha256:policy.historical_v4533_candidate_file_sha256,
  candidate_file_sha256:candidateFileSha,resulting_canonical_sha256:resultingCanonicalSha,
  operation_count:operations.length,replace_field_count:replaceCount,remove_field_count:removeCount,
  legacy_mirror_sync_request_count:1,legacy_mirror_sync_target_id:policy.legacy_mirror_sync_target_id,legacy_mirror_sync_fields:fields,legacy_mirror_sync_field_count:fields.length,
  overlay_mutations_before:overlayMutationsBefore,overlay_mutations_after:residual.length,
  canonical_overlay_mutations_after:canonicalResidual.length,legacy_mirror_mutations_after:legacyMirrorResidual.length,
  canonical_write_performed:false,append_run_write_invoked:false,identity_fix_runtime_removal_authorized:false,legacy_mirror_removal_forbidden:true,
  safe_to_append:false,safe_to_retire_identity_fix_overlay:false
};
writeFileSync(join(dist,'identity-fix-b99-mirror-sync-candidate-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
writeFileSync(join(dist,'identity-fix-b99-mirror-sync-candidate-audit.md'),`# ENGINEER OSINT v4.5.36 — identity-fix B99 + exact mirror sync readiness\n\nStatus: **PASS — dry-run candidate only**\nCandidate: **${report.candidate_run_id}**\nCandidate SHA-256: \`${candidateFileSha}\`\nResulting canonical SHA-256: \`${resultingCanonicalSha}\`\n\n- identity operations: **${operations.length}** (${replaceCount} REPLACE_FIELD + ${removeCount} REMOVE_FIELD)\n- legacy mirror sync requests: **1**\n- mirror target: **${policy.legacy_mirror_sync_target_id}**\n- explicitly synchronized top-level fields: **${fields.length}**\n- identity overlay mutations before candidate: **${overlayMutationsBefore}**\n- residual identity overlay mutations after candidate+sync: **${residual.length}**\n- canonical writes: **0**\n- B99 append authorization: **false**\n- identity overlay retirement authorization: **false**\n`,'utf8');
console.log(`IDENTITY_FIX_B99_MIRROR_SYNC=PASS file_sha=${candidateFileSha} canonical_sha=${resultingCanonicalSha} residual=${residual.length} fields=${fields.length}`);
