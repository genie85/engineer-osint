import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {canonicalDigest,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore,validatePatchOperations} from './lib/run-store.mjs';

const source='docs/engineer-osint',input=process.argv[2],write=process.argv.includes('--write');
if(!input)throw new Error('Usage: node docs/engineer-osint/append-run.mjs <fresh-patch.json> [--write]');
const raw=readFileSync(input,'utf8'),patch=parseJsonStrict(raw,{source:input});
validatePatchOperations(patch);
const store=loadCanonicalRunStore({root:source});
if(patch.state.parent_run_id!==store.report.current_run_id)throw new Error(`Stale parent: expected ${store.report.current_run_id}, got ${patch.state.parent_run_id}`);
const result=applyStrictPatchToCanonicalData(store.data,patch),runId=patch.state.run_id;
const normalized=JSON.stringify(patch,null,2)+'\n';
const relative=`data/runs/${runId}.json`,destination=join(source,relative);
if(existsSync(destination))throw new Error(`Append-only run already exists: ${destination}`);
const entry={
  run_id:runId,parent_run_id:store.report.current_run_id,parent_canonical_sha256:store.report.canonical_sha256,
  path:relative,file_sha256:sha256Text(normalized),canonical_sha256:canonicalDigest(result)
};
const manifest={...store.manifest,runs:[...store.manifest.runs,entry]};
const plan={status:write?'APPENDED':'VALIDATED_DRY_RUN',input:basename(input),entry};
if(write){
  const manifestPath=join(source,'data/run-store-manifest.json'),runTemp=`${destination}.tmp`,manifestTemp=`${manifestPath}.tmp`;
  writeFileSync(runTemp,normalized,{encoding:'utf8',flag:'wx'});
  writeFileSync(manifestTemp,JSON.stringify(manifest,null,2)+'\n',{encoding:'utf8',flag:'wx'});
  renameSync(runTemp,destination);
  renameSync(manifestTemp,manifestPath);
  const verified=loadCanonicalRunStore({root:source});
  if(verified.report.current_run_id!==runId||verified.report.canonical_sha256!==entry.canonical_sha256)throw new Error('Post-write run-store verification failed');
}
console.log(JSON.stringify(plan,null,2));
