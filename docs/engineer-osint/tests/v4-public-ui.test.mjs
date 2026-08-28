import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const moduleUrl=new URL('../ui-v4-public.js',import.meta.url);
const manifestUrl=new URL('../runtime-modules.mjs',import.meta.url);

const src=fs.readFileSync(moduleUrl,'utf8');
const manifest=fs.readFileSync(manifestUrl,'utf8');

test('v4 public module parses and is wired into the public runtime',()=>{
  new vm.Script(src,{filename:'ui-v4-public.js'});
  assert.match(manifest,/engineer-ui-v4-public-module/);
  assert.match(manifest,/ui-v4-public\.js/);
});

test('v4 overview is intelligence-first and derives its public content from materialized data',()=>{
  assert.match(src,/Co se změnilo/);
  assert.match(src,/Klíčová analytická hodnocení/);
  assert.match(src,/Intelligence gaps/);
  assert.match(src,/Rozpory a nejasnosti/);
  assert.match(src,/current_run_id/);
  assert.match(src,/last_updated_run/);
  assert.match(src,/intelligence_gaps/);
  assert.match(src,/what_it_does_not_prove/);
  assert.match(src,/analysis/);
});

test('v4 provides data-derived GEO-P1, GEO-P2 and GEO-P3 situation views',()=>{
  assert.match(src,/engineerV4GeoP1/);
  assert.match(src,/engineerV4GeoP2/);
  assert.match(src,/engineerV4GeoP3/);
  assert.match(src,/renderGeo/);
  assert.match(src,/Nevytváří nová faktická tvrzení mimo canonical data/);
});

test('v4 separates evidence and system QA from the main intelligence flow',()=>{
  assert.match(src,/engineerV4EvidenceRegistry/);
  assert.match(src,/engineerV4Sources/);
  assert.match(src,/engineerV4Methodology/);
  assert.match(src,/engineerV4SystemStatus/);
  assert.match(src,/QA a migrační informace jsou záměrně oddělené/);
  assert.match(src,/Překlady .* kontrola/);
  assert.match(src,/Backlog doplnění entit/);
});
