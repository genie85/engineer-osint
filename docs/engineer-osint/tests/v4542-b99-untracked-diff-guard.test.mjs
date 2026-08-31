import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowPath='.github/workflows/b99-one-shot-publish.yml';
const workflow=existsSync(workflowPath)?readFileSync(workflowPath,'utf8'):null;
const assertHistoricalWorkflowOrAuthorizedRemoval=()=>{
  if(workflow!==null)return true;
  const removal=JSON.parse(readFileSync(`${root}/V4550_ONE_SHOT_WORKFLOW_REMOVAL.json`,'utf8'));
  const target=removal.removed_targets.find(x=>x.file==='b99-one-shot-publish.yml');
  assert.equal(removal.status,'AUTHORIZED_EXACT_FOUR_ONE_SHOTS_REMOVED');
  assert.equal(target?.git_blob_sha,'f07660fd524e44904b24e0b8e04dae538e7c8ac2');
  assert.equal(target?.historical_run_id,'engineer-osint-20260830-B99');
  assert.equal(target?.run_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(target?.canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  return false;
};

test('v4.5.42 exact diff guard includes the newly created untracked B99 run',()=>{
  if(!assertHistoricalWorkflowOrAuthorizedRemoval())return;
  const guard=workflow.indexOf('- name: Require exact two-file append diff');
  assert.ok(guard>=0);
  const slice=workflow.slice(guard, workflow.indexOf('- name: Push isolated B99 review branch', guard));
  assert.match(slice,/git diff --name-only -- docs\/engineer-osint\/data/);
  assert.match(slice,/git ls-files --others --exclude-standard -- docs\/engineer-osint\/data/);
  assert.match(slice,/\| sort -u/);
  assert.match(slice,/test "\$\{#changed\[@\]\}" -eq 2/);
  assert.match(slice,/docs\/engineer-osint\/data\/run-store-manifest\.json/);
  assert.match(slice,/docs\/engineer-osint\/data\/runs\/engineer-osint-20260830-B99\.json/);
});

test('v4.5.42 preserves exact B99 hashes and isolated-review-branch boundary',()=>{
  if(!assertHistoricalWorkflowOrAuthorizedRemoval())return;
  assert.match(workflow,/ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab/);
  assert.match(workflow,/754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30/);
  assert.match(workflow,/B99_RESULT_BRANCH: automation\/b99-append-result-v1/);
  assert.match(workflow,/git add docs\/engineer-osint\/data\/run-store-manifest\.json docs\/engineer-osint\/data\/runs\/engineer-osint-20260830-B99\.json/);
  assert.match(workflow,/git push origin "\$B99_RESULT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push origin main/);
});
