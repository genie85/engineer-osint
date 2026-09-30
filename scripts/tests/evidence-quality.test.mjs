import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeEvidenceQuality} from '../lib/evidence-quality.mjs';

const fixture = () => ({
  sources: {sources: [
    {id: 's1', name: 'Publisher', url: 'https://example.org/a', publication_date: '2026', tier: 1,
      url_validation_checked_at: '2026-08-01'},
    {id: 's2', name: 'Publisher', url: 'https://example.org/a', publication_date: '2026-09-01', tier: 2},
    {id: 's3', name: 'Publisher', url: 'file:///secret', url_validation_status: 'SOURCE_URL_RECHECK_REQUIRED'},
  ]},
  records: {records: [{id: 'r1', source_ids: ['s1']}, {id: 'r2', source_ids: []}]},
  evidence: {evidence: [{evidence_id: 'e1', source_ids: ['s1']},
    {evidence_id: 'e2', source_ids: [], what_it_does_not_prove_en: 'does not prove readiness'}]},
});

test('read-only signals are deterministic, bounded and non-authoritative', () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = analyzeEvidenceQuality(input, {asOf: '2026-09-30', staleDays: 30});
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.inventory.sources, 3);
  assert.equal(result.findings_by_code.URL_SHARED_BY_MULTIPLE_SOURCE_IDS, 2);
  assert.equal(result.findings_by_code.URL_CHECK_OLDER_THAN_THRESHOLD, 1);
  assert.equal(result.findings_by_code.URL_INVALID_SCHEME, 1);
  assert.equal(result.findings_by_code.URL_RECHECK_DECLARED, 1);
  assert.equal(result.findings_by_code.SINGLE_SOURCE_ID, 1);
  assert.equal(result.findings_by_code.NO_SOURCE_ID, 2);
  assert.equal(result.findings_by_code.LIMITATION_TEXT_MISSING, 1);
  assert.equal(result.publication_authorized, false);
  assert.equal(result.live_url_check, 'NOT_RUN');
});

test('invalid date and threshold fail closed', () => {
  assert.throws(() => analyzeEvidenceQuality(fixture(), {asOf: '2026-02-30'}), TypeError);
  assert.throws(() => analyzeEvidenceQuality(fixture(), {asOf: '2026-09-30', staleDays: 0}), TypeError);
});

test('URL content alone never proves dead or verified status', () => {
  const result = analyzeEvidenceQuality({sources: {sources: [{id: 's', url: 'https://unreachable.example', name: 'X', tier: 1,
    publication_date: '2026-09-30'}]}}, {asOf: '2026-09-30'});
  assert.equal(result.finding_count, 0);
  assert.equal(result.live_url_check, 'NOT_RUN');
});
