#!/usr/bin/env node
// Read-only canonical evidence-quality inventory. Prints JSON; never writes files.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../docs/engineer-osint/lib/run-store.mjs';
import {analyzeEvidenceQuality} from './lib/evidence-quality.mjs';
import {buildReviewQueue} from './lib/evidence-review-queue.mjs';

const args = process.argv.slice(2);
const values = {};
let invalid = false;
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (['--details', '--queue'].includes(flag)) {
    if (values[flag] !== undefined) invalid = true;
    values[flag] = true;
  } else if (['--as-of', '--stale-days', '--limit'].includes(flag)) {
    if (values[flag] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) invalid = true;
    values[flag] = args[++i];
  } else invalid = true;
}
const asOf = values['--as-of'];
const staleDays = values['--stale-days'] === undefined ? 30 : Number(values['--stale-days']);
const limit = values['--limit'] === undefined ? 25 : Number(values['--limit']);
if (invalid || !asOf || (values['--limit'] !== undefined && !values['--queue'])
    || (values['--details'] && values['--queue'])) {
  process.stderr.write('usage: node scripts/audit-evidence-quality.mjs --as-of YYYY-MM-DD [--stale-days N] [--details | --queue [--limit N]]\n');
  process.exitCode = 2;
} else {
  try {
    const manifestPath = 'docs/engineer-osint/data/run-store-manifest.json';
    const manifestSha = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
    const {data, report} = loadCanonicalRunStore();
    const result = analyzeEvidenceQuality(data, {asOf, staleDays});
    result.canonical_run_id = report.current_run_id;
    result.canonical_sha256 = report.canonical_sha256;
    result.manifest_file_sha256 = manifestSha;
    const output = values['--queue'] ? buildReviewQueue(result, {limit}) : result;
    if (!values['--details'] && !values['--queue']) delete result.findings;
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`audit failed: ${error?.name || 'Error'}\n`);
    process.exitCode = 1;
  }
}
