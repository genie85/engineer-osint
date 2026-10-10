import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';import {sha256Text} from '../lib/integrity.mjs';import {B115} from '../append-run.mjs';
test('exact B115 poststate preserves all B114 ancestry and finite DMZ identities',()=>{
 const root='docs/engineer-osint',s=loadCanonicalRunStore({root});
 assert.equal(s.report.current_run_id,B115.run);assert.equal(s.report.canonical_sha256,B115.result_canonical);assert.equal(s.report.append_only_run_count,54);
 const raw=readFileSync(root+'/data/run-store-manifest.json','utf8');assert.equal(sha256Text(raw),B115.successor_manifest_sha256);
 const parent={...s.manifest,runs:s.manifest.runs.slice(0,-1)};assert.equal(sha256Text(JSON.stringify(parent,null,2)+'\n'),B115.parent_manifest_sha256);
 for(const entry of parent.runs)assert.equal(sha256Text(readFileSync(root+'/'+entry.path)),entry.file_sha256);
 const p=s.patches.at(-1);assert.equal(sha256Text(readFileSync(root+'/data/runs/'+B115.run+'.json')),B115.candidate_sha256);
 assert.equal(p.new_records.length,0);assert.deepEqual(p.updated_records.map(x=>x.id),['ENG-EVT-0142']);assert.equal(p.sources.length,3);assert.equal(p.evidence.length,3);assert.equal(p.media.length+p.visuals.length,0);
 const card=s.data.records.records.find(x=>x.id==='ENG-EVT-0142');assert.equal(s.data.records.records.length,296);assert.equal(card.first_seen_run,'engineer-osint-20260924-B111');assert.equal(card.publication_date,'2026-09-22');assert(card.source_ids.includes('ENG-SRC-0611'));assert(card.evidence_ids.includes('ENG-EVID-0281'));
});
