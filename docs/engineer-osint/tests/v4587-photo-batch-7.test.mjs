import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPhotoReviewStatuses } from '../audit-photo-baseline.mjs';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const batchDir = path.join(root, 'photo-review-batches');
const batch = JSON.parse(fs.readFileSync(path.join(batchDir, 'v4587.json'), 'utf8'));
const expectedIds = ['ENG-TECH-0040', 'ENG-TECH-0021', 'ENG-TECH-0033', 'ENG-TECH-0034', 'ENG-TECH-0035'];

assert.deepEqual(batch.entries.map((entry) => entry.card_id), expectedIds, 'v4.5.87 batch must preserve the deterministic next-five queue order');
for (const entry of batch.entries) {
  assert.equal(entry.status, 'SOURCE_FOUND', `${entry.card_id} must remain SOURCE_FOUND without demonstrated compatible redistribution rights`);
  assert.equal(entry.review_batch, 'v4.5.87');
  assert.match(entry.origin_url, /^https:\/\//);
  assert.ok(String(entry.identity_evidence || '').trim().length > 80, `${entry.card_id} must retain substantive exact-identity evidence`);
  assert.match(entry.license_evidence, /does not demonstrate a compatible open redistribution licence|did not expose a compatible Creative Commons or other open redistribution licence/i);
  for (const field of ['license', 'license_url', 'local_image_path', 'sha256', 'acquired_at']) assert.equal(entry[field], undefined, `${entry.card_id} must not claim ${field}`);
}

const byId = new Map(batch.entries.map((entry) => [entry.card_id, entry]));
assert.match(byId.get('ENG-TECH-0040').identity_evidence, /Système robotisé GR.*counter-IED.*mine-clearance|Système robotisé GR.*heavy micro-robot/i);
assert.match(byId.get('ENG-TECH-0040').author_rightsholder, /Armée de Terre.*Défense/i);
assert.match(byId.get('ENG-TECH-0021').identity_evidence, /Sonobot 5.*Pionierbrückenbataillon 130|Sonobot 5.*hydrographic/i);
assert.match(byId.get('ENG-TECH-0021').author_rightsholder, /Bundeswehr.*Vivien Meisenzahl/i);
assert.match(byId.get('ENG-TECH-0033').source_title, /T 813 PM-55.*bridge truck/i);
assert.match(byId.get('ENG-TECH-0033').author_rightsholder, /Marie Křížová.*Ministerstvo obrany/i);
assert.match(byId.get('ENG-TECH-0034').identity_evidence, /62 GCS-200.*Ukraine|GCS-200.*Support Forces/i);
assert.match(byId.get('ENG-TECH-0035').identity_evidence, /TERMIT.*mine laying|TERMIT.*codified.*operational use/i);

const merged = loadPhotoReviewStatuses({ path: path.join(root, 'photo-review-status.json'), batchDir });
for (const id of expectedIds) assert.equal(merged.entries.filter((entry) => entry.card_id === id).length, 1, `${id} must merge into the lifecycle registry exactly once`);

const queueReport = {
  current_run_id: 'fixture', canonical_sha256: 'fixture',
  items: [
    ...expectedIds.map((card_id, index) => ({ card_id, title: card_id, local_images: [], remote_visual_count: index === 0 ? 1 : 0, review_status: 'SOURCE_FOUND' })),
    { card_id: 'ENG-TECH-0038', title: 'next zero-visual card', local_images: [], remote_visual_count: 0, review_status: null },
    { card_id: 'ENG-TECH-0041', title: 'later zero-visual card', local_images: [], remote_visual_count: 0, review_status: null }
  ]
};
const queue = buildPhotoReviewQueue(queueReport);
for (const id of expectedIds) assert(!queue.items.some((item) => item.card_id === id), `${id} must leave the unassessed queue after review`);
assert.equal(queue.items[0].card_id, 'ENG-TECH-0038');

console.log('v4.5.87 deterministic five-card SOURCE_FOUND photo batch test passed');
