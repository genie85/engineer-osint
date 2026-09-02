import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const candidatePath = 'docs/engineer-osint/osint-publication-candidates/v4598-b102.json';
const candidateRaw = fs.readFileSync(new URL('../osint-publication-candidates/v4598-b102.json', import.meta.url), 'utf8');
const p = JSON.parse(candidateRaw);

test('v4.5.98 stages exactly three publication candidates without canonical write authorization', () => {
  assert.equal(p.schema_version, 'engineer-osint-patch-v1');
  assert.equal(p.state.run_id, 'engineer-osint-20260902-B102');
  assert.equal(p.state.parent_run_id, 'engineer-osint-20260902-B101');
  assert.equal(p.continuity.status, 'PHASE_F_PUBLICATION_CANDIDATE_DRY_RUN');
  assert.equal(p.continuity.reviewed_main_sha, 'b75373ac4266701af6f29645ddc7dc7b3c46665b');
  assert.equal(p.continuity.reviewed_parent_canonical_sha256, '146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b');
  assert.equal(p.continuity.publication_write_authorized, false);
  assert.equal(p.continuity.canonical_write_performed, false);
  assert.deepEqual(p.continuity.research_batches, ['v4.5.91']);
  assert.deepEqual(p.new_records.map(x => x.id), ['ENG-TECH-0049','ENG-TECH-0050','ENG-TECH-0051']);
  assert.deepEqual(p.sources.map(x => x.id), ['ENG-SRC-0534','ENG-SRC-0535','ENG-SRC-0536']);
  assert.deepEqual(p.evidence.map(x => x.evidence_id), ['ENG-EVID-0222','ENG-EVID-0223','ENG-EVID-0224']);
  for (const name of ['updated_records','relations','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned']) assert.deepEqual(p[name], []);
  assert.equal(p.qa.canonical_write_performed, false);
  assert.equal(p.qa.multimedia_status, 'COMPLETE_NO_CANONICAL_MEDIA_ADDITION');
});

test('every B102 record has one primary source and one linked evidence object', () => {
  const sources = new Set(p.sources.map(x => x.id));
  const evidence = new Map(p.evidence.map(x => [x.evidence_id, x]));
  for (const record of p.new_records) {
    assert.equal(record.source_ids.length, 1);
    assert.equal(record.evidence_ids.length, 1);
    assert.ok(sources.has(record.source_ids[0]));
    const ev = evidence.get(record.evidence_ids[0]);
    assert.ok(ev);
    assert.deepEqual(ev.related_ids, [record.id]);
    assert.deepEqual(ev.source_ids, record.source_ids);
    assert.match(record.publication_safety, /^PUBLIC_OK_/);
  }
});

test('B102 preserves bridging configuration boundaries and excludes conflicting marketing user counts', () => {
  assert.equal(p.continuity.duplicate_audit.LEGUAN, 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.equal(p.continuity.duplicate_audit['Dry Support Bridge'], 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.equal(p.continuity.duplicate_audit['BOXER Bridgelayer'], 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.match(p.new_records[0].analysis_en, /not generalized/i);
  assert.match(p.new_records[1].analysis_en, /manufacturer-stated/i);
  assert.match(p.new_records[2].analysis_en, /configuration-specific/i);
  const publishedScope = JSON.stringify({records:p.new_records,sources:p.sources,evidence:p.evidence});
  assert.doesNotMatch(publishedScope, /(?:19|20) (?:nations|countries)/i);
  assert.match(p.continuity.source_reverification_note, /differing 19\/20-country context/i);
});

test('B102 is a strict append-run dry-run candidate and exposes deterministic lineage', () => {
  const stdout = execFileSync(process.execPath, ['docs/engineer-osint/append-run.mjs', candidatePath], {encoding:'utf8'});
  const plan = JSON.parse(stdout);
  const normalizedCandidate = JSON.stringify(p, null, 2) + '\n';
  assert.equal(plan.status, 'VALIDATED_DRY_RUN');
  assert.equal(plan.entry.run_id, 'engineer-osint-20260902-B102');
  assert.equal(plan.entry.parent_run_id, 'engineer-osint-20260902-B101');
  assert.equal(plan.entry.parent_canonical_sha256, '146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b');
  assert.equal(plan.entry.file_sha256, createHash('sha256').update(normalizedCandidate).digest('hex'));
  assert.match(plan.entry.canonical_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(plan.entry.canonical_sha256, plan.entry.parent_canonical_sha256);
  console.log('B102_DRY_RUN_PLAN', JSON.stringify(plan.entry));
});
