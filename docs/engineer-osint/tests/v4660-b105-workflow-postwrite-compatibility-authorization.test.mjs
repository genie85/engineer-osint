import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const auth=JSON.parse(readFileSync(`${root}/V4660_B105_WORKFLOW_POSTWRITE_COMPATIBILITY_AUTHORIZATION.json`,'utf8'));
const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
const workflowPath='.github/workflows/identity-fix-retirement-regression.yml';
const helperPath=`${root}/tests/v4556-workflow-lifecycle-helper.mjs`;
const workflowPre='cb7e4d186ff3a79675ace8c48754317ffdede233';
const helperPre='7e9480f421cdd811c2660033e4539f926ce5ad7b';
const workflowPost='0aded293ae69be3844c73f6613f0a70b05320156';
const helperPost='c7527860a5f175000b634a25d170698d70569b53';

const expectedTests=new Map([
  [`${root}/tests/v4557-browser-digest-normalization-hotfix.test.mjs`,{source:'9939fbcbf9c7f09f61a9a5c82c795873bddd0a61',successor:'7fbe5e37d92e53a7c7425844add443ae0e20cf54'}],
  [`${root}/tests/v4562-active-node24-migration.test.mjs`,{source:'c61540fa8c9be9cb21129e46fe488391502102dd',successor:'c1611a3de4b54a17e7ceeb127ca7d3ab271af05f'}],
  [`${root}/tests/v4563-action-node24-authorization.test.mjs`,{source:'558b54212ff856a01be7c1a5dedfaa871e5c820c',successor:'f755fc73525db951d84c8880976047f2358c02b7'}],
  [`${root}/tests/v4565-action-upgrade-lifecycle-authorization.test.mjs`,{source:'a74bdbbf767cdc986862da828ee394cfc09b3334',successor:'1b889cd96fb1a057dc374af269a44601bf920444'}],
  [`${root}/tests/v4619-b103-public-cz-authorization.test.mjs`,{source:'9bd857b2f9bb785fd4fcb75be3697bb18712fdd1',successor:'0bee343905a8de962d4c105351cf8e124f219c2d'}],
  [`${root}/tests/v4643-b104-wave2-local-image-authorization.test.mjs`,{source:'0d73c824951f3eade09b24f5b59a389fb67b6d33',successor:'be37f8ad1a6a31d0c4214d00fe1c28e856632692'}],
  [`${root}/tests/v4646-b104-cc0-authorization.test.mjs`,{source:'87656fdd7ceccdf55bdb2ceac23093a694165a3b',successor:'7a6b45ea97299ffe15643f22c17f6679cdca18f9'}],
  [`${root}/tests/v4647-b104-browser-digest-successor.test.mjs`,{source:'233793d6acb49931b52f56d1543a7b92e9e3b3f6',successor:'b16234c3b58a1a829a86cfb66931bc70355ead83'}]
]);

const currentTestShas=new Map([...expectedTests].map(([path])=>[path,gitBlobSha(readFileSync(path,'utf8'))]));
const sourceMode=[...expectedTests].every(([path,ids])=>currentTestShas.get(path)===ids.source);
const successorMode=[...expectedTests].every(([path,ids])=>currentTestShas.get(path)===ids.successor);
const currentWorkflow=gitBlobSha(readFileSync(workflowPath,'utf8'));
const currentHelper=gitBlobSha(readFileSync(helperPath,'utf8'));
const predecessorPair=currentWorkflow===workflowPre&&currentHelper===helperPre;
const successorPair=currentWorkflow===workflowPost&&currentHelper===helperPost;

test('v4.6.60 pins the exact failed B105 implementation and upstream authorization',()=>{
  assert.equal(auth.status,'READY_FOR_IMPLEMENTATION');
  assert.equal(auth.reviewed_dynamic_state.main_sha,'cbd217197c6bd13f76253e0f953ffe2beda92529');
  assert.equal(auth.failed_exact_implementation.pull_request,389);
  assert.equal(auth.failed_exact_implementation.head_sha,'1d89a5f891d14dcfa8924f71ce03d8170410eedf');
  assert.equal(auth.failed_exact_implementation.workflow_run_id,33913644099);
  assert.equal(auth.failed_exact_implementation.failed_test_count,12);
  assert.equal(auth.failed_exact_implementation.affected_test_file_count,8);
  assert.equal(auth.failed_exact_implementation.pull_request_merged,false);
  assert.equal(auth.upstream_authorization.workflow_successor_git_blob_sha,workflowPost);
  assert.equal(auth.upstream_authorization.helper_successor_git_blob_sha,helperPost);
  assert.equal(auth.upstream_authorization.b105_normalized_dom_sha256,'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7');
});

test('v4.6.60 recognizes only the exact eight-file source set or the exact eight-file B105 successor set',()=>{
  assert.equal(auth.authorized_test_successors.length,8);
  assert.deepEqual(new Set(auth.authorized_test_successors.map(x=>x.path)),new Set(expectedTests.keys()));
  for(const item of auth.authorized_test_successors){
    assert.equal(item.source_git_blob_sha,expectedTests.get(item.path).source,item.path);
  }
  assert.ok(sourceMode||successorMode,'eight historical tests are in a mixed or unauthorized state');
});

test('v4.6.60 repository transition is atomic: predecessor source set or exact authorized successor set, never partial',()=>{
  assert.ok(predecessorPair||successorPair,`unauthorized or partial workflow/helper state: ${currentWorkflow} / ${currentHelper}`);
  assert.ok((sourceMode&&predecessorPair)||(successorMode&&successorPair),'workflow/helper and eight-test compatibility modes diverged');
  const impl=auth.implementation_authorization;
  assert.equal(impl.implementation_requires_separate_slice,true);
  assert.equal(impl.authorized_paths.length,8);
  assert.equal(impl.retry_may_bundle_already_authorized_v4658_workflow_and_helper_successors,true);
  assert.equal(impl.retry_bundle_requires_exact_v4658_predecessor_blobs,true);
});

test('v4.6.60 preserves fail-closed safety boundaries and does not authorize canonical execution',()=>{
  const impl=auth.implementation_authorization;
  for(const key of ['canonical_write_authorized','run_store_edit_authorized','photo_review_status_write_authorized','executor_change_authorized','deployment_change_authorized','permission_change_authorized','runtime_or_ui_change_authorized','b105_canonical_execution_authorized','b106_candidate_or_authorization_authorized']){
    assert.equal(impl[key],false,key);
  }
  const semantics=auth.authorized_semantics.join('\n');
  assert.match(semantics,/only workflow blob 0aded293ae69be3844c73f6613f0a70b05320156/);
  assert.match(semantics,/preserve every previously accepted historical workflow blob/);
  assert.match(semantics,/preserve fail-closed rejection of wildcard/);
  assert.ok(auth.forbidden_changes.some(x=>x.includes('wildcard/current-state/unknown-descendant')));
  assert.ok(auth.forbidden_changes.some(x=>x.includes('B105 canonical execution')));
});
