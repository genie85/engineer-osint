import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v44-evidence-explorer.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.4 Evidence Explorer parses',()=>{
  new vm.Script(ui,{filename:'ui-v44-evidence-explorer.js'});
  assert.match(ui,/ENGINEER_V44_EVIDENCE_EXPLORER/);
});

test('v4.4 runs after v4.3 and before public CZ canary',()=>{
  assert.match(manifest,/engineer-ui-v44-evidence-explorer-module/);
  assert.ok(manifest.indexOf('ui-v43-entity-detail.js')<manifest.indexOf('ui-v44-evidence-explorer.js'));
  assert.ok(manifest.indexOf('ui-v44-evidence-explorer.js')<manifest.indexOf('public-cz-ui-canary.js'));
});

test('explorer reads canonical entity, claim, evidence and source layers',()=>{
  assert.match(ui,/D\.records\?\.records/);
  assert.match(ui,/D\.claims\?\.claims/);
  assert.match(ui,/D\.claim_registry\?\.claims/);
  assert.match(ui,/D\.evidence\?\.evidence/);
  assert.match(ui,/D\.sources\?\.sources/);
});

test('claim to evidence linking uses explicit ids and distinguishes entity context',()=>{
  assert.match(ui,/supporting_evidence_ids/);
  assert.match(ui,/related_evidence_ids/);
  assert.match(ui,/mode:'DIRECT'/);
  assert.match(ui,/mode:'ENTITY_CONTEXT'/);
  assert.match(ui,/NO_DIRECT_EVIDENCE/);
  assert.match(ui,/Evidence navázaná jen na entitu je označena jako kontext/);
});

test('source URLs open explicitly and safely',()=>{
  assert.match(ui,/Otevřít původní zdroj/);
  assert.match(ui,/target="_blank" rel="noopener noreferrer"/);
});

test('v4.4 polishes v4.3 human-facing detail without changing stored values',()=>{
  assert.match(ui,/Dodatečně zjištěno do 48 h/);
  assert.match(ui,/Technologický signál/);
  assert.match(ui,/prettyDate/);
  assert.match(ui,/v44-section-nav/);
  assert.match(ui,/Otevřít v Evidence Exploreru/);
});

test('v4.4 is presentation-only and does not write canonical factual collections',()=>{
  assert.doesNotMatch(ui,/D\.(?:records|sources|evidence|relations|assessments|intelligence_gaps|contradictions|claims)\s*=/);
  assert.doesNotMatch(ui,/__ENGINEER_CANONICAL_DATA__\s*=/);
});

test('Pages health exposes Evidence Explorer policy',()=>{
  assert.match(build,/evidence_explorer_v44=enabled/);
  assert.match(build,/evidence_explorer_link_policy=explicit-direct-or-entity-context/);
  assert.match(build,/evidence_explorer_source=canonical-readonly/);
  assert.match(build,/entity_detail_polish_v44=enabled/);
});
