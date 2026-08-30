import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PUBLIC_RUNTIME_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from '../runtime-modules.mjs';

const guard=fs.readFileSync(new URL('../overlay-transition-runtime-guard.js',import.meta.url),'utf8');
const postprocess=fs.readFileSync(new URL('../postprocess-ui.mjs',import.meta.url),'utf8');
const verifier=fs.readFileSync(new URL('../verify-stage-bc-pages-gate.mjs',import.meta.url),'utf8');
const baseline=JSON.parse(fs.readFileSync(new URL('../legacy-runtime-overlay-baseline.json',import.meta.url),'utf8'));
const retirement=JSON.parse(fs.readFileSync(new URL('../V4530_FIRST_THREE_OVERLAY_RETIREMENT.json',import.meta.url),'utf8'));
const firstThree=['rich-backfill.js','rich-backfill-israel-turkiye-eod.js','rich-backfill-usa-rok.js'];

test('v4.5.10 transition guard remains syntactically valid but guarded runtime set is empty after v4.5.30',()=>{
  new vm.Script(guard);
  assert.deepEqual([...TRANSITION_GUARDED_LEGACY_OVERLAY_FILES],[]);
  const guardIndex=PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file==='overlay-transition-runtime-guard.js');
  assert.ok(guardIndex>=0);
  for(const file of firstThree){
    assert.ok(guard.includes(`'${file}'`),`historical guard scope lost ${file}`);
    assert.equal(PUBLIC_RUNTIME_MODULES.some(([,candidate])=>candidate===file),false,`retired overlay still active ${file}`);
  }
});

test('identity-fix overlay remains outside the runtime transition guard and active',()=>{
  assert.equal(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.has('data-integrity-identity-fixes.js'),false);
  assert.ok(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='data-integrity-identity-fixes.js'));
  assert.ok(baseline.modules['data-integrity-identity-fixes.js']);
});

test('postprocess wrapper remains fail-safe although no retired overlay is wrapped',()=>{
  assert.match(postprocess,/TRANSITION_GUARDED_LEGACY_OVERLAY_FILES\.has\(file\)/);
  assert.match(postprocess,/shouldShortCircuit/);
  assert.match(postprocess,/catch\(_error\)\{skip=false\}/);
  assert.match(postprocess,/if\(skip\)return/);
  assert.doesNotMatch(postprocess,/TRANSITION_GUARDED_LEGACY_OVERLAY_FILES\.add/);
});

test('historical guard still fails closed on incomplete/current-like data and never mutates ENGINEER_DATA',()=>{
  const data={state_latest:{run_id:'engineer-osint-20260826-B95'},records:{records:[]},sources:{sources:[]}};
  const before=JSON.stringify(data),context=vm.createContext({window:{__ENGINEER_DATA__:data},console});
  vm.runInContext(guard,context);
  for(const file of firstThree)assert.equal(context.window.ENGINEER_OVERLAY_TRANSITION_RUNTIME.shouldShortCircuit(file,data),false);
  assert.equal(JSON.stringify(data),before);
});

test('historical guard preserves exact B96/B97/B98 proof contract',()=>{
  assert.match(guard,/Array\.from\(\{length:104\}/);
  assert.match(guard,/ENG-OP-B96-OVL-MIG-/);
  assert.match(guard,/Array\.from\(\{length:15\}/);
  assert.match(guard,/ENG-GAP-B97-OVL-/);
  assert.match(guard,/Array\.from\(\{length:4\}/);
  assert.match(guard,/ENG-ASMT-B98-OVL-/);
  for(let i=1;i<=15;i++)assert.match(guard,new RegExp(`RICH-SRC-${String(i).padStart(3,'0')}`));
  assert.match(guard,/ASSESSMENT_EVIDENCE_DISTINCT_COUNT/);
});

test('retired overlay files move from active baseline to the pinned retirement archive contract',()=>{
  for(const file of firstThree){
    assert.equal(baseline.modules[file],undefined);
    const archived=retirement.retired_modules.find(item=>item.file===file);
    assert.ok(archived);
    assert.match(archived.archive_file_sha256,/^[a-f0-9]{64}$/);
  }
  assert.equal(retirement.authorization.retain_first_three_files_as_historical_migration_artifacts,true);
});

test('Stage B/C Pages verifier retains historical runtime transition coverage',()=>{
  assert.match(verifier,/audit-overlay-runtime-transition\.mjs/);
});
