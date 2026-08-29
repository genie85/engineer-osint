import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const audit=fs.readFileSync(new URL('../audit-overlay-assessment-evidence.mjs',import.meta.url),'utf8');
const stageB=fs.readFileSync(new URL('../audit-overlay-stage-b-intelligence.mjs',import.meta.url),'utf8');
const review=JSON.parse(fs.readFileSync(new URL('../V457_ASSESSMENT_EVIDENCE_REVIEW.json',import.meta.url),'utf8'));

test('v4.5.7 creates exactly two source-scoped evidence candidates and four assessments',()=>{
  assert.equal(review.evidence_candidates.length,2);
  assert.equal(review.assessment_candidates.length,4);
  assert.equal(review.candidate_run_id,'engineer-osint-20260830-B98');
  assert.equal(review.expected_parent_run_id,'engineer-osint-20260830-B97');
  assert.match(audit,/expected 2 evidence and 4 assessment candidates/);
});

test('Türkiye evidence encodes source-scope limitation rather than claiming real-world absence',()=>{
  const item=review.evidence_candidates.find(x=>x.key==='TURKIYE_EUPHRATES_SOURCE_SCOPE');
  assert.deepEqual(item.source_ids,['RICH-SRC-012']);
  assert.equal(item.related_id,'ENG-EVT-0021');
  assert.match(item.what_it_does_not_prove_en,/limitation of this source's public scope/i);
  assert.match(item.what_it_does_not_prove_en,/not evidence that those attributes did not exist/i);
});

test('U.S. assessment evidence is limited to the directly reviewed official demonstration',()=>{
  const item=review.evidence_candidates.find(x=>x.key==='USA_DRONE_BANGALORE_OFFICIAL_DEMONSTRATION');
  assert.deepEqual(item.source_ids,['RICH-SRC-015']);
  assert.equal(item.related_id,'ENG-SIG-0006');
  assert.match(item.what_it_supports_en,/reduce risk to Soldiers/i);
  assert.match(item.what_it_supports_en,/future TTP/i);
  assert.match(item.what_it_does_not_prove_en,/electronic-warfare resilience/i);
  assert.match(item.what_it_does_not_prove_en,/contested electromagnetic/i);
});

test('broader legacy EW and contested-electromagnetic implications are deliberately removed',()=>{
  const staff=review.assessment_candidates.find(x=>x.legacy_field==='staff_relevance');
  const training=review.assessment_candidates.find(x=>x.legacy_field==='training_relevance');
  assert.doesNotMatch(staff.assessment,/EW-resilient|electronic warfare/i);
  assert.doesNotMatch(training.assessment,/contested-electromagnetic|failure modes/i);
  assert.match(staff.limitations,/does not establish electronic-warfare resilience/i);
  assert.match(training.limitations,/No claim is made here about contested-electromagnetic performance/i);
});

test('every assessment is bound to evidence with a common explicit target and reviewed source',()=>{
  assert.match(audit,/evidence has no explicit common target/);
  assert.match(audit,/evidence has no reviewed-source intersection/);
  assert.match(audit,/supporting_evidence_ids:\[evidenceId\]/);
  assert.match(audit,/related_ids:\[\.\.\.candidate\.related_ids\]/);
});

test('B98 is validated through strict evidence and Intelligence v1 materialization',()=>{
  assert.match(audit,/validateIntelligenceExtensionV1\(patch\)/);
  assert.match(audit,/applyStrictPatchToCanonicalData\(structuredClone\(afterAB\),patch\)/);
  assert.match(audit,/NEW_EVIDENCE:evidence\.length/);
  assert.match(audit,/ENG-ASMT-B98-OVL-/);
  assert.match(audit,/ENG-EVID-/);
});

test('post B96+B97+B98 residuals cannot expand and persistent writes remain disabled',()=>{
  assert.match(audit,/added=signatures\.filter\(signature=>!prior\.has\(signature\)\)/);
  assert.match(audit,/unexpected\.length===0\?'PASS':'FAIL'/);
  assert.match(audit,/safe_to_append:false/);
  assert.match(audit,/safe_to_retire_overlays:false/);
  assert.doesNotMatch(audit,/append-run\.mjs/);
  for(const value of Object.values(review.safety))assert.equal(value,false);
});

test('v4.5.7 executes only after v4.5.6 passes',()=>{
  assert.match(stageB,/if\(status!=='PASS'\)throw new Error/);
  assert.match(stageB,/await import\('\.\/audit-overlay-assessment-evidence\.mjs'\)/);
});
