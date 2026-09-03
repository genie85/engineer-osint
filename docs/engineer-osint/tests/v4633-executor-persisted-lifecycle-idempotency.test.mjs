import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const executor=readFileSync('docs/engineer-osint/authorized-canonical-executor.mjs','utf8');

test('v4.6.33 exact persisted lifecycle rerun validates base predecessor but accepts only exact successor on branch',()=>{
  assert.match(executor,/function lifecyclePlan\(authorization,baseSha,\{alreadyMaterialized=false\}=\{\}\)/);
  assert.match(executor,/const sourceRaw=alreadyMaterialized\?readBase\(baseSha,sourcePath\):assertBaseIdentity\(baseSha,sourcePath\);/);
  assert.match(executor,/const successorRaw=assertBaseIdentity\(baseSha,successorPath\);/);
  assert.match(executor,/if\(lifecycle&&readRepo\(lifecycle\.sourcePath\)!==lifecycle\.successorRaw\)throw new Error\('Persisted lifecycle successor mismatch'\);/);
});

test('v4.6.33 detects exact persisted run before choosing lifecycle verification mode',()=>{
  const runPathIndex=executor.indexOf("const runPath=`${osintRoot}/data/runs/${runId}.json`;");
  const materializedIndex=executor.indexOf('const alreadyMaterialized=existsSync(resolve(repoRoot,runPath));');
  const lifecycleIndex=executor.indexOf('const lifecycle=lifecyclePlan(authorization,baseSha,{alreadyMaterialized});');
  const branchIndex=executor.indexOf('if(alreadyMaterialized){');
  assert.ok(runPathIndex>=0);
  assert.ok(materializedIndex>runPathIndex);
  assert.ok(lifecycleIndex>materializedIndex);
  assert.ok(branchIndex>lifecycleIndex);
  assert.doesNotMatch(executor,/const lifecycle=lifecyclePlan\(authorization,baseSha\);\s*const runPath=/);
});
