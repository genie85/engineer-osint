import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v421-cleanup.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.2.1 cleanup parses and is loaded after v4.2 before i18n repair',()=>{
  new vm.Script(ui,{filename:'ui-v421-cleanup.js'});
  assert.match(manifest,/engineer-ui-v421-cleanup-module/);
  assert.match(manifest,/ui-v421-cleanup\.js/);
  assert.ok(manifest.indexOf('ui-v42-situation-hubs.js')<manifest.indexOf('ui-v421-cleanup.js'));
  assert.ok(manifest.indexOf('ui-v421-cleanup.js')<manifest.indexOf('i18n-runtime-switch-fix.js'));
});

test('sidebar navigation is forced into a stacked styled layout',()=>{
  assert.match(ui,/#engineerCompactNav \.compact-subnav\{display:grid!important/);
  assert.match(ui,/grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(ui,/#engineerCompactNav button\{appearance:none/);
  assert.match(ui,/width:100%/);
  assert.match(ui,/text-align:left/);
  assert.match(ui,/#engineerCompactNav details>summary/);
});

test('cleanup removes stale V3 branding and keeps bilingual labels',()=>{
  assert.match(ui,/Analytical Dashboard V3/);
  assert.match(ui,/Veřejný analytický produkt V4\.2/);
  assert.match(ui,/Public Intelligence V4\.2/);
  assert.match(ui,/Kanonická historie/);
  assert.match(ui,/Canonical history/);
  assert.match(ui,/engineer-language-changed/);
});

test('v4.2.1 removes duplicated GEO heading visually and hardens responsive pills and KPI cards',()=>{
  assert.match(ui,/\[data-v42-situation-hub\] \.v42-head h2\{display:none!important\}/);
  assert.match(ui,/overflow-wrap:anywhere/);
  assert.match(ui,/repeat\(auto-fit,minmax\(180px,1fr\)\)/);
  assert.match(ui,/@media\(max-width:620px\)/);
});

test('cleanup is presentation-only and does not assign canonical collections',()=>{
  assert.doesNotMatch(ui,/D\.(?:records|evidence|assessments|intelligence_gaps|contradictions)\s*=/);
  assert.doesNotMatch(ui,/__ENGINEER_CANONICAL_DATA__\s*=/);
  assert.match(ui,/ENGINEER_V421_CLEANUP/);
});

test('Pages health exposes the v4.2.1 cleanup state',()=>{
  assert.match(build,/ui_cleanup_v421=enabled/);
  assert.match(build,/sidebar_subnav_layout=stacked/);
});
