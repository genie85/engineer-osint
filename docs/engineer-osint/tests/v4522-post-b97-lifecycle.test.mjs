import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const workflowPath='.github/workflows/b97-readiness.yml';
const workflow=existsSync(workflowPath)?readFileSync(workflowPath,'utf8'):null;
const b96Test=readFileSync(`${root}/tests/v4511-b96-append-authorization.test.mjs`,'utf8');
const v4553=existsSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`)?JSON.parse(readFileSync(`${root}/V4553_READONLY_WORKFLOW_REMOVAL.json`,'utf8')):null;
const assertHistoricalWorkflow=()=>{
  assert.ok(v4553,'B97 readiness workflow missing without v4.5.53 removal evidence');
  const removed=v4553.removed_targets.find(x=>x.file==='b97-readiness.yml');
  assert.ok(removed);
  assert.equal(removed.git_blob_sha,'054ae37c1d57352057c817784c962968011b5409');
};

test('v4.5.22 historical B96 authorization remains exact through B97/B98 and later append-only descendants',()=>{
  assert.match(b96Test,/const b97='engineer-osint-20260830-B97'/);
  assert.match(b96Test,/const b98='engineer-osint-20260830-B98'/);
  assert.match(b96Test,/const b96Index=store\.manifest\.runs\.findIndex\(item=>item\.run_id===b96\)/);
  assert.match(b96Test,/entry\.parent_run_id,b95/);
  assert.match(b96Test,/entry\.parent_canonical_sha256,b95Sha/);
  assert.match(b96Test,/entry\.canonical_sha256,b96Sha/);
  assert.match(b96Test,/b97Entry\.parent_run_id,b96/);
  assert.match(b96Test,/b97Entry\.parent_canonical_sha256,b96Sha/);
  assert.match(b96Test,/b98Entry\.parent_run_id,b97/);
  assert.match(b96Test,/b98Entry\.parent_canonical_sha256,b97Sha/);
  assert.match(b96Test,/for\(let i=b98Index\+1;i<store\.manifest\.runs\.length;i\+\+\)/);
  assert.match(b96Test,/descendant\.parent_run_id,parent\.run_id/);
  assert.match(b96Test,/descendant\.parent_canonical_sha256,parent\.canonical_sha256/);
  assert.match(b96Test,/store\.report\.current_run_id,current\.run_id/);
  assert.match(b96Test,/store\.report\.canonical_sha256,current\.canonical_sha256/);
  assert.doesNotMatch(b96Test,/unsupported B96 authorization lifecycle tip/);
});

test('B97 readiness workflow explicitly distinguishes pre-append, persistent B97 and historical-under-B98 phases',()=>{
  if(!workflow){assertHistoricalWorkflow();return;}
  assert.match(workflow,/name: Detect B97 lifecycle phase/);
  assert.match(workflow,/current==='engineer-osint-20260829-B96'\)console\.log\('PRE_B97'\)/);
  assert.match(workflow,/current==='engineer-osint-20260830-B97'\)console\.log\('POST_B97'\)/);
  assert.match(workflow,/current==='engineer-osint-20260830-B98'\)console\.log\('POST_B98'\)/);
  assert.match(workflow,/unsupported B97 readiness lifecycle tip/);
  assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'PRE_B97'/);
  assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'POST_B97'/);
  assert.match(workflow,/if: steps\.lifecycle\.outputs\.phase == 'POST_B98'/);
});

test('pre-B97 path retains exact dry-run while post-B97 path performs persistence audit instead of re-appending',()=>{
  if(!workflow){assertHistoricalWorkflow();return;}
  const dry=workflow.indexOf('Dry-run exact reviewed B97 through standard append helper');
  const readiness=workflow.indexOf('Audit persistent-B96 to B97 readiness');
  const persistent=workflow.indexOf('Audit persistent B97 post-append state');
  assert.ok(dry>0&&readiness>dry&&persistent>readiness);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-b97-readiness\.mjs/);
  assert.match(workflow,/node docs\/engineer-osint\/audit-persistent-b97\.mjs/);
  assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
});

test('post-B98 B97 lifecycle verifies immutable historical lineage instead of requiring B97 to remain tip',()=>{
  if(!workflow){assertHistoricalWorkflow();return;}
  assert.match(workflow,/Verify historical B97 lineage under persistent B98/);
  assert.match(workflow,/HISTORICAL_B97_UNDER_PERSISTENT_B98/);
  assert.match(workflow,/b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad/);
  assert.match(workflow,/9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4/);
  assert.match(workflow,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  assert.match(workflow,/historical B97 manifest lineage\/hash drift/);
  assert.match(workflow,/b97-historical-lineage-under-b98\.json/);
  assert.match(workflow,/canonical_write_performed:false/);
});

test('post-B97 and post-B98 workflow publish dedicated lifecycle evidence',()=>{
  if(!workflow){assertHistoricalWorkflow();return;}
  assert.match(workflow,/name: Upload post-B97 persistence evidence/);
  assert.match(workflow,/b97-persistent-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow,/persistent-b97-audit\.json/);
  assert.match(workflow,/persistent-b97-audit\.md/);
  assert.match(workflow,/name: Upload historical B97-under-B98 evidence/);
  assert.match(workflow,/b97-historical-under-b98-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
});
