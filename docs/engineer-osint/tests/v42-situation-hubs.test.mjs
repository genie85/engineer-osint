import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v42-situation-hubs.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.2 thematic situation hub parses and is loaded after intelligence v1',()=>{
  new vm.Script(ui,{filename:'ui-v42-situation-hubs.js'});
  assert.match(manifest,/engineer-ui-v42-situation-hubs-module/);
  assert.match(manifest,/ui-v42-situation-hubs\.js/);
  assert.ok(manifest.indexOf('ui-v41-intelligence.js')<manifest.indexOf('ui-v42-situation-hubs.js'));
  assert.ok(manifest.indexOf('ui-v42-situation-hubs.js')<manifest.indexOf('i18n-runtime-switch-fix.js'));
});

test('v4.2 exposes GEO-P1, GEO-P2 and GEO-P3 as derived filters, not canonical facts',()=>{
  assert.match(ui,/p1:\{flag:'🇺🇦'/);
  assert.match(ui,/p2:\{flag:'🇨🇿'/);
  assert.match(ui,/p3:\{flag:'🌍'/);
  assert.match(ui,/Geo mode/);
  assert.match(ui,/derived filter/);
  assert.match(ui,/does not create or alter factual claims/);
  assert.match(ui,/Nevytváří ani nemění faktická tvrzení/);
});

test('v4.2 situation hub separates delta, developments, technology, assessments, gaps, contradictions and evidence',()=>{
  for(const marker of [
    'Current Situation','Engineering Developments','Technology & Trends','Key Assessments','Intelligence Gaps','Source Contradictions','Evidence Layer'
  ])assert.match(ui,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(ui,/Current-run delta/);
  assert.match(ui,/currentRecords/);
  assert.match(ui,/technologyRecords/);
  assert.match(ui,/developmentRecords/);
  assert.match(ui,/evidenceFor/);
});

test('v4.2 prefers canonical intelligence v1 and labels legacy fallback explicitly',()=>{
  assert.match(ui,/D\.assessments\?\.assessments/);
  assert.match(ui,/D\.intelligence_gaps\?\.gaps/);
  assert.match(ui,/D\.contradictions\?\.contradictions/);
  assert.match(ui,/CANONICAL ASSESSMENT/);
  assert.match(ui,/CANONICAL INTELLIGENCE GAP/);
  assert.match(ui,/CANONICAL CONTRADICTION/);
  assert.match(ui,/LEGACY COMPATIBILITY VIEW/);
  assert.match(ui,/KOMPATIBILNÍ POHLED ZE STARŠÍCH POLÍ/);
});

test('v4.2 evidence is selected only by explicit canonical relationships to the geo record set',()=>{
  assert.match(ui,/related_ids/);
  assert.match(ui,/related_record_ids/);
  assert.match(ui,/record_id/);
  assert.match(ui,/related_record_id/);
  assert.match(ui,/target_id/);
  assert.match(ui,/evidence\(\)\.filter\(e=>intersects\(relatedIds\(e\),ids\)\)/);
  assert.doesNotMatch(ui,/evidence\(\)\.filter\(e=>geoObject\(e,key,ids\)\)/);
});

test('v4.2 replaces the legacy geo renderer without mutating canonical data',()=>{
  assert.match(ui,/ENGINEER_V4_PUBLIC\.renderGeo=renderHub/);
  assert.match(ui,/data-v4-geo/);
  assert.match(ui,/ENGINEER_V42_SITUATION=/);
  assert.doesNotMatch(ui,/D\.(records|evidence|assessments|intelligence_gaps|contradictions)\s*=/);
});

test('Pages health exposes v4.2 presentation status',()=>{
  assert.match(build,/situation_hubs_v42=enabled/);
  assert.match(build,/situation_hubs_geo_mode=derived-filter/);
});
