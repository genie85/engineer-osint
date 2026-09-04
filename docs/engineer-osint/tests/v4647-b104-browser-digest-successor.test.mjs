import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const root='docs/engineer-osint';
const authorizationPath=`${root}/V4646_B104_CC0_LOCAL_IMAGE_APPEND_AUTHORIZATION.json`;
const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const runId='engineer-osint-20260903-B104';
const digest='5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c';
const b103Run='engineer-osint-20260902-B103';
const b103Digest='68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a';
const expectedPredecessorBlob='ba0517693b06a0360e1254f47e8b9004942bba0f';
const expectedSuccessorBlob='cb7e4d186ff3a79675ace8c48754317ffdede233';
const gitBlobSha=value=>createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex');

test('v4.6.47 applies exactly the separately authorized B104 browser digest pair to both maps',()=>{
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const workflow=readFileSync(workflowPath,'utf8');

  assert.equal(authorization.status,'READY_FOR_APPEND');
  assert.equal(authorization.browser_workflow_successor.guarded_run_id,runId);
  assert.equal(authorization.browser_workflow_successor.normalized_dom_sha256,digest);
  assert.equal(authorization.browser_workflow_successor.source_git_blob_sha,expectedPredecessorBlob);
  assert.equal(authorization.browser_workflow_successor.require_both_expected_digest_maps,true);
  assert.equal(authorization.browser_workflow_successor.allow_only_exact_b104_pair_addition,true);
  assert.equal(authorization.browser_workflow_successor.implementation_requires_separate_slice,true);
  assert.equal(authorization.authorization.browser_workflow_successor_authorized,true);
  assert.equal(authorization.authorization.browser_workflow_successor_requires_separate_slice,true);

  const pair=`'${runId}':'${digest}'`;
  assert.equal(workflow.split(pair).length-1,2,'B104 pair must appear in exactly both expected digest maps');
  assert.equal(workflow.split(runId).length-1,2,'B104 run id must not appear elsewhere in workflow');
  assert.equal(workflow.split(digest).length-1,2,'B104 digest must not appear elsewhere in workflow');
  assert.equal(gitBlobSha(workflow),expectedSuccessorBlob);
});

test('v4.6.47 workflow successor reduces byte-for-byte to the authorized predecessor when only B104 pairs are removed',()=>{
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const workflow=readFileSync(workflowPath,'utf8');
  const wideBefore=`              '${b103Run}':'${b103Digest}'`;
  const wideAfter=`${wideBefore},\n              '${runId}':'${digest}'`;
  const narrowBefore=`            '${b103Run}':'${b103Digest}'`;
  const narrowAfter=`${narrowBefore},\n            '${runId}':'${digest}'`;

  assert.ok(workflow.includes(wideAfter),'Python browser-digest map successor missing');
  assert.ok(workflow.includes(narrowAfter),'Node browser-digest map successor missing');
  const predecessor=workflow.replace(wideAfter,wideBefore).replace(narrowAfter,narrowBefore);
  assert.equal(gitBlobSha(predecessor),expectedPredecessorBlob);
  assert.equal(gitBlobSha(predecessor),authorization.protected_baseline.identity_fix_retirement_workflow_git_blob_sha);
  assert.equal(predecessor.includes(runId),false);
  assert.equal(predecessor.includes(digest),false);
});

test('v4.6.47 changes browser acceptance only and preserves its historical pending-execution evidence across exact later B104 execution',()=>{
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const workflow=readFileSync(workflowPath,'utf8');
  const store=loadCanonicalRunStore({root});

  if(store.report.current_run_id===b103Run){
    assert.equal(store.report.canonical_sha256,authorization.expected_parent_canonical_sha256);
  } else {
    assert.equal(store.report.current_run_id,runId,'canonical head is outside exact B103→B104 lifecycle');
    assert.equal(store.report.canonical_sha256,authorization.expected_resulting_canonical_sha256);
    const entry=store.manifest.runs.find(item=>item.run_id===runId);
    assert.ok(entry,'exact B104 manifest entry missing');
    assert.equal(entry.parent_run_id,b103Run);
    assert.equal(entry.parent_canonical_sha256,authorization.expected_parent_canonical_sha256);
    assert.equal(entry.file_sha256,authorization.exact_candidate_file_sha256);
    assert.equal(entry.canonical_sha256,authorization.expected_resulting_canonical_sha256);
  }
  assert.equal(authorization.execution_state.canonical_write_performed,false);
  assert.equal(authorization.execution_state.run_file_created,false);
  assert.equal(authorization.execution_state.manifest_updated,false);
  assert.equal(authorization.execution_state.photo_review_status_successor_applied,false);
  assert.match(workflow,/permissions:\n  contents: read/);
  assert.ok(!workflow.includes('contents: write'));
  assert.ok(!workflow.includes('authorized-canonical-executor'));
});
