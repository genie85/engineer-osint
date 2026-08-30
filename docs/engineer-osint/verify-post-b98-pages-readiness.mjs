import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const fail=message=>{throw new Error(`POST_B98_PAGES_GATE: ${message}`)};
const requireDist=name=>{const path=join(dist,name);if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)fail(`missing/empty ${name}`);return path;};
const manifest=readJson(join(src,'data/run-store-manifest.json'));
const runs=manifest.runs||[],currentRun=runs.at(-1)?.run_id||manifest.snapshot.run_id,currentIndex=runs.length-1;
const b97='engineer-osint-20260830-B97',b98='engineer-osint-20260830-B98';
const candidateSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const resultSha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const b98Index=runs.findIndex(entry=>entry.run_id===b98),postB98Lineage=b98Index>=0&&currentIndex>=b98Index;

if(currentRun!==b97&&!postB98Lineage){
  console.log(`POST_B98 Pages gate not applicable at ${currentRun}`);
  process.exit(0);
}

const policy=readJson(join(src,'V4525_B98_POST_CI_READINESS.json'));
if(policy.schema_version!=='engineer-osint-b98-post-ci-readiness-v1'||policy.candidate_run_id!==b98||policy.expected_parent_run_id!==b97||policy.exact_candidate_file_sha256!==candidateSha||policy.expected_resulting_canonical_sha256!==resultSha)fail('policy identity/hash drift');
if(policy.authorization?.allow_overlay_retirement!==false||policy.authorization?.allow_identity_fix_migration!==false)fail('policy safety boundary broadened');

