// Synthetic fixture only; never calls append-run or production writer.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const work=realpathSync(process.argv[2]);assert.equal(realpathSync(process.cwd()),work);assert.ok(!existsSync(join(work,'.git')),'Git checkout forbidden');
const root=join(work,'docs/engineer-osint');
const {loadCanonicalRunStore,applyStrictPatchToCanonicalData}=await import(pathToFileURL(join(root,'lib/run-store.mjs')));
const {canonicalDigest,sha256Text}=await import(pathToFileURL(join(root,'lib/integrity.mjs')));
const raw=readFileSync(join(work,'candidate.json'),'utf8');assert.equal(sha256Text(raw),'6ff3aaf5c36085d3a21662421508a1a6f2da82a38ad849805e3a53e61f4b6ca4');
const manifest=join(root,'data/run-store-manifest.json');assert.equal(sha256Text(readFileSync(manifest)),'d3480581360f8ffc120d951c74a8fd597c19d03cc7e0e2f1e64ed25f492a76c3');
const s=loadCanonicalRunStore({root});assert.equal(s.report.current_run_id,'engineer-osint-20260928-B113');assert.equal(s.report.canonical_sha256,'c7ff079cfade9b35093f4779624bee6075a7df67b8069a47f040f8ae4d6c1d9b');
const p=JSON.parse(raw);assert.equal(p.state.run_id,'engineer-osint-20261010-B114');
const result=applyStrictPatchToCanonicalData(s.data,p);const digest=canonicalDigest(result);assert.equal(digest,'6e70d18d5aeb59c68b761c271e5c1cd74d9498cedcfaaa64bf0b044801a4e6c8');
const entry={run_id:p.state.run_id,parent_run_id:s.report.current_run_id,parent_canonical_sha256:s.report.canonical_sha256,path:`data/runs/${p.state.run_id}.json`,file_sha256:sha256Text(raw),canonical_sha256:digest};
const next=JSON.stringify({...s.manifest,runs:[...s.manifest.runs,entry]},null,2)+'\n';assert.equal(sha256Text(next),'cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928');
assert.ok(!existsSync(join(root,entry.path)));writeFileSync(join(work,'NONCANONICAL_SIMULATION.txt'),'Not approved import. No execution authority.\n',{flag:'wx'});writeFileSync(join(root,entry.path),raw,{flag:'wx'});writeFileSync(manifest,next);
console.log(JSON.stringify({fixture_only:true,authority_granted:false,entry}));
