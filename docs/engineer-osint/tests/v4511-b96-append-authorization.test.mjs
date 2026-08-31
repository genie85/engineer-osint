import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const approval=JSON.parse(fs.readFileSync(new URL('../V4511_B96_APPEND_AUTHORIZATION.json',import.meta.url),'utf8'));
const candidatePolicy=JSON.parse(fs.readFileSync(new URL('../V455_STAGE_A_CANDIDATE.json',import.meta.url),'utf8'));
const runtimeGuardDoc=fs.readFileSync(new URL('../V4510_RUNTIME_TRANSITION_GUARD.md',import.meta.url),'utf8');
const appendRun=fs.readFileSync(new URL('../append-run.mjs',import.meta.url),'utf8');
const root='docs/engineer-osint';
const b95='engineer-osint-20260826-B95';
const b96='engineer-osint-20260829-B96';
const b97='engineer-osint-20260830-B97';
const b98='engineer-osint-20260830-B98';
const b95Sha='dc0dae682004554a8f9a0dafbbd31187b9baebd2c325e9e37e503d6aa8bcabae';
const b96Sha='4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5';
const b97Sha='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4';
const b98Sha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';

test('v4.5.11 B96 review stays pinned to the exact historical B95 parent across later migration lifecycle',()=>{
  const store=loadCanonicalRunStore({root});
  assert.equal(approval.schema_version,'engineer-osint-b96-append-authorization-v1');
  assert.equal(approval.status,'READY_FOR_APPEND');
  assert.equal(approval.reviewed_baseline_main_sha,'c941446e7e358ed1c0e3ccc9e355413c9658701f');
  assert.equal(approval.expected_parent_run_id,b95);
  assert.equal(approval.expected_parent_canonical_sha256,b95Sha);
  assert.equal(approval.candidate_run_id,b96);
  assert.equal(approval.expected_resulting_canonical_sha256,b96Sha);
  assert.equal(approval.candidate_run_id,candidatePolicy.candidate_run_id);
  assert.equal(approval.expected_parent_run_id,candidatePolicy.expected_parent_run_id);
  assert.deepEqual(approval.scope_modules,candidatePolicy.scope_modules);
  assert.equal(approval.expected_operation_count,candidatePolicy.expected.operation_count);
  assert.equal(approval.expected_source_append_count,candidatePolicy.expected.source_append_count);

  if(store.report.current_run_id===b95){
    assert.equal(store.report.canonical_sha256,b95Sha);
    assert.equal(fs.existsSync(`${root}/data/runs/${b96}.json`),false);
    return;
  }

  assert.equal(fs.existsSync(`${root}/data/runs/${b96}.json`),true);
  const b96Index=store.manifest.runs.findIndex(item=>item.run_id===b96);
  const entry=store.manifest.runs[b96Index];
  assert.ok(b96Index>=0&&entry,'persistent B96 manifest entry missing');
  assert.equal(entry.parent_run_id,b95);
  assert.equal(entry.parent_canonical_sha256,b95Sha);
  assert.equal(entry.file_sha256,approval.exact_candidate_file_sha256);
  assert.equal(entry.canonical_sha256,b96Sha);

  if(store.report.current_run_id===b96){
    assert.equal(store.report.canonical_sha256,b96Sha);
    return;
  }

  const b97Index=store.manifest.runs.findIndex(item=>item.run_id===b97);
  const b97Entry=store.manifest.runs[b97Index];
  assert.ok(b97Index>b96Index&&b97Entry,'later B97 manifest entry missing or out of order');
  assert.equal(b97Entry.parent_run_id,b96);
  assert.equal(b97Entry.parent_canonical_sha256,b96Sha);
  assert.equal(b97Entry.canonical_sha256,b97Sha);
  if(store.report.current_run_id===b97){
    assert.equal(store.report.canonical_sha256,b97Sha);
    return;
  }

  const b98Index=store.manifest.runs.findIndex(item=>item.run_id===b98);
  const b98Entry=store.manifest.runs[b98Index];
  assert.ok(b98Index>b97Index&&b98Entry,'later B98 manifest entry missing or out of order');
  assert.equal(b98Entry.parent_run_id,b97);
  assert.equal(b98Entry.parent_canonical_sha256,b97Sha);
  assert.equal(b98Entry.canonical_sha256,b98Sha);
  if(store.report.current_run_id===b98){
    assert.equal(store.report.canonical_sha256,b98Sha);
    return;
  }

  for(let i=b98Index+1;i<store.manifest.runs.length;i++){
    const parent=store.manifest.runs[i-1];
    const descendant=store.manifest.runs[i];
    assert.equal(descendant.parent_run_id,parent.run_id,`post-B98 descendant ${descendant.run_id} parent drift`);
    assert.equal(descendant.parent_canonical_sha256,parent.canonical_sha256,`post-B98 descendant ${descendant.run_id} parent canonical SHA drift`);
  }
  const current=store.manifest.runs.at(-1);
  assert.equal(store.report.current_run_id,current.run_id);
  assert.equal(store.report.canonical_sha256,current.canonical_sha256);
});

