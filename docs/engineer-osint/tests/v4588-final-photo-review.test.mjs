import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPhotoReviewStatuses } from '../audit-photo-baseline.mjs';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const batchDir = path.join(root, 'photo-review-batches');
const batch = JSON.parse(fs.readFileSync(path.join(batchDir, 'v4588.json'), 'utf8'));
const expectedIds = ['ENG-TECH-0038', 'ENG-TECH-0041', 'ENG-TECH-0042'];
assert.deepEqual(batch.entries.map(entry => entry.card_id), expectedIds);

const byId = new Map(batch.entries.map(entry => [entry.card_id, entry]));
for (const id of ['ENG-TECH-0038', 'ENG-TECH-0041']) {
  const entry = byId.get(id);
  assert.equal(entry.status, 'READY_FOR_IMPORT');
  assert.equal(entry.review_batch, 'v4.5.88');
  assert.match(entry.origin_url, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.equal(entry.license, 'CC BY 4.0');
  assert.equal(entry.license_url, 'https://creativecommons.org/licenses/by/4.0/');
  assert.ok(entry.author_rightsholder);
  assert.ok(entry.identity_evidence.length > 100);
  assert.match(entry.license_evidence, /Creative Commons Attribution 4\.0|CC BY 4\.0/i);
  for (const field of ['local_image_path', 'sha256', 'acquired_at']) assert.equal(entry[field], undefined, `${id} must not claim ${field}`);
}
assert.match(byId.get('ENG-TECH-0038').source_title, /MV-10/i);
assert.match(byId.get('ENG-TECH-0038').author_rightsholder, /Міністерство економіки України/);
assert.match(byId.get('ENG-TECH-0041').source_title, /Uran-6/i);
assert.match(byId.get('ENG-TECH-0041').author_rightsholder, /Russian Federation|Mil\.ru/i);

const mkr = byId.get('ENG-TECH-0042');
assert.equal(mkr.status, 'NOT_FOUND');
assert.equal(mkr.review_batch, 'v4.5.88');
assert.match(mkr.origin_url, /^https:\/\/dndivsovt\.mil\.gov\.ua/);
assert.match(mkr.identity_evidence, /UA\.431\.ПО\.067-25/);
assert.match(mkr.disposition_evidence, /no exact MKR-2 photograph|did not produce.*image/i);
assert.match(mkr.license_evidence, /No exact provenance-qualified MKR-2 image was found/i);
for (const field of ['license', 'license_url', 'local_image_path', 'sha256', 'acquired_at']) assert.equal(mkr[field], undefined);

const merged = loadPhotoReviewStatuses({ path: path.join(root, 'photo-review-status.json'), batchDir });
for (const id of expectedIds) assert.equal(merged.entries.filter(entry => entry.card_id === id).length, 1, `${id} must merge exactly once`);

const queue = buildPhotoReviewQueue({
  current_run_id: 'fixture', canonical_sha256: 'fixture',
  items: expectedIds.map(card_id => ({card_id, title: card_id, local_images: [], remote_visual_count: 0, review_status: byId.get(card_id).status}))
});
assert.equal(queue.queued_cards, 0, 'all final Phase E cards must leave the unassessed queue');
assert.deepEqual(queue.items, []);

console.log('v4.5.88 final photo-review dispositions test passed');
