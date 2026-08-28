import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui=fs.readFileSync(new URL('../ui-v422-visual-polish.js',import.meta.url),'utf8');
const manifest=fs.readFileSync(new URL('../runtime-modules.mjs',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../build-pages.mjs',import.meta.url),'utf8');

test('v4.2.2 visual polish parses and is ordered after v4.2.1 before i18n repair',()=>{
  new vm.Script(ui,{filename:'ui-v422-visual-polish.js'});
  assert.match(manifest,/engineer-ui-v422-visual-polish-module/);
  assert.match(manifest,/ui-v422-visual-polish\.js/);
  assert.ok(manifest.indexOf('ui-v421-cleanup.js')<manifest.indexOf('ui-v422-visual-polish.js'));
  assert.ok(manifest.indexOf('ui-v422-visual-polish.js')<manifest.indexOf('i18n-runtime-switch-fix.js'));
});

test('v4.2.2 replaces browser-default public buttons and prevents header overlap',()=>{
  assert.match(ui,/#view \.v4-card button/);
  assert.match(ui,/appearance:none/);
  assert.match(ui,/background:rgba\(29,62,94,.58\)/);
  assert.match(ui,/#engineerVersionStatus/);
  assert.match(ui,/margin-right:128px!important/);
});

test('v4.2.2 hides the nested sidebar scrollbar without disabling nav scrolling',()=>{
  assert.match(ui,/#sidebar nav\{scrollbar-width:none\}/);
  assert.match(ui,/#sidebar nav::-webkit-scrollbar/);
  assert.doesNotMatch(ui,/#sidebar nav\{[^}]*overflow-y:hidden/);
});

test('v4.2.2 suppresses the legacy overview below the v4 intelligence overview',()=>{
  assert.match(ui,/function syncLegacyOverview/);
  assert.match(ui,/engineerOverviewIntro/);
  assert.match(ui,/v422LegacyOverviewHidden/);
  assert.match(ui,/child\.hidden=true/);
  assert.match(ui,/Přehled\|Overview/);
});

test('v4.2.2 removes duplicate Sources nav and localizes remaining visible navigation',()=>{
  assert.match(ui,/engineerV4Sources/);
  assert.match(ui,/v422DuplicateSource/);
  assert.match(ui,/Informační mezery/);
  assert.match(ui,/Leady \/ sledované položky/);
  assert.match(ui,/Aktivity/);
  assert.match(ui,/Kanonický zdroj/);
});

test('v4.2.2 remains presentation-only',()=>{
  assert.doesNotMatch(ui,/D\.(?:records|evidence|sources|assessments|intelligence_gaps|contradictions)\s*=/);
  assert.doesNotMatch(ui,/__ENGINEER_CANONICAL_DATA__\s*=/);
  assert.match(ui,/ENGINEER_V422_VISUAL_POLISH/);
});

test('Pages health exposes v4.2.2 state',()=>{
  assert.match(build,/ui_polish_v422=enabled/);
  assert.match(build,/legacy_overview_below_v4=hidden/);
});
