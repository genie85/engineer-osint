import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/b99-one-shot-publish.yml','utf8');

test('v4.5.41 builds the production artifact before regenerating B99',()=>{
  const build=workflow.indexOf('node docs/engineer-osint/build-pages.mjs');
  const exists=workflow.indexOf('test -s docs/engineer-osint-dist/index.html');
  const generate=workflow.indexOf('node docs/engineer-osint/build-identity-fix-b99-mirror-sync-candidate.mjs');
  assert.ok(build>=0);
  assert.ok(exists>build);
  assert.ok(generate>exists);
  assert.match(workflow,/node docs\/engineer-osint\/materialize-canonical-media-history\.mjs/);
});

test('v4.5.41 keeps the exact B99 guard, branch and no-direct-main-write boundary',()=>{
  assert.match(workflow,/ff4aec190cd5db28bca9a70ed7099183770610dff97820aa9d1facd5e384c2ab/);
  assert.match(workflow,/754b42bae6205aff71a8f5fdcaf3217313ccdd9089145219314d8b9497f84a30/);
  assert.match(workflow,/B99_RESULT_BRANCH: automation\/b99-append-result-v1/);
  assert.match(workflow,/append-run\.mjs docs\/engineer-osint-dist\/identity-fix-b99-mirror-sync-candidate\.json --write/);
  assert.match(workflow,/git switch -c "\$B99_RESULT_BRANCH"/);
  assert.match(workflow,/git push origin "\$B99_RESULT_BRANCH"/);
  assert.doesNotMatch(workflow,/git push origin main/);
});
