import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../osint-research-batches/v4590.json', import.meta.url);
const batch = JSON.parse(readFileSync(path, 'utf8'));

test('v4.5.90 second Phase F research batch is review-only and evidence-backed', () => {
  assert.equal(batch.schema_version, 'engineer-osint-osint-research-batch-v1');
  assert.equal(batch.batch_id, 'v4.5.90');
  assert.equal(batch.phase, 'F');
  assert.equal(batch.publication_authorized, false);
  assert.equal(batch.canonical_write_authorized, false);
  assert.equal(batch.candidates.length, 3);

  const expected = new Map([
    ['PHASE-F-0004', ['Terrier armoured engineer vehicle', 'armoured_engineer_vehicle']],
    ['PHASE-F-0005', ['WISENT 2', 'armoured_engineer_vehicle']],
    ['PHASE-F-0006', ['M1150 Assault Breacher Vehicle', 'breaching_mine_clearance']],
  ]);

  for (const candidate of batch.candidates) {
    assert.equal(candidate.disposition, 'RESEARCHED_CANDIDATE');
    assert.equal(candidate.canonical_absence_check.result, 'NO_MATCH_ON_MAIN');
    assert.equal(candidate.canonical_absence_check.checked_main_sha, '19de68495c6afe0fcfb9057464081ef4f30cc5cc');
    assert.ok(expected.has(candidate.candidate_id));
    const [query, category] = expected.get(candidate.candidate_id);
    assert.equal(candidate.canonical_absence_check.query, query);
    assert.equal(candidate.category, category);
    assert.ok(candidate.claims.length >= 2);

    for (const claim of candidate.claims) {
      assert.equal(claim.confidence, 'HIGH');
      assert.match(claim.source_url, /^https:\/\//);
      assert.ok(['MANUFACTURER_PRIMARY', 'US_ARMY_PRIMARY'].includes(claim.source_type));
      assert.equal(claim.reviewed_at, '2026-09-01');
      assert.ok(claim.claim.length > 40);
      assert.ok(claim.evidence.length > 60);
    }
  }
});

test('v4.5.90 candidates remain outside canonical publication state', () => {
  const serialized = JSON.stringify(batch);
  assert.doesNotMatch(serialized, /ENG-TECH-00[4-9][3-9]/);
  assert.doesNotMatch(serialized, /"publication_authorized":true/);
  assert.doesNotMatch(serialized, /"canonical_write_authorized":true/);
});
