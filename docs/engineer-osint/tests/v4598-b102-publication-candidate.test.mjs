import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync(new URL('../osint-publication-candidates/v4598-b102.json', import.meta.url), 'utf8'));

test('v4.5.98 stages exactly three publication candidates without canonical write authorization', () => {
  assert.equal(p.state.run_id, 'engineer-osint-20260902-B102');
  assert.equal(p.state.parent_run_id, 'engineer-osint-20260902-B101');
  assert.equal(p.continuity.status, 'PHASE_F_PUBLICATION_CANDIDATE_DRY_RUN');
  assert.equal(p.continuity.publication_write_authorized, false);
  assert.equal(p.continuity.canonical_write_performed, false);
  assert.deepEqual(p.continuity.research_batches, ['v4.5.91']);
  assert.deepEqual(p.new_records.map(x => x.id), ['ENG-TECH-0049','ENG-TECH-0050','ENG-TECH-0051']);
  assert.deepEqual(p.sources.map(x => x.id), ['ENG-SRC-0534','ENG-SRC-0535','ENG-SRC-0536']);
  assert.deepEqual(p.evidence.map(x => x.id), ['ENG-EVID-0222','ENG-EVID-0223','ENG-EVID-0224']);
  assert.equal(p.relations.length, 0);
  assert.equal(p.visual_registry.length, 0);
  assert.equal(p.media_registry.length, 0);
});

test('every B102 record has one primary source and one linked evidence object', () => {
  const sources = new Set(p.sources.map(x => x.id));
  const evidence = new Map(p.evidence.map(x => [x.id, x]));
  for (const record of p.new_records) {
    assert.equal(record.source_ids.length, 1);
    assert.equal(record.evidence_ids.length, 1);
    assert.ok(sources.has(record.source_ids[0]));
    const ev = evidence.get(record.evidence_ids[0]);
    assert.ok(ev);
    assert.deepEqual(ev.related_ids, [record.id]);
    assert.deepEqual(ev.source_ids, record.source_ids);
    assert.equal(ev.confidence, 'HIGH');
    assert.match(record.publication_safety, /^PUBLIC_OK_/);
  }
});

test('B102 preserves bridging configuration boundaries and duplicate audit', () => {
  assert.equal(p.continuity.duplicate_audit.LEGUAN, 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.equal(p.continuity.duplicate_audit['Dry Support Bridge'], 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.equal(p.continuity.duplicate_audit['BOXER Bridgelayer'], 'NO_EXACT_CANONICAL_RECORD_MATCH');
  assert.match(p.new_records[0].analysis_en, /not generalized/i);
  assert.match(p.new_records[1].analysis_en, /manufacturer-stated/i);
  assert.match(p.new_records[2].analysis_en, /configuration-specific/i);
});
