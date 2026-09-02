import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../osint-research-batches/v4598.json', import.meta.url);
const batch = JSON.parse(readFileSync(path, 'utf8'));

test('v4.5.98 Keiler NG research batch is review-only and primary-source backed', () => {
  assert.equal(batch.schema_version, 'engineer-osint-osint-research-batch-v1');
  assert.equal(batch.batch_id, 'v4.5.98');
  assert.equal(batch.phase, 'F');
  assert.equal(batch.reviewed_at, '2026-09-02');
  assert.equal(batch.publication_authorized, false);
  assert.equal(batch.canonical_write_authorized, false);
  assert.equal(batch.candidates.length, 1);

  const candidate = batch.candidates[0];
  assert.equal(candidate.candidate_id, 'PHASE-F-0010');
  assert.equal(candidate.proposed_title, 'Keiler Next Generation (Keiler NG)');
  assert.equal(candidate.category, 'mine_breaching');
  assert.equal(candidate.disposition, 'RESEARCHED_CANDIDATE');
  assert.deepEqual(candidate.country_scope, ['DEU', 'NATO']);
  assert.equal(candidate.canonical_absence_check.query, 'Keiler NG');
  assert.equal(candidate.canonical_absence_check.result, 'NO_MATCH_ON_MAIN');
  assert.equal(candidate.canonical_absence_check.checked_main_sha, 'fc26d68b00f4a6db11f465ee6b0b57a5ab14ebff');
  assert.equal(candidate.claims.length, 3);

  for (const claim of candidate.claims) {
    assert.equal(claim.confidence, 'HIGH');
    assert.equal(claim.source_type, 'MANUFACTURER_PRIMARY');
    assert.match(claim.source_url, /^https:\/\/(?:www\.)?rheinmetall\.com\//);
    assert.equal(claim.reviewed_at, '2026-09-02');
    assert.ok(claim.claim.length > 70);
    assert.ok(claim.evidence.length > 100);
  }

  assert.match(candidate.notes, /No independent Bundeswehr\/BMVg source/);
  assert.match(candidate.notes, /does not infer Bundeswehr adoption, fielding or operational use/);
});

test('v4.5.98 remains candidate-only and cannot imply canonical publication', () => {
  const serialized = JSON.stringify(batch);
  assert.doesNotMatch(serialized, /ENG-TECH-/);
  assert.doesNotMatch(serialized, /ENG-SRC-/);
  assert.doesNotMatch(serialized, /ENG-EVID-/);
  assert.doesNotMatch(serialized, /"publication_authorized":true/);
  assert.doesNotMatch(serialized, /"canonical_write_authorized":true/);
});
