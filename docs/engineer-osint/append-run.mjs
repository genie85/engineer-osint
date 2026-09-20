import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {canonicalDigest,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';

import {closeSync,constants as fsConstants,fstatSync,lstatSync,openSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,normalize,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertB106GuardState} from './lib/canonical-hardening-successor.mjs';
export const B106=Object.freeze({
  "root": "docs/engineer-osint",
  "candidate": "docs/engineer-osint/osint-publication-candidates/v4653-b106-wave3-v4588-local-images-public-cz.json",
  "authorization": "docs/engineer-osint/B106_STRICT_APPEND_AUTHORIZATION_20260920.json",
  "readiness": "docs/engineer-osint/B106_APPEND_READINESS_REVIEW_20260919.json",
  "guard": "docs/engineer-osint/B106_GUARD_SUCCESSOR_AUTHORIZATION_20260920.json",
  "run": "engineer-osint-20260904-B106",
  "parent": "engineer-osint-20260904-B105",
  "base": "b14f8a45d445d3cb7dd410f6e66418bf1786e26c",
  "tree": "49cd7eb604ce8fc1cf5780c042c13f9c8b9bf59f",
  "candidate_sha256": "56b4896445fd48d201c38a6d807a6600f7fc407f5a1d880c969f579029b6fc76",
  "candidate_blob": "e578ed3ea06ed0e67dfec7a1b2b979a0b2c418b1",
  "readiness_sha256": "9093e54d76b1ee3e3f45125294b4d17db1ff23c781ba52ed160493481490ee7e",
  "readiness_blob": "fb3a24998c99257b2e673b47e6b3edd818fd7807",
  "readiness_canonical": "dc9e6416e6d2e583fe55e4dd73fb422eb13f850181492fc289e8b1af3da76b33",
  "parent_canonical": "a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9",
  "result_canonical": "7dbaa365cadfd690278e5ce085092e99d53828175525ef8ee0779121b6836396",
  "counts": {
    "new_records": 0,
    "updated_records": 2,
    "sources": 0,
    "relations": 0,
    "evidence": 0,
    "visuals": 2,
    "media": 0,
    "technology_signals": 0,
    "lead_updates": 0,
    "observed_minimum_updates": 0,
    "lessons_learned": 0
  },
  "cards": [
    "ENG-TECH-0038",
    "ENG-TECH-0041"
  ],
  "visuals": [
    "ENG-VIS-LOCAL-0038",
    "ENG-VIS-LOCAL-0041"
  ],
  "outputs": [
    "docs/engineer-osint/data/runs/engineer-osint-20260904-B106.json",
    "docs/engineer-osint/data/run-store-manifest.json"
  ]
});
const LEGACY=[
  {
    "path": "docs/engineer-osint/V4604_B103_LOCAL_IMAGE_APPEND_AUTHORIZATION.json",
    "schema": "engineer-osint-b103-local-image-append-authorization-v1",
    "run": "engineer-osint-20260902-B103",
    "candidate": "docs/engineer-osint/osint-publication-candidates/v4603-b103-local-images.json",
    "sha256": "569449b62c635f41b3d8dc6132a27d2a1cbc9a3f0bcf5b0832bc2edb1bafda05"
  },
  {
    "path": "docs/engineer-osint/V4619_B103_PUBLIC_CZ_APPEND_AUTHORIZATION.json",
    "schema": "engineer-osint-b103-public-cz-append-authorization-v1",
    "run": "engineer-osint-20260902-B103",
    "candidate": "docs/engineer-osint/osint-publication-candidates/v4616-b103-local-images-public-cz.json",
    "sha256": "09a94a018a8f03d1a2efd22399fdfc16f034cd230ec3a186181e9d39a210d08d"
  },
  {
    "path": "docs/engineer-osint/V4643_B104_WAVE2_LOCAL_IMAGE_APPEND_AUTHORIZATION.json",
    "schema": "engineer-osint-b104-wave2-local-image-append-authorization-v1",
    "run": "engineer-osint-20260903-B104",
    "candidate": "docs/engineer-osint/osint-publication-candidates/v4642-b104-wave2-local-images-public-cz.json",
    "sha256": "24bf45fd0434649464a75aa95701e7f91554029a7b9089cfa72766e116d7ce2c"
  },
  {
    "path": "docs/engineer-osint/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json",
    "schema": "engineer-osint-b104-cc0-local-image-append-authorization-v1",
    "run": "engineer-osint-20260903-B104",
    "candidate": "docs/engineer-osint/osint-publication-candidates/v4645-b104-wave2-local-images-cc0-public-cz.json",
    "sha256": "3d8e9885cb89c692dee1c39eb30fc6b369b03eea2546689fd53ceb5064e7121e"
  },
  {
    "path": "docs/engineer-osint/V4665_B105_WAVE3_LOCAL_IMAGE_APPEND_AUTHORIZATION.json",
    "schema": "engineer-osint-b105-wave3-local-image-append-authorization-v1",
    "run": "engineer-osint-20260904-B105",
    "candidate": "docs/engineer-osint/osint-publication-candidates/v4653-b105-wave3-v4584-local-images-public-cz.json",
    "sha256": "1c1d9a40076560486acb0c2938ae830c1c5859548c7ff3eba0040184dc2ddc68"
  }
];
const gitBlob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');
function finite(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Nonfinite authorization');return;}
 if(!value||typeof value!=='object')throw Error('Invalid authorization type');
 for(const x of Object.values(value))finite(x);
}
export function strictRepoPath(path){
 if(typeof path!=='string'||!path||isAbsolute(path)||path.includes('\\')||path.includes('\0')||normalize(path)!==path||path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe repository path');
 return path;
}
function assertSafeParents(path){
 strictRepoPath(path);const parts=path.split('/');
 for(let i=1;i<parts.length;i++){const stat=lstatSync(parts.slice(0,i).join('/'));if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Symlink/non-directory parent rejected');}
}
export function readStableFile(path){
 assertSafeParents(path);const before=lstatSync(path,{bigint:true});
 if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n)throw Error('Symlink/hardlink/non-file rejected');
 const fd=openSync(path,fsConstants.O_RDONLY|fsConstants.O_NOFOLLOW);
 try{const stat=fstatSync(fd,{bigint:true});if(stat.dev!==before.dev||stat.ino!==before.ino)throw Error('Path identity swap');const raw=readFileSync(fd,'utf8');return {path,raw,dev:stat.dev,ino:stat.ino};}finally{closeSync(fd);}
}
export function assertUnchanged(file){const now=readStableFile(file.path);if(now.dev!==file.dev||now.ino!==file.ino||now.raw!==file.raw)throw Error('Validated file changed before write');}
export function parseAppendCli(args){
 if(!Array.isArray(args)||!args.length)throw Error('Missing candidate');
 const input=strictRepoPath(args[0]);let write=false,authorization=null;
 for(let i=1;i<args.length;i++){
  if(args[i]==='--write'&&!write)write=true;
  else if(args[i]==='--authorization'&&authorization===null){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('--authorization requires an explicit repository path');authorization=strictRepoPath(args[++i]);}
  else throw Error('Unknown or duplicate CLI argument');
 }
 if(authorization&&!write)throw Error('Authorization requires explicit write intent');
 return {input,write,authorization};
}
function assertRoute(run,input,authorization){
 strictRepoPath(authorization);
 if(run===B106.run){if(input!==B106.candidate||authorization!==B106.authorization)throw Error('Strict append dispatcher rejects B106 path');return;}
 if(!LEGACY.some(x=>x.run===run&&x.candidate===input&&x.path===authorization))throw Error('Strict append dispatcher rejects unknown run/path');
}
export function strictB106Expectation(guardRaw){
 return {schema_version:'engineer-osint-b106-strict-append-authorization-v1',status:'READY_FOR_APPEND',reviewed_main_sha:B106.base,reviewed_tree_sha:B106.tree,candidate_path:B106.candidate,candidate_git_blob_sha:B106.candidate_blob,exact_candidate_file_sha256:B106.candidate_sha256,candidate_run_id:B106.run,expected_parent_run_id:B106.parent,expected_parent_canonical_sha256:B106.parent_canonical,expected_resulting_canonical_sha256:B106.result_canonical,readiness:{path:B106.readiness,git_blob_sha:B106.readiness_blob,raw_sha256:B106.readiness_sha256,canonical_sha256:B106.readiness_canonical},guard:{path:B106.guard,git_blob_sha:gitBlob(guardRaw),raw_sha256:sha256Text(guardRaw)},expected_counts:B106.counts,expected_card_ids:B106.cards,expected_visual_ids:B106.visuals,allowed_outputs:B106.outputs,authorization:{append_exact_candidate_only:true,allow_candidate_mutation:false,allow_authorization_mutation:false,allow_manual_manifest_or_hash_edit:false,allow_future_run:false,allow_history_rewrite:false,allow_runtime_change:false,allow_workflow_change:false,allow_lifecycle_change:false,allow_media_change:false,allow_deploy:false,allow_merge:false,allow_publish:false},execution_state:{performed:false}};
}
export function validateStrictB106(raw,{candidateRaw,readinessRaw,guardRaw,store,resultingCanonical}){
 const a=parseJsonStrict(raw,{maxBytes:65536,maxDepth:40});finite(a);
 if(canonicalDigest(a)!==canonicalDigest(strictB106Expectation(guardRaw)))throw Error('Strict B106 authorization payload drift');
 if(sha256Text(candidateRaw)!==B106.candidate_sha256||gitBlob(candidateRaw)!==B106.candidate_blob)throw Error('Strict B106 candidate bytes drift');
 const candidate=parseJsonStrict(candidateRaw);finite(candidate);
 if(sha256Text(JSON.stringify(candidate,null,2)+'\n')!==B106.candidate_sha256)throw Error('Strict B106 normalized bytes drift');
 if(sha256Text(readinessRaw)!==B106.readiness_sha256||gitBlob(readinessRaw)!==B106.readiness_blob||canonicalDigest(parseJsonStrict(readinessRaw))!==B106.readiness_canonical)throw Error('Strict B106 readiness drift');
 if(candidate.state.run_id!==B106.run||candidate.state.parent_run_id!==B106.parent||store.report.current_run_id!==B106.parent||store.report.canonical_sha256!==B106.parent_canonical)throw Error('Strict B106 parent/replay drift');
 const counts=Object.fromEntries(Object.entries(candidate).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]));
 if(canonicalDigest(counts)!==canonicalDigest(B106.counts)||canonicalDigest(candidate.updated_records.map(x=>x.id))!==canonicalDigest(B106.cards)||canonicalDigest(candidate.visuals.map(x=>x.id))!==canonicalDigest(B106.visuals))throw Error('Strict B106 delta drift');
 if(resultingCanonical!==B106.result_canonical)throw Error('Strict B106 result drift');
 return {valid:true,run:B106.run,outputs:[...B106.outputs],execution_performed:false};
}

