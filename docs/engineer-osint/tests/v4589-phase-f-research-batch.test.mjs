import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../osint-research-batches/v4589.json', import.meta.url);
const batch = JSON.parse(readFileSync(path, 'utf8'));

test('v4.5.89 first Phase F research batch is review-only and evidence-backed', () => {
  assert.equal(batch.schema_version, 'engineer-osint-osint-research-batch-v1');
  assert.equal(batch.batch_id, 'v4.5.89');
  assert.equal(batch.phase, 'F');
  assert.equal(batch.publication_authorized, false);
  assert.equal(batch.canonical_write_authorized, false);
  assert.equal(batch.candidates.length, 3);

  const expected = new Map([
    ['PHASE-F-0001', ['Kodiak', 'armoured_engineer_vehicle']],
    ['PHASE-F-0002', ['Keiler', 'breaching_mine_clearance']],
    ['PHASE-F-0003', ['M1074', 'assault_bridging']],
  ]);

  for (const candidate of batch.candidates) {
    assert.equal(candidate.disposition, 'RESEARCHED_CANDIDATE');
    assert.equal(candidate.canonical_absence_check.result, 'NO_MATCH_ON_MAIN');
    assert.equal(candidate.canonical_absence_check.checked_main_sha, 'a3c5ca6d6bc8bf72671e56bc0ec1c16dbc818187');
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

test('v4.5.89 candidates do not fabricate canonical identities or publication authorization', () => {
  const serialized = JSON.stringify(batch);
  assert.doesNotMatch(serialized, /ENG-TECH-00[4-9][3-9]/);
  assert.doesNotMatch(serialized, /"publication_authorized":true/);
  assert.doesNotMatch(serialized, /"canonical_write_authorized":true/);
});
