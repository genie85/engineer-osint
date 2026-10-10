import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('B114 exact state retains all 52 historical entries and B113 bytes',()=>{
 const root='docs/engineer-osint',s=loadCanonicalRunStore({root});
 assert.equal(s.report.current_run_id,'engineer-osint-20261010-B114');assert.equal(s.report.canonical_sha256,'6e70d18d5aeb59c68b761c271e5c1cd74d9498cedcfaaa64bf0b044801a4e6c8');
 assert.equal(s.report.append_only_run_count,53);assert.equal(s.report.run_count,149);
 const raw=readFileSync(root+'/data/run-store-manifest.json');assert.equal(sha(raw),'cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928');
 const parent={...s.manifest,runs:s.manifest.runs.slice(0,-1)};assert.equal(parent.runs.length,52);assert.equal(sha(JSON.stringify(parent,null,2)+'\n'),'d3480581360f8ffc120d951c74a8fd597c19d03cc7e0e2f1e64ed25f492a76c3');
 for(const e of parent.runs)assert.equal(sha(readFileSync(root+'/'+e.path)),e.file_sha256);
 assert.equal(sha(readFileSync(root+'/data/runs/engineer-osint-20260928-B113.json')),'4ff481952ba2f4eb705dc3ce830e43f57f669191d93e39be090438553bb91f17');
 const tip=s.manifest.runs.at(-1);assert.equal(tip.file_sha256,'6ff3aaf5c36085d3a21662421508a1a6f2da82a38ad849805e3a53e61f4b6ca4');assert.equal(tip.parent_run_id,'engineer-osint-20260928-B113');assert.equal(tip.parent_canonical_sha256,'c7ff079cfade9b35093f4779624bee6075a7df67b8069a47f040f8ae4d6c1d9b');
 const p=s.patches.at(-1);assert.deepEqual(p.new_records.map(x=>x.id),['ENG-EVT-0152']);assert.deepEqual(p.sources.map(x=>x.id),['ENG-SRC-0639','ENG-SRC-0640','ENG-SRC-0641']);assert.deepEqual(p.evidence.map(x=>x.id),['ENG-EVID-0300']);assert.equal(p.updated_records.length,0);assert.equal(p.media.length,0);assert.equal(p.visuals.length,0);assert.equal(p.qa.multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
});