export function main(args=process.argv.slice(2)){
const {input,write,authorization:explicitAuthorizationPath}=parseAppendCli(args);
const source='docs/engineer-osint';
const guardedB96='engineer-osint-20260829-B96',guardedB97='engineer-osint-20260830-B97',guardedB98='engineer-osint-20260830-B98',guardedB99='engineer-osint-20260830-B99',guardedB100='engineer-osint-20260902-B100',guardedB101='engineer-osint-20260902-B101',guardedB102='engineer-osint-20260902-B102';
const legacyGuardedRuns=new Set([guardedB96,guardedB97,guardedB98,guardedB99,guardedB100,guardedB101,guardedB102]);
const candidateFile=readStableFile(input),raw=candidateFile.raw,patch=parseJsonStrict(raw,{source:input});
if(write&&!legacyGuardedRuns.has(patch.state.run_id)){
 if(!explicitAuthorizationPath)throw new Error(`Explicit append authorization required for unrecognized write run ${patch.state.run_id}`);
 assertRoute(patch.state.run_id,input,explicitAuthorizationPath);
}
validatePatchOperations(patch);
const store=loadCanonicalRunStore({root:source});
if(patch.state.parent_run_id!==store.report.current_run_id)throw new Error(`Stale parent: expected ${store.report.current_run_id}, got ${patch.state.parent_run_id}`);
const result=applyStrictPatchToCanonicalData(store.data,patch),runId=patch.state.run_id;
const normalized=JSON.stringify(patch,null,2)+'\n';
const relative=`data/runs/${runId}.json`,destination=join(source,relative);
if(existsSync(destination))throw new Error(`Append-only run already exists: ${destination}`);
const entry={
  run_id:runId,parent_run_id:store.report.current_run_id,parent_canonical_sha256:store.report.canonical_sha256,
  path:relative,file_sha256:sha256Text(normalized),canonical_sha256:canonicalDigest(result)
};
const manifest={...store.manifest,runs:[...store.manifest.runs,entry]};
const plan={status:write?'APPENDED':'VALIDATED_DRY_RUN',input:basename(input),entry};

if(write&&runId===guardedB96){
  const authorizationPath=join(source,'V4511_B96_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B96 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b96-append-authorization-v1')throw new Error('B96 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B96 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.post_b96_ci_pipeline_ready!==true)throw new Error('B96 append blocked: post-B96 CI pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B96 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B96 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B96 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B96 append resulting canonical SHA differs from reviewed authorization');
  if((patch.extensions?.operations_v1||[]).length!==authorization.expected_operation_count)throw new Error('B96 append operation count mismatch');
  if((patch.sources||[]).length!==authorization.expected_source_append_count)throw new Error('B96 append source append count mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B96 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_b97_or_b98_same_slice!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B96 append authorization scope is unsafe');
}

if(write&&runId===guardedB97){
  const authorizationPath=join(source,'V4518_B97_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B97 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b97-append-authorization-v1')throw new Error('B97 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B97 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.post_b97_ci_pipeline_ready!==true)throw new Error('B97 append blocked: post-B97 CI pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B97 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B97 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B97 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B97 append resulting canonical SHA differs from reviewed authorization');
  const intelligence=patch.extensions?.intelligence_v1;
  if(!intelligence||!Array.isArray(intelligence.gaps)||intelligence.gaps.length!==authorization.expected_gap_count)throw new Error('B97 append native gap count mismatch');
  if(!Array.isArray(intelligence.assessments)||intelligence.assessments.length!==authorization.expected_assessment_count||!Array.isArray(intelligence.contradictions)||intelligence.contradictions.length!==authorization.expected_contradiction_count)throw new Error('B97 append Intelligence v1 scope mismatch');
  if(patch.extensions?.operations_v1!==undefined)throw new Error('B97 append may not include factual correction operations');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B97 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_b98_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B97 append authorization scope is unsafe');
}

if(write&&runId===guardedB98){
  const authorizationPath=join(source,'V4526_B98_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B98 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b98-append-authorization-v1')throw new Error('B98 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B98 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4525_post_b98_ci_pipeline_ready!==true||authorization.required_preconditions?.pages_post_b98_phase_ready!==true)throw new Error('B98 append blocked: POST_B98 CI/Pages pipeline is not ready');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B98 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B98 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B98 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B98 append resulting canonical SHA differs from reviewed authorization');
  if(!Array.isArray(patch.evidence)||patch.evidence.length!==authorization.expected_candidate_evidence_count)throw new Error('B98 append evidence count mismatch');
  const intelligence=patch.extensions?.intelligence_v1;
  if(!intelligence||!Array.isArray(intelligence.gaps)||intelligence.gaps.length!==authorization.expected_candidate_gap_count)throw new Error('B98 append candidate gap count mismatch');
  if(!Array.isArray(intelligence.assessments)||intelligence.assessments.length!==authorization.expected_candidate_assessment_count||!Array.isArray(intelligence.contradictions)||intelligence.contradictions.length!==authorization.expected_candidate_contradiction_count)throw new Error('B98 append Intelligence v1 scope mismatch');
  if(patch.extensions?.operations_v1!==undefined)throw new Error('B98 append may not include factual correction operations');
  if(patch.continuity?.overlay_retirement_authorized!==false)throw new Error('B98 append candidate may not authorize overlay retirement');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true)throw new Error('B98 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('B98 append authorization scope is unsafe');
}

if(write&&runId===guardedB99){
  const authorizationPath=join(source,'V4540_B99_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B99 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b99-append-authorization-v1')throw new Error('B99 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B99 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4536_exact_candidate_reviewed!==true||authorization.required_preconditions?.v4537_post_b99_lifecycle_ready!==true||authorization.required_preconditions?.v4538_pages_b99_gate_ready!==true||authorization.required_preconditions?.v4539_b99_media_attestation_ready!==true||authorization.required_preconditions?.current_main_push_checks_green!==true)throw new Error('B99 append blocked: reviewed candidate/lifecycle/Pages/media/current-main evidence is incomplete');
  if(authorization.required_preconditions?.identity_fix_runtime_must_remain_active!==true||authorization.required_preconditions?.expected_identity_overlay_residual_after_append!==0)throw new Error('B99 append blocked: identity overlay safety preconditions drifted');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B99 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B99 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B99 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B99 append resulting canonical SHA differs from reviewed authorization');
  const operations=patch.extensions?.operations_v1||[];
  if(operations.length!==authorization.expected_operation_count)throw new Error('B99 append operation count mismatch');
  if(operations.filter(item=>item.op==='REPLACE_FIELD').length!==authorization.expected_replace_field_count)throw new Error('B99 append REPLACE_FIELD count mismatch');
  if(operations.filter(item=>item.op==='REMOVE_FIELD').length!==authorization.expected_remove_field_count)throw new Error('B99 append REMOVE_FIELD count mismatch');
  const mirrorSync=patch.extensions?.legacy_mirror_sync_v1?.updated_records||[];
  if(mirrorSync.length!==authorization.expected_mirror_sync_request_count)throw new Error('B99 append mirror sync request count mismatch');
  if(mirrorSync[0]?.target_id!==authorization.expected_mirror_sync_target_id)throw new Error('B99 append mirror sync target mismatch');
  if(JSON.stringify(mirrorSync[0]?.fields)!==JSON.stringify(authorization.expected_mirror_sync_fields))throw new Error('B99 append mirror sync exact field scope mismatch');
  const mediaRegistry=parseJsonStrict(readFileSync(join(source,'media-sweep-status-exceptions.json'),'utf8'),{source:'media-sweep exception registry'});
  const mediaException=mediaRegistry.exceptions?.find(item=>item.exception_id===authorization.media_attestation?.exception_id);
  if(!mediaException||mediaException.run_id!==runId||mediaException.repository_file_sha256!==entry.file_sha256||mediaException.repository_canonical_sha256!==entry.canonical_sha256||mediaException.report_text_sha256!==authorization.media_attestation?.report_text_sha256||mediaException.resolved_status!==authorization.media_attestation?.resolved_status)throw new Error('B99 append media attestation mismatch');
  if(patch.continuity?.identity_fix_runtime_removal_authorized!==false)throw new Error('B99 append candidate may not authorize identity-fix runtime removal');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true)throw new Error('B99 append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_identity_fix_runtime_removal!==false||authorization.authorization?.allow_identity_overlay_retirement!==false||authorization.authorization?.allow_other_runtime_module_removal!==false)throw new Error('B99 append authorization scope is unsafe');
}

if(write&&runId===guardedB100){
  const authorizationPath=join(source,'V4593_B100_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B100 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b100-append-authorization-v1')throw new Error('B100 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B100 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4592_exact_candidate_reviewed!==true||authorization.required_preconditions?.v4592_candidate_dry_run_green!==true||authorization.required_preconditions?.current_main_push_checks_green!==true||authorization.required_preconditions?.b99_is_current_run!==true)throw new Error('B100 append blocked: reviewed candidate/current-main evidence is incomplete');
  if(authorization.required_preconditions?.candidate_self_authorization_must_remain_false!==true||authorization.required_preconditions?.canonical_write_performed_must_remain_false_before_execution!==true)throw new Error('B100 append blocked: pre-execution no-write boundary is incomplete');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B100 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B100 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B100 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B100 append resulting canonical SHA differs from reviewed authorization');
  if((patch.new_records||[]).length!==authorization.expected_new_record_count||(patch.sources||[]).length!==authorization.expected_new_source_count||(patch.evidence||[]).length!==authorization.expected_new_evidence_count||(patch.relations||[]).length!==authorization.expected_new_relation_count||(patch.updated_records||[]).length!==authorization.expected_updated_record_count)throw new Error('B100 append collection counts differ from reviewed authorization');
  if(JSON.stringify((patch.new_records||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_record_ids)||JSON.stringify((patch.sources||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_source_ids)||JSON.stringify((patch.evidence||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_evidence_ids))throw new Error('B100 append exact ID scope mismatch');
  if(patch.continuity?.publication_write_authorized!==false||patch.continuity?.canonical_write_performed!==false)throw new Error('B100 frozen candidate self-authorization/no-write state drifted');
  if(authorization.execution_state?.canonical_write_performed!==false||authorization.execution_state?.run_file_created!==false||authorization.execution_state?.manifest_updated!==false)throw new Error('B100 authorization artifact must remain pre-execution');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true||authorization.authorization?.execution_requires_separate_slice!==true)throw new Error('B100 append authorization is incomplete');
  if(authorization.authorization?.allow_candidate_mutation!==false||authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_canonical_history_rewrite!==false||authorization.authorization?.allow_runtime_change!==false||authorization.authorization?.allow_workflow_change!==false||authorization.authorization?.allow_photo_or_media_change!==false)throw new Error('B100 append authorization scope is unsafe');
}

if(write&&runId===guardedB101){
  const authorizationPath=join(source,'V4596_B101_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B101 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b101-append-authorization-v1')throw new Error('B101 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B101 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4595_exact_candidate_reviewed!==true||authorization.required_preconditions?.v4595_candidate_dry_run_green!==true||authorization.required_preconditions?.current_main_push_checks_green!==true||authorization.required_preconditions?.b100_is_current_run!==true)throw new Error('B101 append blocked: reviewed candidate/current-main evidence is incomplete');
  if(authorization.required_preconditions?.candidate_self_authorization_must_remain_false!==true||authorization.required_preconditions?.canonical_write_performed_must_remain_false_before_execution!==true||authorization.required_preconditions?.authorization_stage_append_run_must_remain_baseline!==true||authorization.required_preconditions?.explicit_multimedia_status_must_remain_complete_no_addition!==true)throw new Error('B101 append blocked: pre-execution boundary is incomplete');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B101 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B101 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B101 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B101 append resulting canonical SHA differs from reviewed authorization');
  if((patch.new_records||[]).length!==authorization.expected_new_record_count||(patch.sources||[]).length!==authorization.expected_new_source_count||(patch.evidence||[]).length!==authorization.expected_new_evidence_count||(patch.relations||[]).length!==authorization.expected_new_relation_count||(patch.updated_records||[]).length!==authorization.expected_updated_record_count)throw new Error('B101 append collection counts differ from reviewed authorization');
  if(JSON.stringify((patch.new_records||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_record_ids)||JSON.stringify((patch.sources||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_source_ids)||JSON.stringify((patch.evidence||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_evidence_ids))throw new Error('B101 append exact ID scope mismatch');
  if(patch.qa?.multimedia_status!==authorization.expected_multimedia_status||patch.qa?.multimedia_status!=='COMPLETE_NO_CANONICAL_MEDIA_ADDITION')throw new Error('B101 append multimedia status mismatch');
  if(patch.continuity?.publication_write_authorized!==false||patch.continuity?.canonical_write_performed!==false||patch.qa?.canonical_write_performed!==false)throw new Error('B101 frozen candidate self-authorization/no-write state drifted');
  if(authorization.execution_state?.append_run_successor_installed!==false||authorization.execution_state?.canonical_write_performed!==false||authorization.execution_state?.run_file_created!==false||authorization.execution_state?.manifest_updated!==false)throw new Error('B101 authorization artifact must remain pre-execution');
  if(authorization.authorized_guard_successor_contract?.guarded_run_id!==runId||authorization.authorized_guard_successor_contract?.authorization_path!==authorizationPath||authorization.authorized_guard_successor_contract?.require_exact_candidate_hashes!==true||authorization.authorized_guard_successor_contract?.require_exact_collection_counts!==true||authorization.authorized_guard_successor_contract?.require_exact_record_source_evidence_ids!==true||authorization.authorized_guard_successor_contract?.require_candidate_no_write_flags!==true||authorization.authorized_guard_successor_contract?.require_multimedia_status!=='COMPLETE_NO_CANONICAL_MEDIA_ADDITION'||authorization.authorized_guard_successor_contract?.allow_wildcard_or_current_state_acceptance!==false)throw new Error('B101 append guard successor contract mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.install_exact_b101_append_guard_successor!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true||authorization.authorization?.execution_requires_separate_slice!==true)throw new Error('B101 append authorization is incomplete');
  if(authorization.authorization?.allow_candidate_mutation!==false||authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_canonical_history_rewrite!==false||authorization.authorization?.allow_runtime_change!==false||authorization.authorization?.allow_workflow_change!==false||authorization.authorization?.allow_photo_or_media_change!==false)throw new Error('B101 append authorization scope is unsafe');
}

if(write&&runId===guardedB102){
  const authorizationPath=join(source,'V4599_B102_APPEND_AUTHORIZATION.json');
  const authorization=parseJsonStrict(readFileSync(authorizationPath,'utf8'),{source:'B102 append authorization'});
  if(authorization.schema_version!=='engineer-osint-b102-append-authorization-v1')throw new Error('B102 append authorization schema mismatch');
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`B102 append blocked by authorization status ${authorization.status}`);
  if(authorization.required_preconditions?.v4598_exact_candidate_reviewed!==true||authorization.required_preconditions?.v4598_candidate_dry_run_green!==true||authorization.required_preconditions?.current_main_push_checks_green!==true||authorization.required_preconditions?.b101_is_current_run!==true)throw new Error('B102 append blocked: reviewed candidate/current-main evidence is incomplete');
  if(authorization.required_preconditions?.candidate_self_authorization_must_remain_false!==true||authorization.required_preconditions?.canonical_write_performed_must_remain_false_before_execution!==true||authorization.required_preconditions?.authorization_stage_append_run_must_remain_baseline!==true||authorization.required_preconditions?.explicit_multimedia_status_must_remain_complete_no_addition!==true)throw new Error('B102 append blocked: pre-execution boundary is incomplete');
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('B102 append authorization identity mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('B102 append authorization parent canonical SHA mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('B102 append candidate file SHA differs from reviewed authorization');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('B102 append resulting canonical SHA differs from reviewed authorization');
  if((patch.new_records||[]).length!==authorization.expected_new_record_count||(patch.sources||[]).length!==authorization.expected_new_source_count||(patch.evidence||[]).length!==authorization.expected_new_evidence_count||(patch.relations||[]).length!==authorization.expected_new_relation_count||(patch.updated_records||[]).length!==authorization.expected_updated_record_count)throw new Error('B102 append collection counts differ from reviewed authorization');
  if(JSON.stringify((patch.new_records||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_record_ids)||JSON.stringify((patch.sources||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_source_ids)||JSON.stringify((patch.evidence||[]).map(item=>item.id))!==JSON.stringify(authorization.expected_evidence_ids))throw new Error('B102 append exact ID scope mismatch');
  if(patch.qa?.multimedia_status!==authorization.expected_multimedia_status||patch.qa?.multimedia_status!=='COMPLETE_NO_CANONICAL_MEDIA_ADDITION')throw new Error('B102 append multimedia status mismatch');
  if(patch.continuity?.publication_write_authorized!==false||patch.continuity?.canonical_write_performed!==false||patch.qa?.canonical_write_performed!==false)throw new Error('B102 frozen candidate self-authorization/no-write state drifted');
  if(authorization.execution_state?.append_run_successor_installed!==false||authorization.execution_state?.canonical_write_performed!==false||authorization.execution_state?.run_file_created!==false||authorization.execution_state?.manifest_updated!==false)throw new Error('B102 authorization artifact must remain pre-execution');
  if(authorization.authorized_guard_successor_contract?.guarded_run_id!==runId||authorization.authorized_guard_successor_contract?.authorization_path!==authorizationPath||authorization.authorized_guard_successor_contract?.schema_version!=='engineer-osint-b102-append-authorization-v1'||authorization.authorized_guard_successor_contract?.required_status!=='READY_FOR_APPEND'||authorization.authorized_guard_successor_contract?.require_exact_candidate_hashes!==true||authorization.authorized_guard_successor_contract?.require_exact_collection_counts!==true||authorization.authorized_guard_successor_contract?.require_exact_record_source_evidence_ids!==true||authorization.authorized_guard_successor_contract?.require_candidate_no_write_flags!==true||authorization.authorized_guard_successor_contract?.require_multimedia_status!=='COMPLETE_NO_CANONICAL_MEDIA_ADDITION'||authorization.authorized_guard_successor_contract?.allow_wildcard_or_current_state_acceptance!==false)throw new Error('B102 append guard successor contract mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.install_exact_b102_append_guard_successor!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true||authorization.authorization?.execution_requires_separate_slice!==true)throw new Error('B102 append authorization is incomplete');
  if(authorization.authorization?.allow_candidate_mutation!==false||authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_canonical_history_rewrite!==false||authorization.authorization?.allow_runtime_change!==false||authorization.authorization?.allow_workflow_change!==false||authorization.authorization?.allow_photo_or_media_change!==false)throw new Error('B102 append authorization scope is unsafe');
}

let b106Files;
if(write&&runId===B106.run){
 const state=assertB106GuardState();
 if(state.mode!=='SUCCESSOR')throw Error('Strict B106 implementation vector is not complete');
 const authorizationFile=readStableFile(explicitAuthorizationPath),readinessFile=readStableFile(B106.readiness),guardFile=readStableFile(B106.guard);
 validateStrictB106(authorizationFile.raw,{candidateRaw:raw,readinessRaw:readinessFile.raw,guardRaw:guardFile.raw,store,resultingCanonical:entry.canonical_sha256});
 b106Files=[candidateFile,authorizationFile,readinessFile,guardFile,readStableFile(source+'/data/run-store-manifest.json')];
}
if(write&&!legacyGuardedRuns.has(runId)&&runId!==B106.run){
  if(!explicitAuthorizationPath)throw new Error(`Explicit append authorization required for unrecognized write run ${runId}`);
  const authorizationPath=explicitAuthorizationPath.replaceAll('\\','/');
  if(!authorizationPath.startsWith(`${source}/`)||authorizationPath.split('/').includes('..'))throw new Error('Explicit append authorization path is outside docs/engineer-osint');
  const authRaw=readStableFile(authorizationPath).raw;
  const known=LEGACY.find(x=>x.run===runId&&x.path===authorizationPath&&x.candidate===input);
  if(!known||sha256Text(authRaw)!==known.sha256)throw Error('Strict historical authorization drift');
  const authorization=parseJsonStrict(authRaw,{source:`explicit append authorization ${authorizationPath}`});
  if(authorization.schema_version!==known.schema)throw Error('Strict historical schema drift');
  const normalizedInput=input.replaceAll('\\','/');
  const guard=authorization.authorized_guard_successor_contract;
  if(authorization.status!=='READY_FOR_APPEND')throw new Error(`Explicit append authorization is not READY_FOR_APPEND: ${authorization.status}`);
  if(authorization.candidate_run_id!==runId||authorization.expected_parent_run_id!==entry.parent_run_id)throw new Error('Explicit append authorization identity/parent mismatch');
  if(authorization.expected_parent_canonical_sha256!==entry.parent_canonical_sha256)throw new Error('Explicit append authorization parent canonical SHA mismatch');
  if(authorization.candidate_path!==normalizedInput)throw new Error('Explicit append authorization candidate path mismatch');
  if(authorization.exact_candidate_file_sha256!==entry.file_sha256)throw new Error('Explicit append authorization candidate SHA mismatch');
  if(authorization.expected_resulting_canonical_sha256!==entry.canonical_sha256)throw new Error('Explicit append authorization resulting canonical SHA mismatch');
  if(!guard||guard.guarded_run_id!==runId||guard.authorization_path!==authorizationPath||guard.require_exact_candidate_hashes!==true||guard.allow_wildcard_or_current_state_acceptance!==false)throw new Error('Explicit append authorization guard successor contract mismatch');
  if(guard.schema_version&&guard.schema_version!==authorization.schema_version)throw new Error('Explicit append authorization schema contract mismatch');
  if(guard.required_status&&guard.required_status!==authorization.status)throw new Error('Explicit append authorization status contract mismatch');
  if(authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.isolated_review_branch_required!==true||authorization.authorization?.execution_requires_separate_slice!==true)throw new Error('Explicit append authorization is incomplete');
  if(authorization.authorization?.allow_manual_manifest_or_hash_edit!==false||authorization.authorization?.allow_future_run_same_slice!==false||authorization.authorization?.allow_canonical_history_rewrite!==false)throw new Error('Explicit append authorization scope is unsafe');
}

if(write&&b106Files){
  // Recheck identities/content immediately before staging; use validated normalized bytes.
  // This is not a cross-file transaction. Execution requires exclusive isolated checkout;
  // crash/orphan recovery must verify run+manifest together before committing either.
  for(const file of b106Files)assertUnchanged(file);
  for(const output of B106.outputs)assertSafeParents(output);
  if(existsSync(destination))throw Error('B106 replay blocked');
}
if(write){
  const manifestPath=join(source,'data/run-store-manifest.json'),runTemp=`${destination}.tmp`,manifestTemp=`${manifestPath}.tmp`;
  writeFileSync(runTemp,normalized,{encoding:'utf8',flag:'wx'});
  writeFileSync(manifestTemp,JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  renameSync(runTemp,destination);
  renameSync(manifestTemp,manifestPath);
  const verified=loadCanonicalRunStore({root:source});
  if(verified.report.current_run_id!==runId||verified.report.canonical_sha256!==entry.canonical_sha256)throw new Error('Post-write run-store verification failed');
}
console.log(JSON.stringify(plan,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
