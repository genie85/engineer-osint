import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPhotoReviewStatuses } from '../audit-photo-baseline.mjs';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const batchDir = path.join(root, 'photo-review-batches');
const batch = JSON.parse(fs.readFileSync(path.join(batchDir, 'v4584.json'), 'utf8'));
const expectedIds = ['ENG-TECH-0014', 'ENG-TECH-0015', 'ENG-TECH-0018', 'ENG-TECH-0019', 'ENG-TECH-0020'];

assert.deepEqual(batch.entries.map((entry) => entry.card_id), expectedIds, 'v4.5.84 batch must contain the deterministic next five unassessed cards');
for (const entry of batch.entries) {
  assert.equal(entry.status, 'READY_FOR_IMPORT', `${entry.card_id} must be READY_FOR_IMPORT after exact identity and reusable licence verification`);
  assert.equal(entry.review_batch, 'v4.5.84');
  assert.match(entry.origin_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(entry.license_url, /^https:\/\//);
  assert.match(entry.identity_evidence, /exact platform identity|exact system identity|matches the ENGINEER OSINT/i);
  assert.match(entry.license_evidence, /licensed|public domain|licence/i);
  assert.equal(entry.local_image_path, undefined);
  assert.equal(entry.sha256, undefined);
  assert.equal(entry.acquired_at, undefined);
}

const byId = new Map(batch.entries.map((entry) => [entry.card_id, entry]));
assert.match(byId.get('ENG-TECH-0014').author_rightsholder, /DRDO/);
assert.match(byId.get('ENG-TECH-0014').license, /Government Open Data License/);
assert.match(byId.get('ENG-TECH-0015').source_title, /10M Short Span Bridge/);
assert.match(byId.get('ENG-TECH-0015').license, /Government Open Data License/);
assert.match(byId.get('ENG-TECH-0018').system_name, /施設作業車/);
assert.match(byId.get('ENG-TECH-0018').license, /Public domain/);
assert.match(byId.get('ENG-TECH-0019').system_name, /92式浮橋/);
assert.equal(byId.get('ENG-TECH-0019').license, 'CC BY 2.0');
assert.match(byId.get('ENG-TECH-0020').system_name, /83式地雷敷設装置/);
assert.equal(byId.get('ENG-TECH-0020').license, 'CC BY 4.0');

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
    ...expectedIds.map((card_id) => ({ card_id, title: card_id, local_images: [], remote_visual_count: 0, review_status: 'READY_FOR_IMPORT' })),
    { card_id: 'ENG-TECH-0021', title: 'next unassessed fixture', local_images: [], remote_visual_count: 0, review_status: null }
  ]
};
const queue = buildPhotoReviewQueue(queueReport);
for (const id of expectedIds) {
  assert(!queue.items.some((item) => item.card_id === id), `${id} must leave the unassessed queue after review`);
}
assert(queue.items.some((item) => item.card_id === 'ENG-TECH-0021'), 'the next unassessed card must remain queued');

console.log('v4.5.84 reusable five-card photo batch test passed');
