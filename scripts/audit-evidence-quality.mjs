#!/usr/bin/env node
// Read-only canonical evidence-quality inventory. Prints JSON; never writes files.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {loadCanonicalRunStore} from '../docs/engineer-osint/lib/run-store.mjs';
import {analyzeEvidenceQuality} from './lib/evidence-quality.mjs';

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const asOf = value('--as-of');
const staleDays = value('--stale-days') === undefined ? 30 : Number(value('--stale-days'));
const details = args.includes('--details');
if (!asOf || args.some(arg => !['--as-of', '--stale-days', '--details', asOf, String(staleDays)].includes(arg))) {
  process.stderr.write('usage: node scripts/audit-evidence-quality.mjs --as-of YYYY-MM-DD [--stale-days N] [--details]\n');
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
    if (!details) delete result.findings;
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(`audit failed: ${error?.name || 'Error'}\n`);
    process.exitCode = 1;
  }
}
