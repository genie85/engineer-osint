import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from '../runtime-modules.mjs';

const guard=fs.readFileSync(new URL('../overlay-transition-runtime-guard.js',import.meta.url),'utf8');
const postprocess=fs.readFileSync(new URL('../postprocess-ui.mjs',import.meta.url),'utf8');
const verifier=fs.readFileSync(new URL('../verify-stage-bc-pages-gate.mjs',import.meta.url),'utf8');
const baseline=JSON.parse(fs.readFileSync(new URL('../legacy-runtime-overlay-baseline.json',import.meta.url),'utf8'));

test('v4.5.10 runtime guard is syntactically valid and loads before all three guarded overlays',()=>{
  new vm.Script(guard);
  assert.deepEqual([...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES],[
    'rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'
  ]);
  const guardIndex=PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file==='overlay-transition-runtime-guard.js');
  assert.ok(guardIndex>=0);
  for(const file of TRANSITION_GUARDED_LEGACY_OVERLAY_FILES)assert.ok(PUBLIC_RUNTIME_MODULES.findIndex(([,candidate])=>candidate===file)>guardIndex);
});

test('identity-fix overlay remains outside the runtime transition guard',()=>{
  assert.equal(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has('data-integrity-identity-fixes.js'),false);
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'));
});

test('postprocess wrapper is fail-safe toward original overlay execution',()=>{
  assert.match(postprocess,/TRANSITION_GUARDED_LEGACY_OVERLAY_FILES\.has\(file\)/);
  assert.match(postprocess,/shouldShortCircuit/);
  assert.match(postprocess,/catch\(_error\)\{skip=false\}/);
  assert.match(postprocess,/if\(skip\)return/);
  assert.doesNotMatch(postprocess,/TRANSITION_GUARDED_LEGACY_OVERLAY_FILES\.add/);
});

test('incomplete/current-like data never short-circuits and guard does not mutate ENGINEER_DATA',()=>{
  const data={state_latest:{run_id:'engineer-osint-20260826-B95'},records:{records:[]},sources:{sources:[]}};
  const before=JSON.stringify(data),context=vm.createContext({window:{__ENGINEER_DATA__:data},console});
  vm.runInContext(guard,context);
  for(const file of TRANSITION_GUARDED_LEGACY_OVERLAY_FILES)assert.equal(context.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME.shouldShortCircuit(file,data),false);
  assert.equal(JSON.stringify(data),before);
});

test('guard requires exact B96 operation IDs, 15 reviewed sources, 15 gaps and 4 assessments',()=>{
  assert.match(guard,/Array\.from\(\{length:104\}/);
  assert.match(guard,/ENG-OP-B96-OVL-MIG-/);
  assert.match(guard,/Array\.from\(\{length:15\}/);
  assert.match(guard,/ENG-GAP-B97-OVL-/);
  assert.match(guard,/Array\.from\(\{length:4\}/);
  assert.match(guard,/ENG-ASMT-B98-OVL-/);
  for(let i=1;i<=15;i++)assert.match(guard,new RegExp(`RICH-SRC-${String(i).padStart(3,'0')}`));
  assert.match(guard,/ASSESSMENT_EVIDENCE_DISTINCT_COUNT/);
});

test('pinned overlay files remain covered by the legacy immutable hash baseline',()=>{
  for(const file of TRANSITION_GUARDED_LEGACY_OVERLAY_FILES){
    assert.ok(baseline.modules[file]);
    assert.match(baseline.modules[file].file_sha256,/^[a-f0-9]{64}$/);
  }
});

test('Stage B/C Pages verifier executes the runtime transition audit',()=>{
  assert.match(verifier,/audit-overlay-runtime-transition\.mjs/);
});
