import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const policy=JSON.parse(readFileSync(`${root}/V4517_B97_READINESS.json`,'utf8'));
const candidateRaw=readFileSync(`${root}/V4517_B97_PATCH_CANDIDATE.json`,'utf8');
const candidate=JSON.parse(candidateRaw);
const audit=readFileSync(`${root}/audit-b97-readiness.mjs`,'utf8');
const workflow=readFileSync('.github/workflows/b97-readiness.yml','utf8');
const sha256=text=>createHash('sha256').update(text).digest('hex');

test('v4.5.17 pins the exact reviewed B97 candidate to persistent B96',()=>{
  assert.equal(policy.schema_version,'engineer-osint-b97-readiness-v1');
  assert.equal(policy.status,'BLOCKED_PENDING_POST_B97_CI_READINESS');
  assert.equal(policy.candidate_run_id,'engineer-osint-20260830-B97');
  assert.equal(policy.expected_parent_run_id,'engineer-osint-20260829-B96');
  assert.equal(policy.expected_parent_canonical_sha256,'4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5');
  assert.equal(sha256(candidateRaw),policy.exact_candidate_file_sha256);
  assert.equal(policy.exact_candidate_file_sha256,'b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad');
  assert.equal(policy.expected_resulting_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.equal(candidate.state.run_id,policy.candidate_run_id);
  assert.equal(candidate.state.parent_run_id,policy.expected_parent_run_id);
});

test('B97 candidate is native gaps only with zero canonical research delta',()=>{
  const intel=candidate.extensions.intelligence_v1;
  assert.equal(intel.gaps.length,15);
  assert.equal(intel.assessments.length,0);
  assert.equal(intel.contradictions.length,0);
  assert.deepEqual(intel.gaps.map(item=>item.gap_id),Array.from({length:15},(_,i)=>`ENG-GAP-B97-OVL-${String(i+1).padStart(3,'0')}`));
  for(const value of Object.values(candidate.state.counts))assert.equal(value,0);
  for(const value of Object.values(candidate.true_delta))assert.equal(value,0);
  for(const field of ['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'])assert.equal(candidate[field].length,0);
  assert.equal(candidate.extensions.operations_v1,undefined);
});

test('B97 readiness uses standard append-run dry-run and forbids persistent writes',()=>{
  assert.equal(policy.authorization.append_allowed,false);
  assert.equal(policy.authorization.standard_append_run_dry_run_required,true);
  assert.equal(policy.authorization.standard_append_run_write_allowed,false);
  assert.equal(policy.authorization.allow_b98_same_slice,false);
  assert.equal(policy.authorization.allow_overlay_retirement,false);
  assert.equal(policy.authorization.allow_identity_fix_migration,false);
  assert.match(workflow,/candidate='docs\/engineer-osint\/V4517_B97_PATCH_CANDIDATE\.json'/);
  assert.match(workflow,/node docs\/engineer-osint\/append-run\.mjs "\$candidate" > "\$plan"/);
  assert.doesNotMatch(workflow,/append-run\.mjs .*--write/);
  assert.match(workflow,/git diff --exit-code -- docs\/engineer-osint\/data/);
  assert.match(audit,/canonical_write_performed:false/);
  assert.match(audit,/safe_to_append:false/);
  assert.match(audit,/post_b97_pages_validation_ready:false/);
});

test('B97 readiness preserves reviewed overlay debt and blocks short-circuit before B98',()=>{
  assert.equal(policy.expected_residual_signatures,61);
  assert.equal(policy.expected_residual_factual_leaf_mutations,81);
  assert.equal(policy.expected_guard_short_circuits,0);
  assert.match(audit,/V4512_POST_B96_RESIDUAL_BASELINE\.json/);
  assert.match(audit,/overlay-transition-runtime-guard\.js/);
  assert.match(audit,/B98 assessment leaked/);
  assert.match(audit,/overlays_must_remain_active:true/);
});

test('resulting B97 canonical SHA is pinned after real standard dry-run discovery',()=>{
  assert.equal(policy.expected_resulting_canonical_sha256,'9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4');
  assert.match(audit,/policy\.expected_resulting_canonical_sha256!==null/);
  assert.match(workflow,/b97-append-plan\.json/);
});
