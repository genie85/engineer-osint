import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPhotoReviewQueue } from '../photo-review-queue.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'photo-review-status.json'), 'utf8'));
const entry = registry.entries.find((item) => item.card_id === 'ENG-TECH-0008');

assert(entry, 'ENG-TECH-0008 photo review entry must exist');
assert.equal(entry.status, 'SOURCE_FOUND');
assert.equal(entry.review_batch, 'v4.5.82');
assert.equal(entry.source_type, 'OFFICIAL_MILITARY_PHOTO_PAGE');
assert.match(entry.origin_url, /eng\.mod\.gov\.cn/);
assert.match(entry.author_rightsholder, /Zhao Genyuan/);
assert.match(entry.identity_evidence, /71st Group Army/);
assert.match(entry.identity_evidence, /Rapidly Emplaced Bridge System \(REBS\)/);
assert.match(entry.identity_evidence, /formal Chinese Type\/GSL designation|none is inferred/i);
assert.match(entry.license_evidence, /no compatible open redistribution licence/i);
assert.equal(entry.license, undefined);
assert.equal(entry.license_url, undefined);
assert.equal(entry.local_image_path, undefined);
assert.equal(entry.sha256, undefined);
assert.equal(entry.acquired_at, undefined);

const queueReport = {
  current_run_id: 'fixture',
  canonical_sha256: 'fixture',
  items: [
    { card_id: 'ENG-TECH-0008', title: 'PLAA Rapidly Emplaced Bridge System', local_images: [], remote_visual_count: 0, review_status: entry.status },
    { card_id: 'ENG-TECH-0009', title: 'PLAA floating pontoon bridging system', local_images: [], remote_visual_count: 0, review_status: null }
  ]
};
const queue = buildPhotoReviewQueue(queueReport);
assert(!queue.items.some((item) => item.card_id === 'ENG-TECH-0008'), 'reviewed SOURCE_FOUND card must leave the unassessed queue');
assert(queue.items.some((item) => item.card_id === 'ENG-TECH-0009'), 'next unassessed card must remain queued');

console.log('v4.5.82 PLA REBS photo research test passed');
