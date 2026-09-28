import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';
import {B113} from '../append-run.mjs';

const ROOT='docs/engineer-osint';
const sha=value=>createHash('sha256').update(value).digest('hex');

test('B113 is the exact approved successor of the immutable B112 anchor',()=>{
 const {manifest,patches,report}=loadCanonicalRunStore({root:ROOT});
 assert.equal(report.current_run_id,B113.run);
 assert.equal(report.canonical_sha256,B113.result_canonical);
 assert.equal(report.run_count,148);
 assert.equal(report.append_only_run_count,52);
 const parent=manifest.runs.at(-2),tip=manifest.runs.at(-1);
 assert.equal(parent.run_id,B113.parent);
 assert.equal(parent.canonical_sha256,B113.parent_canonical);
 assert.deepEqual(tip,{
  run_id:B113.run,parent_run_id:B113.parent,parent_canonical_sha256:B113.parent_canonical,
  path:'data/runs/engineer-osint-20260928-B113.json',file_sha256:B113.candidate_sha256,
  canonical_sha256:B113.result_canonical
 });
 const candidate=readFileSync(B113.candidate);
 const canonical=readFileSync(`${ROOT}/${tip.path}`);
 assert.equal(sha(candidate),B113.candidate_sha256);
 assert.deepEqual(canonical,candidate);
 const patch=patches.at(-1);
 assert.equal(patch.new_records.length,1);
 assert.equal(patch.new_records[0].id,'ENG-EVT-0151');
 assert.equal(patch.new_records[0].summary_cs,'Podle rady hrabství Cornwall byla 23. září 2026 nevybuchlá munice z druhé světové války bezpečně odstraněna z oblasti přístavu Falmouth a evakuační uzávěra byla zrušena. Královské námořnictvo potvrdilo účast jednotky Bravo Squadron. Dokončení pozdější likvidace munice na moři tento podklad nedokládá.');
 assert.deepEqual(patch.sources.map(source=>source.id),['ENG-SRC-0637','ENG-SRC-0638']);
 assert.deepEqual(patch.evidence.map(evidence=>evidence.id),['ENG-EVID-0299']);
 assert.equal(patch.media.length,0);
});
