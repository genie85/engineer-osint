import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

const ROOT='docs/engineer-osint';
const FINAL_RUN='engineer-osint-20260924-B112';
const FINAL_DIGEST='39b41f5af58d33982fe60f9eea5b993eef740db35838521084adf02d0abb92e4';
const RUNS=[
  ['engineer-osint-20260904-B106','56b4896445fd48d201c38a6d807a6600f7fc407f5a1d880c969f579029b6fc76'],
  ['engineer-osint-20260923-B107','3b76a3bc86ad30d37be44b13ae708cc62ad644062ee63f8ce7a704f83b9f8f5f'],
  ['engineer-osint-20260923-B108','c0c172364b4ee5ca83bc4037157ac3c64259f24fdf3dec657a7f96b841e2bae0'],
  ['engineer-osint-20260923-B109','eb84b278234466ddfe205fd77d757fb40839f0ea7f5706503b316b3d3f500263'],
  ['engineer-osint-20260924-B110','1a654e258995bd253345c26ddd0aba432eb49a658eaf12e2b055774616e281d5'],
  ['engineer-osint-20260924-B111','d5dccef52b4a4170d69fb33c70f27e8977fce6713cda288568f6e80b0899eeae'],
  ['engineer-osint-20260924-B112','7920c05fb7ff4f4292df5c28bc7a8f81251bc1e698543d66f17bce2de6788796']
];
const sha256=value=>createHash('sha256').update(value).digest('hex');
const json=path=>JSON.parse(readFileSync(path,'utf8'));

test('post-B112 guard pins the complete append-only publication chain',()=>{
  const {manifest,patches,report}=loadCanonicalRunStore({root:ROOT});
  assert.equal(report.current_run_id,FINAL_RUN);
  assert.equal(report.canonical_sha256,FINAL_DIGEST);
  assert.equal(report.run_count,147);
  assert.equal(report.append_only_run_count,51);
  const tail=manifest.runs.slice(-RUNS.length);
  assert.deepEqual(tail.map(entry=>[entry.run_id,entry.file_sha256]),RUNS);
  assert.equal(tail[0].parent_run_id,'engineer-osint-20260904-B105');
  assert.equal(tail[0].parent_canonical_sha256,'a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9');
  assert.equal(tail.at(-1).canonical_sha256,FINAL_DIGEST);

  const published=patches.slice(-RUNS.length);
  assert.deepEqual(published.map(patch=>patch.state.run_id),RUNS.map(([id])=>id));
  assert.equal(published.reduce((sum,patch)=>sum+patch.new_records.length,0),54);
  assert.equal(published.reduce((sum,patch)=>sum+patch.updated_records.length,0),11);
  assert.equal(published.reduce((sum,patch)=>sum+patch.sources.length,0),100);
  assert.equal(published.reduce((sum,patch)=>sum+patch.evidence.length,0),74);
  assert.equal(published.reduce((sum,patch)=>sum+patch.visuals.length,0),2);
  assert.equal(published.reduce((sum,patch)=>sum+patch.state.counts.CORRECTION,0),1);
  for(const patch of published.slice(1)){
    assert.equal(patch.qa.multimedia_status,'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
  }
});

test('B106 execution is byte-pinned to its narrow authorization',()=>{
  const authRaw=readFileSync(`${ROOT}/B106_STRICT_APPEND_AUTHORIZATION_20260920.json`,'utf8');
  const auth=JSON.parse(authRaw);
  const candidateRaw=readFileSync(`${ROOT}/${auth.candidate_path.replace('docs/engineer-osint/','')}`,'utf8');
  const runRaw=readFileSync(`${ROOT}/data/runs/engineer-osint-20260904-B106.json`,'utf8');
  assert.equal(sha256(authRaw),'c26d8663eaedf260142add8744b6ae87010b20cbf8d61b8fd7bdb09430bccf1c');
  assert.equal(sha256(candidateRaw),auth.exact_candidate_file_sha256);
  assert.equal(runRaw,candidateRaw);
  assert.equal(auth.authorization.append_exact_candidate_only,true);
  for(const [key,value] of Object.entries(auth.authorization)){
    if(key!=='append_exact_candidate_only')assert.equal(value,false,`${key} must remain denied`);
  }
});

test('B106 local-image lifecycle and binaries are exact',()=>{
  const lifecycleRaw=readFileSync(`${ROOT}/photo-review-batches/v4588.json`,'utf8');
  assert.equal(lifecycleRaw,readFileSync(`${ROOT}/photo-review-candidates/v4653-b106-v4588-local-image-status.json`,'utf8'));
  const lifecycle=JSON.parse(lifecycleRaw);
  const expected=new Map([
    ['ENG-TECH-0038',['assets/photos/eng-tech-0038-mv-10.webp','7113afc3b4ddfbdb466bc509191747659012705cb6833cdd8cc5ff525cbf9caa']],
    ['ENG-TECH-0041',['assets/photos/eng-tech-0041-uran-6.webp','debf811805bbd54cd8bf4eb6aa6978c5b1a5dc78669e1a99b2e087759d035797']]
  ]);
  for(const item of lifecycle.entries){
    if(!expected.has(item.card_id))continue;
    const [path,digest]=expected.get(item.card_id);
    assert.equal(item.status,'LOCAL_IMAGE');
    assert.equal(item.local_image_path,path);
    assert.equal(item.sha256,digest);
    assert.equal(sha256(readFileSync(`${ROOT}/${path}`)),digest);
    expected.delete(item.card_id);
  }
  assert.equal(expected.size,0,'both B106 lifecycle entries must exist');
});

test('publication receipt and Czech source labels match the canonical result',()=>{
  const receipt=json(`${ROOT}/ENGINEER_INTAKE_B106_B112_EXECUTION_RECEIPT_20260924.json`);
  assert.equal(receipt.final_run_id,FINAL_RUN);
  assert.equal(receipt.final_canonical_sha256,FINAL_DIGEST);
  assert.deepEqual(receipt.run_ids,RUNS.map(([id])=>id));
  assert.deepEqual(Object.entries(receipt.run_file_sha256),RUNS);
  const {patches}=loadCanonicalRunStore({root:ROOT});
  const sources=patches.slice(-6).flatMap(patch=>patch.sources);
  assert.equal(sources.length,100);
  for(const source of sources){
    assert.equal(typeof source.title_cs,'string',`${source.id} has no title_cs`);
    assert.notEqual(source.title_cs.trim(),'');
    assert.notEqual(source.title_cs,source.title,`${source.id} title_cs is not explicit`);
  }
});
