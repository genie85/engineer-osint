import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPhotoBaseline} from '../audit-photo-baseline.mjs';

test('v4.5.75 photo lifecycle accounting remains valid as future review batches advance',()=>{
  const report=auditPhotoBaseline();
  const reviewedStatuses=[
    report.source_found,
    report.license_verified,
    report.identity_verified,
    report.ready_for_import,
    report.license_blocked,
    report.not_found,
    report.cards_with_local_image
  ];
  assert.equal(report.total_cards,report.cards_with_local_image+report.cards_without_image);
  assert.equal(report.cards_without_image,report.reviewed_without_local_image+report.unassessed);
  assert.equal(
    report.reviewed_without_local_image,
    report.source_found+report.license_verified+report.identity_verified+report.ready_for_import+report.license_blocked+report.not_found
  );
  assert.ok(reviewedStatuses.every(value=>Number.isInteger(value)&&value>=0));
  assert.equal(report.remaining_unassessed,report.unassessed);
  assert.ok(report.photo_coverage_percent>=0&&report.photo_coverage_percent<=100);
});
