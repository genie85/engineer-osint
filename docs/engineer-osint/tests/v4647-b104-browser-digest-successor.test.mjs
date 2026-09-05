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
const b105Run='engineer-osint-20260904-B105';
const b105Digest='25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7';
const expectedPredecessorBlob='ba0517693b06a0360e1254f47e8b9004942bba0f';
const expectedSuccessorBlob='cb7e4d186ff3a79675ace8c48754317ffdede233';
const expectedB105SuccessorBlob='0aded293ae69be3844c73f6613f0a70b05320156';
const gitBlobSha=value=>createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex');

test('v4.6.47 applies exactly the separately authorized B104 pair while permitting only the exact later B105 workflow successor',()=>{
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const workflow=readFileSync(workflowPath,'utf8');
  const current=gitBlobSha(workflow);

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
  assert.ok([expectedSuccessorBlob,expectedB105SuccessorBlob].includes(current),'workflow is neither exact B104 nor exact B105 successor');
  if(current===expectedB105SuccessorBlob){
    const b105Pair=`'${b105Run}':'${b105Digest}'`;
    assert.equal(workflow.split(b105Pair).length-1,2,'B105 pair must appear in exactly both expected digest maps');
    assert.equal(workflow.split(b105Run).length-1,2,'B105 run id must not appear elsewhere in workflow');
    assert.equal(workflow.split(b105Digest).length-1,2,'B105 digest must not appear elsewhere in workflow');
  }
});

test('v4.6.47 workflow successor chain reduces byte-for-byte B105→B104→authorized B103 predecessor',()=>{
  const authorization=JSON.parse(readFileSync(authorizationPath,'utf8'));
  const workflow=readFileSync(workflowPath,'utf8');
  const current=gitBlobSha(workflow);
  const wideB104=`              '${runId}':'${digest}'`;
  const narrowB104=`            '${runId}':'${digest}'`;
  const wideB105=`${wideB104},\n              '${b105Run}':'${b105Digest}'`;
  const narrowB105=`${narrowB104},\n            '${b105Run}':'${b105Digest}'`;
  let b104Workflow=workflow;
  if(current===expectedB105SuccessorBlob){
    assert.ok(workflow.includes(wideB105),'Python B105 browser-digest map successor missing');
    assert.ok(workflow.includes(narrowB105),'Node B105 browser-digest map successor missing');
    b104Workflow=workflow.replace(wideB105,wideB104).replace(narrowB105,narrowB104);
    assert.equal(gitBlobSha(b104Workflow),expectedSuccessorBlob);
  }else{
    assert.equal(current,expectedSuccessorBlob);
  }

  const wideB103=`              '${b103Run}':'${b103Digest}'`;
  const wideAfter=`${wideB103},\n${wideB104}`;
  const narrowB103=`            '${b103Run}':'${b103Digest}'`;
  const narrowAfter=`${narrowB103},\n${narrowB104}`;
  assert.ok(b104Workflow.includes(wideAfter),'Python B104 browser-digest map successor missing');
  assert.ok(b104Workflow.includes(narrowAfter),'Node B104 browser-digest map successor missing');
  const predecessor=b104Workflow.replace(wideAfter,wideB103).replace(narrowAfter,narrowB103);
  assert.equal(gitBlobSha(predecessor),expectedPredecessorBlob);
  assert.equal(gitBlobSha(predecessor),authorization.protected_baseline.identity_fix_retirement_workflow_git_blob_sha);
  assert.equal(predecessor.includes(runId),false);
  assert.equal(predecessor.includes(digest),false);
});

test('v4.6.47 changes browser acceptance only and preserves its historical pending-execution evidence across exact later B104 execution/B105 workflow successor',()=>{
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
