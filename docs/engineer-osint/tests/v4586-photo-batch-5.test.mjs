import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPhotoReviewStatuses } from '../audit-photo-baseline.mjs';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const batchDir = path.join(root, 'photo-review-batches');
const batch = JSON.parse(fs.readFileSync(path.join(batchDir, 'v4586.json'), 'utf8'));
const expectedIds = ['ENG-TECH-0031', 'ENG-TECH-0032', 'ENG-TECH-0036', 'ENG-TECH-0037', 'ENG-TECH-0039'];

assert.deepEqual(batch.entries.map((entry) => entry.card_id), expectedIds, 'v4.5.86 batch must contain the deterministic next five remote-visual unassessed cards');
for (const entry of batch.entries) {
  assert.equal(entry.status, 'SOURCE_FOUND', `${entry.card_id} must remain SOURCE_FOUND when redistribution rights are not demonstrated`);
  assert.equal(entry.review_batch, 'v4.5.86');
  assert.match(entry.origin_url, /^https:\/\//);
  assert.ok(String(entry.identity_evidence || '').trim().length > 80, `${entry.card_id} must retain substantive exact-identity evidence`);
  assert.match(entry.license_evidence, /does not state a compatible open redistribution licence|do not state a compatible open redistribution licence/i);
  assert.equal(entry.license, undefined);
  assert.equal(entry.license_url, undefined);
  assert.equal(entry.local_image_path, undefined);
  assert.equal(entry.sha256, undefined);
  assert.equal(entry.acquired_at, undefined);
}

const byId = new Map(batch.entries.map((entry) => [entry.card_id, entry]));
assert.match(byId.get('ENG-TECH-0031').identity_evidence, /NOVO.*15th Engineer Regiment|NOVO systems/i);
assert.match(byId.get('ENG-TECH-0031').origin_url, /zenijnipluk\.mo\.gov\.cz/);
assert.match(byId.get('ENG-TECH-0032').identity_evidence, /NEO-1.*codified|NEO-1.*explosive objects/i);
assert.match(byId.get('ENG-TECH-0032').origin_url, /mod\.gov\.ua/);
assert.match(byId.get('ENG-TECH-0036').identity_evidence, /SIRKO-S1.*mine-laying|SIRKO-S1.*demining/i);
assert.match(byId.get('ENG-TECH-0036').origin_url, /mod\.gov\.ua/);
assert.match(byId.get('ENG-TECH-0037').identity_evidence, /Bizon-L.*area-mining|Bizon-L.*engineering-obstacle/i);
assert.match(byId.get('ENG-TECH-0037').origin_url, /mod\.gov\.ua/);
assert.match(byId.get('ENG-TECH-0039').identity_evidence, /SDZ.*Système de Dépollution de Zone|TerreMag/i);
assert.match(byId.get('ENG-TECH-0039').origin_url, /terremag\.defense\.gouv\.fr/);

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
    { card_id: 'ENG-TECH-0040', title: 'next remote-visual unassessed fixture', local_images: [], remote_visual_count: 1, review_status: null },
    { card_id: 'ENG-TECH-0021', title: 'later zero-visual unassessed fixture', local_images: [], remote_visual_count: 0, review_status: null }
  ]
};
const queue = buildPhotoReviewQueue(queueReport);
for (const id of expectedIds) {
  assert(!queue.items.some((item) => item.card_id === id), `${id} must leave the unassessed queue after review`);
}
assert.equal(queue.items[0].card_id, 'ENG-TECH-0040', 'the remaining remote-visual unassessed card must stay ahead of zero-visual cards');

console.log('v4.5.86 five-card SOURCE_FOUND photo batch test passed');
