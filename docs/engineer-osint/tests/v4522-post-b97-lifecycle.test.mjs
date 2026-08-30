import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/b97-readiness.yml','utf8');
const b96Test=readFileSync('docs/engineer-osint/tests/v4511-b96-append-authorization.test.mjs','utf8');

test('v4.5.22 historical B96 authorization remains exact when B97 becomes the current tip',()=>{
  assert.match(b96Test,/const b97='engineer-osint-20260830-B97'/);
  assert.match(b96Test,/\[b95,b96,b97\]\.includes\(store\.report\.current_run_id\)/);
  assert.match(b96Test,/const entry=store\.manifest\.runs\.find\(item=>item\.run_id===b96\)/);
  assert.match(b96Test,/entry\.parent_run_id,b95/);
  assert.match(b96Test,/entry\.parent_canonical_sha256,b95Sha/);
  assert.match(b96Test,/entry\.canonical_sha256,b96Sha/);
  assert.match(b96Test,/b97Entry\.parent_run_id,b96/);
  assert.match(b96Test,/b97Entry\.parent_canonical_sha256,b96Sha/);
});

test('B97 readiness workflow explicitly distinguishes pre-append and persistent lifecycle phases',()=>{
  assert.match(workflow,/name: Detect B97 lifecycle phase/);
  assert.match(workflow,/current==='engineer-osint-20260829-B96'\)console\.log\('PRE_B97'\)/);
  assert.match(workflow,/current==='engineer-osint-20260830-B97'\)console\.log\('POST_B97'\)/);
  assert.match(workflow,/unsupported B97 readiness lifecycle tip/);
  assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'PRE_B97'/);
  assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'POST_B97'/);
});

test('pre-B97 path retains exact dry-run while post-B97 path performs persistence audit instead of re-appending',()=>{
  const dry=workflow.indexOf('Dry-run exact reviewed B97 through standard append helper');
  const readiness=workflow.indexOf('Audit persistent-B96 to B97 readiness');
  const persistent=workflow.indexOf('Audit persistent B97 post-append state');
  assert.ok(dry>0&&readiness>dry&&persistent>readiness);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-b97-readiness\.mjs/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
});

test('post-B97 workflow publishes dedicated persistence evidence',()=>{
  assert.match(workflow,/name: Upload post-B97 persistence evidence/);
  assert.match(workflow,/b97-persistent-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow,/persistent-b97-audit\.json/);
  assert.match(workflow,/persistent-b97-audit\.md/);
});
