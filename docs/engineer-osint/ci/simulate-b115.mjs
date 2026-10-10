// Synthetic fixture only; never calls append-run or production writer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const work=realpathSync(process.argv[2]);assert.equal(realpathSync(process.cwd()),work);assert.ok(!existsSync(join(work,'.git')),'Git checkout forbidden');
const root=join(work,'docs/engineer-osint');
const {loadCanonicalRunStore,applyStrictPatchToCanonicalData}=await import(pathToFileURL(join(root,'lib/run-store.mjs')));
const {canonicalDigest,sha256Text}=await import(pathToFileURL(join(root,'lib/integrity.mjs')));
const raw=readFileSync(join(work,'candidate.json'),'utf8');assert.equal(sha256Text(raw),'af62329bc1f7a6c0cc27011300031e2891a2d871bf6ce4ffc0b5e293fbda7b44');
const manifest=join(root,'data/run-store-manifest.json');assert.equal(sha256Text(readFileSync(manifest)),'cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928');
const s=loadCanonicalRunStore({root});assert.equal(s.report.current_run_id,'engineer-osint-20261010-B114');assert.equal(s.report.canonical_sha256,'6e70d18d5aeb59c68b761c271e5c1cd74d9498cedcfaaa64bf0b044801a4e6c8');
const p=JSON.parse(raw);assert.equal(p.state.run_id,'engineer-osint-20261010-B115');
const result=applyStrictPatchToCanonicalData(s.data,p);const digest=canonicalDigest(result);assert.equal(digest,'1a0e5b1272f928c0f20d815d091a77c2646dbc755a6e6274a6416ed758a6335f');
const entry={run_id:p.state.run_id,parent_run_id:s.report.current_run_id,parent_canonical_sha256:s.report.canonical_sha256,path:`data/runs/${p.state.run_id}.json`,file_sha256:sha256Text(raw),canonical_sha256:digest};
const next=JSON.stringify({...s.manifest,runs:[...s.manifest.runs,entry]},null,2)+'\n';assert.equal(sha256Text(next),'b2aaea408de90d214b1519748c288e0dbd16a2d647d2f4eb549237be7dc16f7b');
assert.ok(!existsSync(join(root,entry.path)));writeFileSync(join(work,'NONCANONICAL_SIMULATION.txt'),'Not approved import. No execution authority.\n',{flag:'wx'});writeFileSync(join(root,entry.path),raw,{flag:'wx'});writeFileSync(manifest,next);
console.log(JSON.stringify({fixture_only:true,authority_granted:false,entry}));
