import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {canonicalDigest,deepDiff} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4536_B99_MIRROR_SYNC_CANDIDATE_READINESS.json'),'utf8'));
const readiness=JSON.parse(readFileSync(join(src,'V4531_IDENTITY_FIX_MIGRATION_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`IDENTITY_FIX_B99_MIRROR_SYNC: ${message}`)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const store=loadCanonicalRunStore({root:src});
if(store.report.current_run_id!==policy.expected_parent_run_id)fail(`persistent tip ${store.report.current_run_id}`);
if(store.report.canonical_sha256!==policy.expected_parent_canonical_sha256)fail('parent canonical SHA drift');

execFileSync(process.execPath,[join(src,'build-identity-fix-b99-candidate.mjs')],{stdio:'inherit'});
const historicalPath=join(dist,'identity-fix-b99-candidate.json');
const historicalRaw=readFileSync(historicalPath,'utf8');
const historicalSha=createHash('sha256').update(historicalRaw).digest('hex');
if(historicalSha!==policy.historical_v4533_candidate_file_sha256)fail(`historical v4.5.33 candidate drift ${historicalSha}`);
const patch=JSON.parse(historicalRaw);
if(patch.state?.run_id!==policy.candidate_run_id||patch.state?.parent_run_id!==policy.expected_parent_run_id)fail('historical candidate lineage drift');
if(patch.extensions?.legacy_mirror_sync_v1!==undefined)fail('historical candidate unexpectedly contains mirror sync');
if((patch.extensions?.operations_v1||[]).length!==policy.expected_operation_count)fail('historical operation count drift');

patch.extensions.legacy_mirror_sync_v1={
  updated_records:[{target_id:policy.sync_target_id,fields:[...policy.sync_fields]}]
};
patch.continuity={
  ...patch.continuity,
  legacy_mirror_sync_contract:'V4535_EXPLICIT_FAIL_CLOSED_LEGACY_UPDATED_RECORDS_MIRROR_SYNC',
  legacy_mirror_cleanup_required:false,
  legacy_mirror_sync_target:policy.sync_target_id,
  legacy_mirror_sync_field_count:policy.sync_fields.length,
  identity_fix_runtime_removal_authorized:false
};
patch.qa={...patch.qa,mode:'READ_ONLY_IDENTITY_FIX_MIGRATION_WITH_EXPLICIT_LEGACY_MIRROR_SYNC'};

const operations=patch.extensions.operations_v1||[];
const replaceCount=operations.filter(item=>item.op==='REPLACE_FIELD').length;
const removeCount=operations.filter(item=>item.op==='REMOVE_FIELD').length;
if(operations.length!==policy.expected_operation_count||replaceCount!==policy.expected_replace_field_count||removeCount!==policy.expected_remove_field_count)fail('operation count drift');
if(new Set(policy.sync_fields).size!==policy.sync_fields.length||policy.sync_fields.length!==18)fail('sync field scope is not exact unique 18');

const overlayCode=readFileSync(join(src,readiness.overlay_file),'utf8');
const runOverlay=data=>{
  const resolved=structuredClone(data);
  vm.runInNewContext(overlayCode,{window:{__ENGINEER_DATA__:resolved},console},{filename:readiness.overlay_file,timeout:3000});
  return resolved;
};
const beforeOverlay=runOverlay(store.data);
const beforeDiff=deepDiff(store.data,beforeOverlay);
if(beforeDiff.length!==policy.expected_overlay_mutations_before)fail(`overlay mutations before ${beforeDiff.length}`);

const result=applyStrictPatchToCanonicalData(store.data,patch);
const afterOverlay=runOverlay(result);
const residual=deepDiff(result,afterOverlay);
const legacyPrefix='dashboard_patch_extras.updated_records[70].';
const legacyResidual=residual.filter(item=>item.path.startsWith(legacyPrefix));
const canonicalResidual=residual.filter(item=>!item.path.startsWith(legacyPrefix));
if(residual.length!==policy.expected_overlay_mutations_after||canonicalResidual.length!==policy.expected_canonical_overlay_mutations_after||legacyResidual.length!==policy.expected_legacy_mirror_mutations_after){
  writeFileSync(join(dist,'identity-fix-b99-mirror-sync-residual-diagnostic.json'),JSON.stringify({residual,canonicalResidual,legacyResidual},null,2)+'\n');
  fail(`post-sync residual total=${residual.length} canonical=${canonicalResidual.length} legacy=${legacyResidual.length}`);
}

const raw=JSON.stringify(patch,null,2)+'\n';
const candidateSha=createHash('sha256').update(raw).digest('hex');
const canonicalSha=canonicalDigest(result);
if(policy.exact_candidate_file_sha256!==null&&candidateSha!==policy.exact_candidate_file_sha256)fail(`candidate hash drift ${candidateSha}`);
if(policy.expected_resulting_canonical_sha256!==null&&canonicalSha!==policy.expected_resulting_canonical_sha256)fail(`canonical hash drift ${canonicalSha}`);
const candidatePath=join(dist,'identity-fix-b99-mirror-sync-candidate.json');
writeFileSync(candidatePath,raw,'utf8');
const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-b99-mirror-sync-candidate-audit-v1',
  candidate_run_id:policy.candidate_run_id,parent_run_id:policy.expected_parent_run_id,parent_canonical_sha256:policy.expected_parent_canonical_sha256,
  historical_v4533_candidate_file_sha256:historicalSha,candidate_file_sha256:candidateSha,resulting_canonical_sha256:canonicalSha,
  operation_count:operations.length,replace_field_count:replaceCount,remove_field_count:removeCount,
  legacy_mirror_sync_request_count:1,legacy_mirror_sync_target_id:policy.sync_target_id,legacy_mirror_sync_fields:[...policy.sync_fields],
  overlay_mutations_before:beforeDiff.length,overlay_mutations_after:residual.length,canonical_overlay_mutations_after:canonicalResidual.length,legacy_mirror_mutations_after:legacyResidual.length,
  canonical_write_performed:false,append_run_write_invoked:false,identity_fix_runtime_removal_authorized:false,
  safe_to_append:false,safe_to_retire_identity_fix_overlay:false
};
writeFileSync(join(dist,'identity-fix-b99-mirror-sync-candidate-audit.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'identity-fix-b99-mirror-sync-candidate-audit.md'),`# ENGINEER OSINT v4.5.36 — B99 identity-fix + legacy mirror-sync candidate\n\nStatus: **PASS — exact review only**\n\n- historical v4.5.33 candidate preserved: \`${historicalSha}\`\n- synced candidate SHA-256: \`${candidateSha}\`\n- resulting canonical SHA-256: \`${canonicalSha}\`\n- operations: **${operations.length}** (${replaceCount} REPLACE_FIELD + ${removeCount} REMOVE_FIELD)\n- mirror sync: **1 target / ${policy.sync_fields.length} fields**\n- identity overlay residual after candidate: **${residual.length}**\n- canonical writes: **0**\n- append authorized: **no**\n- identity overlay retirement authorized: **no**\n`,'utf8');
console.log(`IDENTITY_FIX_B99_MIRROR_SYNC=PASS file_sha=${candidateSha} canonical_sha=${canonicalSha} residual=${residual.length} sync_fields=${policy.sync_fields.length}`);
