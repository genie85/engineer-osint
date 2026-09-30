import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewQueue} from '../lib/evidence-review-queue.mjs';

test('groups IDs, preserves codes and limits output without dropping counts', () => {
  const report = {classification: 'READ_ONLY_REVIEW_SIGNALS', as_of: '2026-09-30', canonical_run_id: 'B113',
    canonical_sha256: 'a'.repeat(64), manifest_file_sha256: 'b'.repeat(64), findings: [
    {kind: 'source', id: 's2', code: 'URL_SHARED_BY_MULTIPLE_SOURCE_IDS'},
    {kind: 'source', id: 's1', code: 'URL_MISSING'},
    {kind: 'source', id: 's1', code: 'PUBLICATION_DATE_MISSING'},
    {kind: 'record', id: 'r1', code: 'SINGLE_SOURCE_ID'},
  ]};
  const before = JSON.stringify(report);
  const result = buildReviewQueue(report, {limit: 1});
  assert.equal(JSON.stringify(report), before);
  assert.equal(result.subject_count, 3);
  assert.equal(result.canonical_sha256, 'a'.repeat(64));
  assert.equal(result.manifest_file_sha256, 'b'.repeat(64));
  assert.deepEqual(result.counts_by_work_order, {REVIEW_FIRST: 1, REVIEW_NEXT: 0, MONITOR: 2});
  assert.equal(result.shown, 1);
  assert.equal(result.omitted, 2);
  assert.deepEqual(result.queue[0], {kind: 'source', id: 's1', work_order: 'REVIEW_FIRST',
    codes: ['PUBLICATION_DATE_MISSING', 'URL_MISSING']});
  assert.equal(result.canonical_mutation_authorized, false);
});

test('invalid input and unbounded request fail closed', () => {
  assert.throws(() => buildReviewQueue({}, {limit: 25}), TypeError);
  assert.throws(() => buildReviewQueue({classification: 'READ_ONLY_REVIEW_SIGNALS', findings: []}, {limit: 1001}), TypeError);
  assert.throws(() => buildReviewQueue({classification: 'READ_ONLY_REVIEW_SIGNALS', findings: [{kind: 'other', id: 'x', code: 'Y'}]}), TypeError);
});
