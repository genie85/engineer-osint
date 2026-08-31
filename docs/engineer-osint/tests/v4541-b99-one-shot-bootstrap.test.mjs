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
  assert.equal(target?.run_file_sha256,'ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab');
  assert.equal(target?.canonical_sha256,'754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30');
  return false;
};

test('v4.5.41 builds the production artifact before regenerating B99',()=>{
  if(!assertHistoricalWorkflowOrAuthorizedRemoval())return;
  const build=workflow.indexOf('node docs/engineer-osint/build-pages.mjs');
  const exists=workflow.indexOf('test -s docs/engineer-osint-dist/index.html');
  const generate=workflow.indexOf('node docs/engineer-osint/build-identity-fix-b99-mirror-sync-candidate.mjs');
  assert.ok(build>=0);
  assert.ok(exists>build);
  assert.ok(generate>exists);
  assert.match(workflow,/node docs\/engineer-osint\/materialize-canonical-media-history\.mjs/);
});

test('v4.5.41 keeps the exact B99 guard, branch and no-direct-main-write boundary',()=>{
  if(!assertHistoricalWorkflowOrAuthorizedRemoval())return;
  assert.match(workflow,/ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab/);
  assert.match(workflow,/754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30/);
  assert.match(workflow,/B99_RESULT_BRANCH: automation\/b99-append-result-v1/);
  assert.match(workflow,/append-run\.mjs docs\/engineer-osint-dist\/identity-fix-b99-mirror-sync-candidate\.json --write/);
  assert.match(workflow,/git switch -c "\$B99_RESULT_BRANCH"/);
  assert.match(workflow,/git push origin "\$B99_RESULT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push origin main/);
});