test('review pins the exact v4.5.11 regenerated dry-run hashes and preserves historical no-write provenance',()=>{
  assert.equal(approval.exact_candidate_file_sha256,'3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1');
  assert.equal(approval.expected_resulting_canonical_sha256,b96Sha);
  assert.match(approval.exact_candidate_file_sha256,/^[a-f0-9]{64}$/);
  assert.match(approval.expected_resulting_canonical_sha256,/^[a-f0-9]{64}$/);
  assert.equal(candidatePolicy.safety.safe_to_append,false);
  assert.equal(approval.candidate_internal_safety_state.safe_to_append,false);
  assert.match(approval.candidate_internal_safety_state.meaning,/exact regenerated byte-identical candidate/i);
});

test('B96 authorization activates only after reviewed v4.5.12 dual-state CI readiness',()=>{
  assert.equal(approval.required_preconditions.v4510_runtime_guard_installed,true);
  assert.equal(approval.required_preconditions.v4510_pages_production_validation_passed,true);
  assert.equal(approval.required_preconditions.post_b96_ci_pipeline_ready,true);
  assert.equal(approval.current_blocker,null);
  assert.equal(approval.activation_evidence.pages_workflow_conclusion,'success');
  assert.equal(approval.activation_evidence.runtime_audit_workflow_conclusion,'success');
  assert.equal(approval.activation_evidence.post_b96_pages_simulation,'success');
  assert.equal(approval.authorization.append_exact_candidate_only,true);
  assert.equal(approval.authorization.standard_append_run_write_required,true);
  assert.equal(approval.authorization.one_run_only,true);
  assert.equal(approval.authorization.allow_manual_manifest_or_hash_edit,false);
  assert.equal(approval.authorization.allow_overlay_retirement,false);
  assert.equal(approval.authorization.allow_b97_or_b98_same_slice,false);
  assert.equal(approval.authorization.allow_identity_fix_migration,false);
});

test('standard append helper enforces active B96 authorization before any write',()=>{
  assert.match(appendRun,/guardedB96='engineer-osint-20260829-B96'/);
  assert.match(appendRun,/if\(write&&runId===guardedB96\)/);
  assert.match(appendRun,/authorization\.status!=='READY_FOR_APPEND'/);
  assert.match(appendRun,/post_b96_ci_pipeline_ready!==true/);
  assert.match(appendRun,/exact_candidate_file_sha256!==entry\.file_sha256/);
  assert.match(appendRun,/expected_resulting_canonical_sha256!==entry\.canonical_sha256/);
  assert.ok(appendRun.indexOf("if(write&&runId===guardedB96)")<appendRun.indexOf('if(write){\n  const manifestPath='));
});

test('v4.5.10 runtime guard prerequisite remains explicit as historical B95-inert evidence',()=>{
  assert.match(runtimeGuardDoc,/RUNTIME GUARD INSTALLED \/ PERSISTENT B95 INERT/);
  assert.match(runtimeGuardDoc,/persistent current run remains \*\*B95\*\*/);
  assert.match(runtimeGuardDoc,/next migration stage is a separately reviewed real append of the exact Stage A B96 candidate/i);
});
