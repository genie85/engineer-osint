import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const pre=readFileSync(`${root}/verify-pages-artifact-pre-b98.mjs`,'utf8');
const wrapper=readFileSync(`${root}/verify-pages-artifact.mjs`,'utf8');
const persistentB98=readFileSync(`${root}/audit-persistent-b98.mjs`,'utf8');
const b97Readiness=readFileSync('.github/workflows/b97-readiness.yml','utf8');
const readiness=readFileSync('.github/workflows/b98-readiness.yml','utf8');
const postCi=readFileSync('.github/workflows/b98-post-ci-readiness.yml','utf8');
const pages=readFileSync('.github/workflows/pages.yml','utf8');
const old24=readFileSync(`${root}/tests/v4524-b98-readiness.test.mjs`,'utf8');
const old25=readFileSync(`${root}/tests/v4525-post-b98-ci-readiness.test.mjs`,'utf8');
const old26=readFileSync(`${root}/tests/v4526-b98-activation.test.mjs`,'utf8');

const gitBlobSha=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');

test('v4.5.27 preserves the complete pre-B98 final Pages verifier byte-identically',()=>{
  assert.equal(gitBlobSha(pre),'19a151dc4eb0ee6d449f935008989028bdbb4042');
  assert.match(pre,/unsupported canonical migration phase/);
  assert.match(pre,/POST_B97/);
});

test('v4.5.27 final Pages wrapper delegates all non-B98 states and pins exact persistent B98',()=>{
  assert.match(wrapper,/verify-pages-artifact-pre-b98\.mjs/);
  assert.match(wrapper,/execFileSync/);
  assert.match(wrapper,/engineer-osint-20260830-B98/);
  assert.match(wrapper,/engineer-osint-20260830-B97/);
  assert.match(wrapper,/ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79/);
  assert.match(wrapper,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  assert.match(wrapper,/PERSISTENT_POST_APPEND/);
  assert.match(wrapper,/persistent_gap_count!==15/);
  assert.match(wrapper,/native_evidence_count!==2/);
  assert.match(wrapper,/native_assessment_count!==4/);
  assert.match(wrapper,/guard_short_circuit_count!==3/);
  assert.match(wrapper,/guarded_factual_mutation_count!==0/);
  assert.match(wrapper,/overlays_must_remain_active!==true/);
  assert.match(wrapper,/overlay_retirement_authorized!==false/);
  assert.match(wrapper,/identity_fix_migration_authorized!==false/);
  assert.match(wrapper,/allow_future_run_same_slice!==false/);
  assert.match(wrapper,/PAGES_VERIFY PASS: phase=POST_B98/);
});

test('v4.5.28 final Pages health markers exactly match the persistent B98 audit emitter',()=>{
  for(const marker of ['persistent_b98_candidate_file_sha','persistent_b98_persistent_gaps']){
    assert.match(persistentB98,new RegExp(marker));
    assert.match(wrapper,new RegExp(marker));
  }
  assert.doesNotMatch(wrapper,/persistent_b98_candidate_sha=/);
  assert.doesNotMatch(wrapper,/persistent_b98_native_gaps=/);
});

test('v4.5.27 keeps the required B97 readiness workflow green after exact B98 publication',()=>{
  assert.match(b97Readiness,/current==='engineer-osint-20260830-B98'\)console\.log\('POST_B98'\)/);
  assert.match(b97Readiness,/Verify historical B97 lineage under persistent B98/);
  assert.match(b97Readiness,/HISTORICAL_B97_UNDER_PERSISTENT_B98/);
  assert.match(b97Readiness,/historical B97 manifest lineage\/hash drift/);
  assert.match(b97Readiness,/canonical_write_performed:false/);
  assert.doesNotMatch(b97Readiness,/append-run\.mjs[^\n]*--write/);
});

for(const [name,workflow] of [['B98 readiness',readiness],['B98 post-CI',postCi]]){
  test(`v4.5.27 ${name} workflow has symmetric PRE_B98 and POST_B98 lifecycle paths`,()=>{
    assert.match(workflow,/Detect B98 lifecycle phase/);
    assert.match(workflow,/phase=PRE_B98/);
    assert.match(workflow,/phase=POST_B98/);
    assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'PRE_B98'/);
    assert.match(workflow,/steps\.lifecycle\.outputs\.phase == 'POST_B98'/);
    assert.match(workflow,/audit-persistent-b98\.mjs/);
    assert.match(workflow,/PERSISTENT_POST_APPEND/);
    assert.match(workflow,/MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION/);
    assert.match(workflow,/overlay_retirement_authorized!==false/);
    assert.match(workflow,/identity_fix_migration_authorized!==false/);
    assert.doesNotMatch(workflow,/append-run\.mjs[^\n]*--write/);
  });
}

test('v4.5.27 keeps Pages lifecycle gate ahead of PUBLIC-CZ and final verification',()=>{
  assert.match(pages,/else if\(run==='engineer-osint-20260830-B98'\)phase='POST_B98'/);
  assert.match(pages,/Audit persistent B98 post-append state/);
  const persistent=pages.indexOf('Audit persistent B98 post-append state');
  const gate=pages.indexOf('Gate POST_B98 Pages readiness');
  const publicCz=pages.indexOf('Audit PUBLIC-CZ-UI runtime');
  const finalVerify=pages.indexOf('Verify deployable artifact and freshness');
  assert.ok(persistent>0&&gate>persistent&&publicCz>gate&&finalVerify>publicCz);
});

test('v4.5.27 historical B98 tests preserve exact anchors and permit only append-only descendants',()=>{
  for(const source of [old24,old25,old26]){
    assert.match(source,/engineer-osint-20260830-B97/);
    assert.match(source,/engineer-osint-20260830-B98/);
    assert.match(source,/const b98Index=manifest\.runs\.findIndex\(item=>item\.run_id===b98Id\)/);
    assert.match(source,/for\(let i=b98Index\+1;i<manifest\.runs\.length;i\+\+\)/);
    assert.match(source,/descendant\.parent_run_id,parent\.run_id/);
    assert.match(source,/descendant\.parent_canonical_sha256,parent\.canonical_sha256/);
    assert.doesNotMatch(source,/unexpected B98 lifecycle tip/);
  }
  assert.match(old24,/ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79/);
  assert.match(old24,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  assert.match(old25,/exact_candidate_file_sha256/);
  assert.match(old26,/authorization\.exact_candidate_file_sha256/);
});
