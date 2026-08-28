import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v423-nav-cleanup.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.2.3 cleanup parses',()=>{
  new vm.Script(ui,{filename:'ui-v423-nav-cleanup.js'});
  assert.match(ui,/ENGINEER_V423_NAV_CLEANUP/);
});

test('v4.2.3 runs after i18n post-render cleanup and before public CZ canary',()=>{
  assert.match(manifest,/engineer-ui-v423-nav-cleanup-module/);
  assert.ok(manifest.indexOf('i18n-en-postrender-cleanup.js')<manifest.indexOf('ui-v423-nav-cleanup.js'));
  assert.ok(manifest.indexOf('ui-v423-nav-cleanup.js')<manifest.indexOf('public-cz-ui-canary.js'));
});

test('navigation labels are normalized in Czech and English',()=>{
  assert.match(ui,/Aktivity/);
  assert.match(ui,/Leady \/ sledované položky/);
  assert.match(ui,/Informační mezery/);
  assert.match(ui,/Sledování a nástroje/);
  assert.match(ui,/Monitoring & tools/);
});

test('duplicate Sources entries are removed while canonical source button is retained',()=>{
  assert.match(ui,/engineerV4Sources/);
  assert.match(ui,/v423DuplicateSource/);
  assert.match(ui,/Zdroje/);
  assert.match(ui,/Sources/);
});

test('analysis nav removes redundant geography and legacy Australia topic from the public list',()=>{
  assert.match(ui,/Země\|Countries/);
  assert.match(ui,/Téma:\\s\*Austrálie/);
  assert.match(ui,/v423LegacyAnalysis/);
});

test('secondary monitoring and tool entries are grouped instead of lengthening the main analysis list',()=>{
  assert.match(ui,/engineerAnalysisToolsGroup/);
  assert.match(ui,/Analytické nástroje/);
  assert.match(ui,/Vyspělost technologií/);
  assert.match(ui,/Matice pokrytí/);
  assert.match(ui,/Activity Feed\|Aktivity/);
});

test('cleanup remains presentation-only',()=>{
  assert.doesNotMatch(ui,/__ENGINEER_CANONICAL_DATA__\s*=/);
  assert.doesNotMatch(ui,/D\.(?:records|evidence|assessments|intelligence_gaps|contradictions)\s*=/);
});

test('Pages health exposes v4.2.3 navigation state',()=>{
  assert.match(build,/ui_polish_v423=enabled/);
  assert.match(build,/analysis_nav_mode=core-plus-tools/);
});
