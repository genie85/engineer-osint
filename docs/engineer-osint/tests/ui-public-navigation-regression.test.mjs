import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const nav=readFileSync('docs/engineer-osint/ui-phase8-navigation.js','utf8');
const gallery=readFileSync('docs/engineer-osint/ui-phase3.js','utf8');

test('global legacy filters are scoped to Overview',()=>{
  assert.match(nav,/globalFilterPanel/);
  assert.match(nav,/isOverviewTitle/);
  assert.match(nav,/panel\.hidden=!show/);
  assert.match(nav,/MutationObserver\(syncGlobalFilterVisibility\)/);
});

test('late Australia EOD topic is moved into Analysis navigation',()=>{
  assert.match(nav,/engineerAustraliaEodTopicBtn/);
  assert.match(nav,/analysis\.appendChild\(australia\)/);
});

test('visual gallery cards expose an interactive detail view',()=>{
  assert.match(gallery,/data-visual-index/);
  assert.match(gallery,/function visualDetail\(/);
  assert.match(gallery,/engineerVisualBackBtn/);
  assert.match(gallery,/e\.onkeydown/);
  assert.match(gallery,/what_it_does_not_prove/);
});
