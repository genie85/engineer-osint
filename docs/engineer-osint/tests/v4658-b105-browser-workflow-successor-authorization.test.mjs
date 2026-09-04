import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const authPath=`${root}/V4658_B105_BROWSER_WORKFLOW_SUCCESSOR_AUTHORIZATION.json`;
const readinessPath=`${root}/V4654_B105_WAVE3_LOCAL_IMAGE_READINESS.json`;
const discoveryPath=`${root}/V4654_B105_B106_LOCAL_IMAGE_DISCOVERY.json`;
const candidatePath=`${root}/osint-publication-candidates/v4653-b105-wave3-v4584-local-images-public-cz.json`;
const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const helperPath=`${root}/tests/v4556-workflow-lifecycle-helper.mjs`;

const auth=JSON.parse(readFileSync(authPath,'utf8'));
const workflow=readFileSync(workflowPath,'utf8');
const helper=readFileSync(helperPath,'utf8');
const readiness=readFileSync(readinessPath,'utf8');
const discovery=readFileSync(discoveryPath,'utf8');
const candidate=readFileSync(candidatePath,'utf8');

const gitBlobSha=value=>createHash('sha1').update(`blob ${Buffer.byteLength(value)}\0`).update(value).digest('hex');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const runId='engineer-osint-20260904-B105';
const digest='25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7';
const workflowPre='cb7e4d186ff3a79675ace8c48754317ffdede233';
const workflowPost='0aded293ae69be3844c73f6613f0a70b05320156';
const helperPre='7e9480f421cdd811c2660033e4539f926ce5ad7b';
const helperPost='c7527860a5f175000b634a25d170698d70569b53';

test('v4.6.58 authorization pins exact immutable B105 readiness and candidate evidence',()=>{
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_dynamic_state.main_sha,'f5fbd18dd9d8fed683ebbe3c17df2a6d023f677a');
  assert.equal(gitBlobSha(readiness),auth.b105_readiness.git_blob_sha);
  assert.equal(gitBlobSha(discovery),auth.b105_discovery.git_blob_sha);
  assert.equal(gitBlobSha(candidate),auth.b105_candidate.git_blob_sha);
  assert.equal(sha256(candidate),auth.b105_candidate.sha256);
  assert.equal(auth.b105_candidate.run_id,runId);
  assert.equal(auth.b105_candidate.parent_run_id,'engineer-osint-20260903-B104');
  assert.equal(auth.b105_candidate.expected_resulting_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(auth.b105_candidate.expected_local_image_count_after_b105,17);
  assert.equal(auth.b105_candidate.expected_ready_for_import_count_after_b105,2);
  assert.equal(auth.b105_candidate.expected_photo_coverage_percent_after_b105,34);
});

test('v4.6.58 authorizes only the exact B105 browser workflow and helper successor identities',()=>{
  const w=auth.browser_workflow_successor;
  const h=auth.workflow_lifecycle_helper_successor;
  assert.equal(w.source_git_blob_sha,workflowPre);
  assert.equal(w.successor_git_blob_sha,workflowPost);
  assert.equal(w.successor_sha256,'e66ab5aa718b01e7ebd374eb2fd424fdf6276e0f0842453c33ed494b314664f7');
  assert.equal(w.guarded_run_id,runId);
  assert.equal(w.normalized_dom_sha256,digest);
  assert.equal(w.required_exact_pair_occurrences,2);
  assert.equal(w.require_both_expected_digest_maps,true);
  assert.equal(w.allow_only_exact_b105_pair_addition,true);
  assert.equal(w.preserve_permissions_contents_read,true);
  assert.equal(w.implementation_requires_separate_slice,true);
  assert.equal(h.source_git_blob_sha,helperPre);
  assert.equal(h.successor_git_blob_sha,helperPost);
  assert.equal(h.successor_sha256,'6cfcab850f4c7ddb5a052dcb27719768dfc46f017675ec6ff1dc15a0427111f5');
  assert.equal(h.preserve_all_prior_published_workflow_blobs,true);
  assert.equal(h.forbid_wildcard_or_unknown_descendant_acceptance,true);
});

test('v4.6.58 repository must be at the exact predecessor pair or the exact authorized successor pair, never partial',()=>{
  const currentWorkflow=gitBlobSha(workflow);
  const currentHelper=gitBlobSha(helper);
  const predecessor=currentWorkflow===workflowPre&&currentHelper===helperPre;
  const successor=currentWorkflow===workflowPost&&currentHelper===helperPost;
  assert.ok(predecessor||successor,`unauthorized or partial workflow/helper state: ${currentWorkflow} / ${currentHelper}`);

  const pair=`'${runId}':'${digest}'`;
  if(predecessor){
    assert.equal(workflow.includes(runId),false);
    assert.equal(workflow.includes(digest),false);
    assert.equal(helper.includes('b105IdentityWorkflowSha'),false);
  } else {
    assert.equal(workflow.split(pair).length-1,2,'B105 pair must appear in exactly both digest maps');
    assert.match(workflow,/permissions:\n  contents: read/);
    assert.equal(workflow.includes('contents: write'),false);
    assert.equal(workflow.includes('authorized-canonical-executor'),false);
    assert.match(helper,new RegExp(`const b105IdentityWorkflowSha='${workflowPost}'`));
    assert.match(helper,new RegExp(`'${runId}':'${digest}'`));
    assert.match(helper,/b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha/);
  }
});

test('v4.6.58 derivation evidence is read-only and canonical execution remains explicitly forbidden',()=>{
  const e=auth.read_only_derivation_evidence;
  assert.equal(e.workflow_run_id,33912128979);
  assert.equal(e.workflow_job_id,101150731983);
  assert.equal(e.artifact_id,9951752282);
  assert.equal(e.artifact_sha256,'e6ce81630fb0485caadab80c89f5cbcf2da50add7e582eccc1a174a93972a510');
  assert.equal(e.status,'PASS_READ_ONLY');
  assert.equal(e.repository_diff_after_derivation,'CLEAN');
  assert.equal(e.workflow_reverse_proof,true);
  assert.equal(e.helper_reverse_proof,true);
  assert.deepEqual(auth.authorization.authorized_implementation_paths,[workflowPath,helperPath]);
  assert.equal(auth.authorization.authorization_slice_must_not_modify_implementation_paths,true);
  assert.equal(auth.authorization.canonical_write_authorized,false);
  assert.equal(auth.authorization.run_store_edit_authorized,false);
  assert.equal(auth.authorization.photo_review_status_write_authorized,false);
  assert.equal(auth.authorization.executor_change_authorized,false);
  assert.equal(auth.authorization.permission_change_authorized,false);
  assert.equal(auth.authorization.b105_canonical_execution_authorized,false);
  assert.equal(auth.authorization.b106_candidate_or_authorization_authorized,false);
  assert.equal(auth.execution_state.workflow_successor_implemented,false);
  assert.equal(auth.execution_state.helper_successor_implemented,false);
  assert.equal(auth.execution_state.canonical_write_performed,false);
});
