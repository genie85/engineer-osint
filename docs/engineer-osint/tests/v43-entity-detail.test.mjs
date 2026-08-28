import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v43-entity-detail.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.3 entity detail parses',()=>{
  new vm.Script(ui,{filename:'ui-v43-entity-detail.js'});
  assert.match(ui,/ENGINEER_V43_ENTITY_DETAIL/);
});

test('v4.3 runs after v4.2.3 cleanup and before public CZ canary',()=>{
  assert.match(manifest,/engineer-ui-v43-entity-detail-module/);
  assert.ok(manifest.indexOf('ui-v423-nav-cleanup.js')<manifest.indexOf('ui-v43-entity-detail.js'));
  assert.ok(manifest.indexOf('ui-v43-entity-detail.js')<manifest.indexOf('public-cz-ui-canary.js'));
});

test('detail uses canonical records and explicit linked collections',()=>{
  assert.match(ui,/D\.records\?\.records/);
  assert.match(ui,/D\.evidence\?\.evidence/);
  assert.match(ui,/D\.relations\?\.relations/);
  assert.match(ui,/D\.assessments\?\.assessments/);
  assert.match(ui,/D\.intelligence_gaps\?\.gaps/);
  assert.match(ui,/D\.contradictions\?\.contradictions/);
  assert.match(ui,/D\.claims\?\.claims/);
});

test('entity detail exposes the v4.3 evidence-first sections conditionally',()=>{
  for(const label of ['Aktuální hodnocení','Fakta','Analytická interpretace','Co to neprokazuje','Časová osa','Důkazy','Tvrzení','Informační mezery','Rozpory','Vztahy','Operační / výcviková / štábní relevance'])assert.match(ui,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(ui,/if\(!text\)return''/);
});

test('analytical interpretation is explicitly distinguished from fact',()=>{
  assert.match(ui,/ANALYTICKÉ, NIKOLI FAKTICKÉ TVRZENÍ/);
  assert.match(ui,/ANALYTICAL, NOT A FACTUAL CLAIM/);
});

test('evidence preserves support and limitation semantics',()=>{
  assert.match(ui,/what_it_supports/);
  assert.match(ui,/what_it_does_not_prove/);
  assert.match(ui,/Podporuje/);
  assert.match(ui,/Neprokazuje/);
});

test('legacy gaps and contradictions remain visibly marked compatibility views',()=>{
  assert.match(ui,/KOMPATIBILNÍ STARŠÍ POLE/);
  assert.match(ui,/LEGACY COMPATIBILITY/);
});

test('v4.3 suppresses duplicate v4.1 detail enrichment',()=>{
  assert.match(ui,/v41-detail-intelligence/);
  assert.match(ui,/hidden aria-hidden="true"/);
});

test('v4.3 does not write factual collections',()=>{
  assert.doesNotMatch(ui,/D\.(?:records|sources|evidence|relations|assessments|intelligence_gaps|contradictions|claims)\s*=/);
  assert.doesNotMatch(ui,/__ENGINEER_CANONICAL_DATA__\s*=/);
});

test('Pages health exposes unified entity detail state',()=>{
  assert.match(build,/entity_detail_v43=enabled/);
  assert.match(build,/entity_detail_source=canonical-readonly/);
  assert.match(build,/entity_detail_sections=conditional-evidence-first/);
});
