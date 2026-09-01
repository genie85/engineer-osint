import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'photo-review-status.json'), 'utf8'));
const entry = registry.entries.find((item) => item.card_id === 'ENG-TECH-0007');

assert(entry, 'ENG-TECH-0007 photo review entry must exist');
assert.equal(entry.status, 'SOURCE_FOUND');
assert.equal(entry.review_batch, 'v4.5.81');
assert.equal(entry.source_type, 'OFFICIAL_MILITARY_PHOTO_REPORT');
assert.match(entry.origin_url, /eng\.mod\.gov\.cn/);
assert.match(entry.author_rightsholder, /Ren Liangliang/);
assert.match(entry.identity_evidence, /77th Group Army/);
assert.match(entry.identity_evidence, /综合扫雷车/);
assert.match(entry.identity_evidence, /designation remains unresolved|designation unresolved/i);
assert.match(entry.license_evidence, /no compatible open redistribution licence/i);
assert.equal(entry.license, undefined);
assert.equal(entry.license_url, undefined);
assert.equal(entry.local_image_path, undefined);
assert.equal(entry.sha256, undefined);
assert.equal(entry.acquired_at, undefined);

const fixture = {
  records: { records: [
    { id: 'ENG-TECH-0007', title: 'PLAA integrated minesweeping vehicle' },
    { id: 'ENG-TECH-0008', title: 'PLAA Rapidly Emplaced Bridge System' }
  ]},
  visual_registry: { visuals: [] }
};
const queue = buildPhotoReviewQueue(fixture, registry);
assert(!queue.some((item) => item.card_id === 'ENG-TECH-0007'), 'reviewed SOURCE_FOUND card must leave the unassessed queue');
assert(queue.some((item) => item.card_id === 'ENG-TECH-0008'), 'next unassessed card must remain queued');

console.log('v4.5.81 PLA integrated minesweeper photo research test passed');