if(currentRun===b97){
  ['b98-patch-candidate.json','b98-readiness-audit.json','b98-pages-append-plan.json','persistent-b98-audit.json','persistent-b98-audit.md'].forEach(requireDist);
  const plan=readJson(join(dist,'b98-pages-append-plan.json'));
  if(plan.status!=='VALIDATED_DRY_RUN'||plan.entry?.run_id!==b98||plan.entry?.parent_run_id!==b97||plan.entry?.parent_canonical_sha256!==policy.expected_parent_canonical_sha256||plan.entry?.file_sha256!==candidateSha||plan.entry?.canonical_sha256!==resultSha)fail('exact B98 Pages dry-run contract invalid');
  const readiness=readJson(join(dist,'b98-readiness-audit.json'));
  if(readiness.status!=='PASS'||readiness.candidate_file_sha256!==candidateSha||readiness.evidence_count!==2||readiness.assessment_count!==4||readiness.runtime_guard_before_short_circuits!==0||readiness.runtime_guard_after_short_circuits!==3||readiness.unguarded_residual_signature_count!==61||readiness.unguarded_residual_factual_leaf_mutations!==81||readiness.guarded_mutation_count!==0||readiness.canonical_write_performed!==false||readiness.safe_to_append!==false||readiness.safe_to_retire_overlays!==false)fail('B98 readiness artifact invalid');
  const post=readJson(join(dist,'persistent-b98-audit.json'));
  if(post.status!=='PASS'||post.schema_version!=='engineer-osint-persistent-b98-audit-v1'||post.mode!=='SIMULATED_PRE_APPEND_READINESS'||post.candidate_run_id!==b98||post.parent_run_id!==b97||post.candidate_file_sha256!==candidateSha||post.resulting_canonical_sha256!==resultSha||post.persistent_gap_count!==15||post.native_evidence_count!==2||post.native_assessment_count!==4||post.residual_signature_count!==61||post.residual_factual_leaf_mutations!==81||post.unexpected_residual_modules?.length!==0||post.guard_short_circuit_count!==3||post.guarded_factual_mutation_count!==0||post.multimedia_status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION'||post.overlay_retirement_authorized!==false||post.identity_fix_migration_authorized!==false||post.post_b98_pages_validation_ready!==true||post.canonical_write_performed!==false)fail('simulated POST_B98 audit invalid');
  if(policy.status!=='BLOCKED_PENDING_POST_B98_CI_READINESS'||policy.authorization?.append_allowed!==false||policy.authorization?.standard_append_run_write_allowed!==false)fail('readiness review must remain blocked/no-write');
  console.log('POST_B98 Pages readiness PASS: simulated exact B98; persistent tip remains B97; append remains blocked');
  process.exit(0);
}

const b98Entry=runs[b98Index];
if(!b98Entry||b98Entry.parent_run_id!==b97||b98Entry.parent_canonical_sha256!==b97Sha||b98Entry.path!=='data/runs/engineer-osint-20260830-B98.json'||b98Entry.file_sha256!==candidateSha||b98Entry.canonical_sha256!==resultSha)fail('historical persistent B98 manifest anchor invalid');
const b98Raw=readFileSync(join(src,b98Entry.path),'utf8');
if(createHash('sha256').update(b98Raw).digest('hex')!==candidateSha)fail('historical persistent B98 file SHA drift');

const futureAuthorization=join(src,'V4526_B98_APPEND_AUTHORIZATION.json');
if(!existsSync(futureAuthorization))fail('persistent B98 requires a separately reviewed active B98 append authorization; descendant lineage requires the same historical authorization');
const authorization=readJson(futureAuthorization);
if(authorization.status!=='READY_FOR_APPEND'||authorization.candidate_run_id!==b98||authorization.expected_parent_run_id!==b97||authorization.exact_candidate_file_sha256!==candidateSha||authorization.expected_resulting_canonical_sha256!==resultSha||authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)fail('persistent B98 active authorization invalid');

if(currentRun===b98){
  requireDist('persistent-b98-audit.json');
  const post=readJson(join(dist,'persistent-b98-audit.json'));
  if(post.status!=='PASS'||post.mode!=='PERSISTENT_POST_APPEND'||post.persistent_tip!==b98||post.candidate_file_sha256!==candidateSha||post.resulting_canonical_sha256!==resultSha||post.guard_short_circuit_count!==3||post.guarded_factual_mutation_count!==0||post.overlay_retirement_authorized!==false||post.identity_fix_migration_authorized!==false||post.canonical_write_performed!==false)fail('persistent B98 post-append audit invalid');
}

requireDist('post-b98-steady-state-audit.json');
requireDist('post-b98-steady-state-audit.md');
const steady=readJson(join(dist,'post-b98-steady-state-audit.json'));
if(steady.status!=='PASS'||steady.schema_version!=='engineer-osint-post-b98-steady-state-v1'||steady.current_run_id!==currentRun)fail('post-B98 steady-state audit identity mismatch');
if(steady.historical_b98?.status!=='PASS'||steady.historical_b98?.run_id!==b98||steady.historical_b98?.parent_run_id!==b97||steady.historical_b98?.file_sha256!==candidateSha||steady.historical_b98?.canonical_sha256!==resultSha)fail('post-B98 steady-state historical anchor invalid');
if(steady.guard_short_circuit_count!==3||steady.guarded_first_three_factual_mutation_count!==0||steady.pre_localization_semantic_diff_count!==0||steady.post_localization_semantic_diff_count!==0||steady.public_data_semantic_parity!==true)fail('post-B98 steady-state semantic parity invalid');
if(steady.first_three_ready_for_retirement_review!==true||steady.review_gate_status!=='READY_FOR_SEPARATE_RETIREMENT_SLICE_REVIEW'||steady.retirement_authorized!==false||steady.runtime_module_removal_performed!==false||steady.full_browser_retirement_regression_required!==true||steady.identity_fix_in_scope!==false||steady.identity_fix_migration_authorized!==false||steady.canonical_write_performed!==false)fail('post-B98 steady-state safety boundary broadened');
console.log(currentRun===b98?'POST_B98 Pages gate PASS: exact persistent B98 plus steady-state semantic parity':'POST_B98 Pages gate PASS: descendant steady-state lineage and semantic parity');
