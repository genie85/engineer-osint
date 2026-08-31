import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint/tests';
const b96=readFileSync(`${root}/v4511-b96-append-authorization.test.mjs`,'utf8');
const b98Readiness=readFileSync(`${root}/v4524-b98-readiness.test.mjs`,'utf8');
const b98PostCi=readFileSync(`${root}/v4525-post-b98-ci-readiness.test.mjs`,'utf8');
const b98Activation=readFileSync(`${root}/v4526-b98-activation.test.mjs`,'utf8');
const retirement=readFileSync(`${root}/v4530-first-three-overlay-retirement.test.mjs`,'utf8');

const descendantAware=[b96,b98Readiness,b98PostCi,b98Activation,retirement];

test('v4.5.43 historical migration proofs preserve anchors across append-only descendants',()=>{
  for(const source of descendantAware){
    assert.match(source,/for\(let i=b98Index\+1;i<[^;]+\.length;i\+\+\)/);
    assert.match(source,/descendant\.parent_run_id,parent\.run_id/);
    assert.match(source,/descendant\.parent_canonical_sha256,parent\.canonical_sha256/);
  }
});

test('v4.5.43 removes permanent-tip assumptions without weakening exact historical B98 hashes',()=>{
  assert.doesNotMatch(b96,/unsupported B96 authorization lifecycle tip/);
  for(const source of [b98Readiness,b98PostCi,b98Activation])assert.doesNotMatch(source,/unexpected B98 lifecycle tip/);
  assert.doesNotMatch(retirement,/assert\.equal\(current\.run_id,'engineer-osint-20260830-B98'\)/);
  for(const source of [b98Readiness,b98PostCi,b98Activation,retirement]){
    assert.match(source,/ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79/);
    assert.match(source,/4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201/);
  }
});
