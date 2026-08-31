import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {validateMediaSweepExceptionRegistry} from '../lib/media-sweep-exceptions.mjs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4525_B98_POST_CI_READINESS.json`,'utf8'));
const registry=JSON.parse(readFileSync(`${root}/media-sweep-status-exceptions.json`,'utf8'));
const lib=readFileSync(`${root}/lib/media-sweep-exceptions.mjs`,'utf8');
const audit=readFileSync(`${root}/audit-persistent-b98.mjs`,'utf8');
const workflowPath='.github/workflows/b98-post-ci-readiness.yml';
const workflow=existsSync(workflowPath)?readFileSync(workflowPath,'utf8'):null;
const v4553=existsSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`)?JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8')):null;
const pages=readFileSync('.github/workflows/pages.yml','utf8');
const pagesGate=readFileSync(`${root}/verify-post-b98-pages-readiness.mjs`,'utf8');
const attestation=readFileSync(`${root}/data/attestations/engineer-osint-20260830-B98-media-omission.md`,'utf8');
const manifest=JSON.parse(readFileSync(`${root}/data/run-store-manifest.json`,'utf8'));
const currentRun=manifest.runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b97Id='engineer-osint-20260830-B97';
const b98Id='engineer-osint-20260830-B98';
const b98Path=`${root}/data/runs/${b98Id}.json`;
const sha256=text=>createHash('sha256').update(text).digest('hex');
const assertHistoricalWorkflow=()=>{
  assert.ok(v4553,'B98 post-CI workflow missing without v4.5.53 removal evidence');
  const removed=v4553.removed_targets.find(x=>x.file==='b98-post-ci-readiness.yml');
  assert.ok(removed);
  assert.equal(removed.git_blob_sha,'d9611e1ffb4a2aad3d2b34f38375f14ff648ba9a');
};

const assertLifecyclePresence=()=>{
  const b98Index=manifest.runs.findIndex(item=>item.run_id===b98Id);
  if(currentRun===b97Id){
    assert.equal(b98Index,-1);
    assert.equal(existsSync(b98Path),false);
    return;
  }
  assert.ok(b98Index>=0,'historical B98 manifest entry missing under later lifecycle tip');
  assert.equal(existsSync(b98Path),true);
  assert.equal(sha256(readFileSync(b98Path,'utf8')),policy.exact_candidate_file_sha256);
  const b98Entry=manifest.runs[b98Index];
  assert.equal(b98Entry.parent_run_id,b97Id);
  assert.equal(b98Entry.parent_canonical_sha256,policy.expected_parent_canonical_sha256);
  assert.equal(b98Entry.file_sha256,policy.exact_candidate_file_sha256);
  assert.equal(b98Entry.canonical_sha256,policy.expected_resulting_canonical_sha256);
  for(let i=b98Index+1;i<manifest.runs.length;i++){
    const parent=manifest.runs[i-1];
    const descendant=manifest.runs[i];
    assert.equal(descendant.parent_run_id,parent.run_id,`post-B98 descendant ${descendant.run_id} parent drift`);
    assert.equal(descendant.parent_canonical_sha256,parent.canonical_sha256,`post-B98 descendant ${descendant.run_id} parent canonical SHA drift`);
  }
};

test('v4.5.25 pins exact historical B98 no-write hashes and scope',()=>{
  assert.equal(policy.schema_version,'engineer-osint-b98-post-ci-readiness-v1');
  assert.equal(policy.status,'BLOCKED_PENDING_POST_B98_CI_READINESS');
  assert.equal(policy.candidate_run_id,b98Id);
  assert.equal(policy.expected_parent_run_id,b97Id);
  assert.equal(policy.expected_parent_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.equal(policy.exact_candidate_file_sha256,'ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79');
  assert.equal(policy.expected_resulting_canonical_sha256,'4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201');
  assert.equal(policy.required_preconditions.post_b98_ci_pipeline_ready,false);
  assert.equal(policy.required_preconditions.pages_post_b98_phase_ready,false);
  assert.equal(policy.authorization.append_allowed,false);
  assert.equal(policy.authorization.standard_append_run_write_allowed,false);
  assert.equal(policy.authorization.allow_overlay_retirement,false);
  assert.equal(policy.authorization.allow_identity_fix_migration,false);
  assertLifecyclePresence();
});

test('B98 media attestation is exact, one-run and assessment-migration-only',()=>{
  validateMediaSweepExceptionRegistry(registry);
  const entry=registry.exceptions.find(item=>item.run_id===b98Id);
  assert.ok(entry);
  assert.equal(registry.exceptions.filter(item=>item.run_id===b98Id).length,1);
  assert.equal(entry.exception_id,'MEDIA-SWEEP-ATTEST-B98-INTELLIGENCE-MIGRATION');
  assert.equal(entry.parent_run_id,b97Id);
  assert.equal(entry.attestation_basis,'REPOSITORY_REVIEWED_MIGRATION');
  assert.equal(entry.attestation_reference,'V4524_B98_READINESS+V4525_B98_POST_CI_READINESS');
  assert.equal(entry.waiver_scope,'INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(entry.resolved_status,'MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION');
  assert.equal(entry.repository_file_sha256,policy.exact_candidate_file_sha256);
  assert.equal(entry.repository_canonical_sha256,policy.expected_resulting_canonical_sha256);
  assert.equal(sha256(attestation),entry.report_text_sha256);
  assert.match(lib,/ensureIntelligenceAssessmentMigrationNoMediaAddition/);
  assert.match(lib,/NEW_EVIDENCE!==2/);
  assert.match(lib,/intel\.assessments\.length!==4/);
  assert.match(lib,/ENG-ASMT-B98-OVL-/);
});

test('persistent B98 audit has symmetric simulated and persistent exact-hash modes',()=>{
  assert.match(audit,/--simulate-from-generated/);
  assert.match(audit,/simulation requires exact persistent B97/);
  assert.match(audit,/persistent audit requires exact B98 tip/);
  assert.match(audit,/generated B98 candidate SHA drift/);
  assert.match(audit,/persistent B98 manifest entry drift/);
  assert.match(audit,/expected_guard_short_circuits_after/);
  assert.match(audit,/guarded B98 overlay path mutated factual state/);
  assert.match(audit,/post_b98_pages_validation_ready:true/);
  assert.match(audit,/overlay_retirement_authorized:false/);
  assert.match(audit,/identity_fix_migration_authorized:false/);
});

test('POST_B98 readiness workflow is lifecycle-aware and never writes canonical data',()=>{
  if(!workflow){assertHistoricalWorkflow();return;}
  assert.match(workflow,/Detect B98 lifecycle phase/);
  assert.match(workflow,/phase=PRE_B98/);
  assert.match(workflow,/phase=POST_B98/);
  assert.match(workflow,/build-b98-readiness\.mjs/);
  assert.match(workflow,/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/audit-persistent-b98\.mjs --simulate-from-generated/);
  assert.match(workflow,/audit-persistent-b98\.mjs/);
  assert.match(workflow,/PERSISTENT_POST_APPEND/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.match(workflow,/exact_candidate_file_sha256/);
  assert.match(workflow,/expected_resulting_canonical_sha256/);
  assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'PRE_B98'/);
  assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'POST_B98'/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
});

test('Pages simulates exact POST_B98 and gates it before PUBLIC-CZ and final verification',()=>{
  assert.match(pages,/else if\(run==='engineer-osint-20260830-B98'\)phase='POST_B98'/);
  assert.match(pages,/Build exact B98 candidate for post-B98 Pages simulation/);
  assert.match(pages,/Dry-run exact B98 for Pages simulation/);
  assert.match(pages,/audit-persistent-b98\.mjs --simulate-from-generated/);
  assert.match(pages,/Audit persistent B98 post-append state/);
  const postGate=pages.indexOf('Gate POST_B98 Pages readiness');
  const publicCz=pages.indexOf('Audit PUBLIC-CZ-UI runtime');
  const finalVerify=pages.indexOf('Verify deployable artifact and freshness');
  assert.ok(postGate>0&&publicCz>postGate&&finalVerify>publicCz);
  assert.doesNotMatch(pages,/append-run\.mjs[^\n]*--write/);
});

test('POST_B98 Pages gate passes simulation but fails closed on unauthorized persistence',()=>{
  assert.match(pagesGate,/SIMULATED_PRE_APPEND_READINESS/);
  assert.match(pagesGate,/guard_short_circuit_count!==3/);
  assert.match(pagesGate,/guarded_factual_mutation_count!==0/);
  assert.match(pagesGate,/BLOCKED_PENDING_POST_B98_CI_READINESS/);
  assert.match(pagesGate,/persistent B98 requires a separately reviewed active B98 append authorization/);
  assert.match(pagesGate,/V4526_B98_APPEND_AUTHORIZATION\.json/);
  assert.match(pagesGate,/append_exact_candidate_only!==true/);
  assert.match(pagesGate,/allow_overlay_retirement!==false/);
  assert.match(pagesGate,/allow_identity_fix_migration!==false/);
});
