import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPhotoReviewStatuses } from '../audit-photo-baseline.mjs';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const batchDir = path.join(root, 'photo-review-batches');
const batch = JSON.parse(fs.readFileSync(path.join(batchDir, 'v4583.json'), 'utf8'));
const expectedIds = ['ENG-TECH-0009', 'ENG-TECH-0010', 'ENG-TECH-0011', 'ENG-TECH-0012', 'ENG-TECH-0013'];

assert.deepEqual(batch.entries.map((entry) => entry.card_id), expectedIds, 'v4.5.83 batch must contain the deterministic five-card slice');
for (const entry of batch.entries) {
  assert.equal(entry.status, 'SOURCE_FOUND', `${entry.card_id} must remain SOURCE_FOUND without reusable image rights`);
  assert.equal(entry.review_batch, 'v4.5.83');
  assert.match(entry.origin_url, /^https:\/\//);
  assert.match(entry.identity_evidence, /official/i);
  assert.match(entry.license_evidence, /no compatible open redistribution licence|does not provide a compatible open redistribution licence/i);
  assert.equal(entry.license, undefined);
  assert.equal(entry.license_url, undefined);
  assert.equal(entry.local_image_path, undefined);
  assert.equal(entry.sha256, undefined);
  assert.equal(entry.acquired_at, undefined);
}

const byId = new Map(batch.entries.map((entry) => [entry.card_id, entry]));
assert.match(byId.get('ENG-TECH-0009').identity_evidence, /254 meters|300-meter/);
assert.match(byId.get('ENG-TECH-0009').identity_evidence, /Type\/GSL designation|none is inferred/i);
assert.match(byId.get('ENG-TECH-0010').author_rightsholder, /Li Changxing/);
assert.match(byId.get('ENG-TECH-0010').identity_evidence, /vehicle-mounted mine-laying system/);
assert.match(byId.get('ENG-TECH-0010').identity_evidence, /Type\/GSL designation|no formal designation is inferred/i);
assert.match(byId.get('ENG-TECH-0011').author_rightsholder, /Nicolas Haeussler/);
assert.match(byId.get('ENG-TECH-0011').identity_evidence, /two robots|CEFA/);
assert.match(byId.get('ENG-TECH-0012').author_rightsholder, /Armée de Terre/);
assert.match(byId.get('ENG-TECH-0012').identity_evidence, /11-meter floating modules|2028/);
assert.match(byId.get('ENG-TECH-0013').identity_evidence, /Namer Engineering|נמר הנדסה/);
assert.match(byId.get('ENG-TECH-0013').identity_evidence, /dozer blade|breaching equipment|bridging capabilities/);
assert.match(byId.get('ENG-TECH-0013').license_evidence, /rights are reserved/i);

const merged = loadPhotoReviewStatuses({
  path: path.join(root, 'photo-review-status.json'),
  batchDir
});
for (const id of expectedIds) {
  assert.equal(merged.entries.filter((entry) => entry.card_id === id).length, 1, `${id} must merge into the lifecycle registry exactly once`);
}

const queueReport = {
  current_run_id: 'fixture',
  canonical_sha256: 'fixture',
  items: [
    ...expectedIds.map((card_id) => ({ card_id, title: card_id, local_images: [], remote_visual_count: 1, review_status: 'SOURCE_FOUND' })),
    { card_id: 'ENG-TECH-0014', title: 'next unassessed fixture', local_images: [], remote_visual_count: 1, review_status: null }
  ]
};
const queue = buildPhotoReviewQueue(queueReport);
for (const id of expectedIds) {
  assert(!queue.items.some((item) => item.card_id === id), `${id} must leave the unassessed queue after review`);
}
assert(queue.items.some((item) => item.card_id === 'ENG-TECH-0014'), 'the next unassessed card must remain queued');

console.log('v4.5.83 five-card photo research batch test passed');
