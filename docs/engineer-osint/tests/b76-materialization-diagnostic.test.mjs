import test from 'node:test';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore,applyStrictPatchToCanonicalData} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

test('B76 diagnostic canonical digest',()=>{
  const store=loadCanonicalRunStore({root:'docs/engineer-osint'});
  if(store.manifest.runs.at(-1)?.run_id!=='engineer-osint-20260826-B75') throw new Error('Expected B75 published tip');
  const patch=JSON.parse(readFileSync('docs/engineer-osint/data/runs/engineer-osint-20260826-B76.json','utf8'));
  const result=applyStrictPatchToCanonicalData(store.data,patch);
  console.log('B76_CANONICAL_DIGEST='+canonicalDigest(result));
});
