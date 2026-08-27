import test from 'node:test';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCanonicalRunStore,applyStrictPatchToCanonicalData} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

test('B75 diagnostic canonical digest',()=>{
  const root=mkdtempSync(join(tmpdir(),'engineer-b75-'));
  cpSync('docs/engineer-osint/data',join(root,'data'),{recursive:true});
  const manifestPath=join(root,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  const last=manifest.runs.pop();
  if(last?.run_id!=='engineer-osint-20260826-B75')throw new Error('Expected staged B75 tip');
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  rmSync(join(root,'data/runs/engineer-osint-20260826-B75.json'));
  const store=loadCanonicalRunStore({root});
  const patch=JSON.parse(readFileSync('docs/engineer-osint/data/runs/engineer-osint-20260826-B75.json','utf8'));
  const result=applyStrictPatchToCanonicalData(store.data,patch);
  console.log('B75_CANONICAL_DIGEST='+canonicalDigest(result));
});
