import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const master=readFileSync(`${root}/MASTER_PROMPT.md`,'utf8');
const core=readFileSync(`${root}/PROMPT_CORE.md`,'utf8');
const research=readFileSync(`${root}/PROMPT_RESEARCH.md`,'utf8');
const development=readFileSync(`${root}/PROMPT_DEVELOPMENT.md`,'utf8');
const promptSet=[master,core,research,development];

test('v4.6.85 activates one exact semantic prompt version across MASTER and all execution views',()=>{
  assert.match(master,/^# ENGINEER OSINT — AUTONOMOUS DEVELOPMENT MASTER PROMPT v3\.8$/m);
  assert.match(core,/^# ENGINEER OSINT — PROMPT CORE v3\.8$/m);
  assert.match(research,/^# ENGINEER OSINT — PROMPT RESEARCH v3\.8$/m);
  assert.match(development,/^# ENGINEER OSINT — PROMPT DEVELOPMENT v3\.8$/m);
  assert.match(core,/semantic version `3\.8` jako MASTER_PROMPT/);
  assert.doesNotMatch(core,/semantic version `3\.6` jako MASTER_PROMPT/);
});

test('v4.6.85 preserves MASTER authority and next-run-only prompt activation',()=>{
  assert.match(master,/`MASTER_PROMPT\.md` je jediná kanonická prompt autorita/);
  assert.match(master,/Prompt set jednoho běhu je immutable/);
  assert.match(master,/nová prompt revision se aktivuje až v následujícím runu/);
  assert.match(core,/Prompt set aktuálního běhu je immutable/);
  assert.match(development,/nová prompt revision se aktivuje až v následujícím běhu/);
});

test('v4.6.85 requires transitive lifecycle closure and deterministic phase-boundary simulation before expensive execution',()=>{
  assert.match(master,/celý relevantní transitivní dependency closure/);
  assert.match(master,/`S0 → S1 → S2 → \.\.\. → Sn`/);
  assert.match(master,/Dependency closure nesmí automaticky rozšiřovat authorization scope/);
  assert.match(core,/celý relevantní transitivní dependency closure/);
  assert.match(development,/`S0 → S1 → \.\.\. → Sn`/);
});

test('v4.6.85 pre-materializes exact Git successors when safe without granting them authority',()=>{
  assert.match(master,/construct → materialize immutable Git object → fetch\/read-back → verify exact bytes\/semantics → pin exact SHA in authorization/);
  assert.match(master,/Materializovaný successor před jeho autorizovanou instalací zůstává non-authoritative/);
  assert.match(core,/construct → materialize immutable Git object → fetch\/read-back → verify exact bytes\/semantics → pin exact SHA/);
  assert.match(development,/pre-materializuj, Git read-back ověř a až poté pinuj jeho SHA/);
});

test('v4.6.85 makes authorization guards self-consistent across exact source, intermediate and final states',()=>{
  assert.match(master,/Authorization nebo její regression guard nesmí autorizovat successor state, který její vlastní lifecycle assertion po instalaci předvídatelně odmítne/);
  assert.match(master,/exact authorized source state/);
  assert.match(master,/exact intermediate phase-boundary state/);
  assert.match(master,/exact final authorized successor state/);
  assert.match(master,/Wildcard, dynamické `current`, automatické přijímání neznámých budoucích SHA/);
  assert.match(development,/Povolené stavy musí být konečný explicitní set exact identit/);
});

test('v4.6.85 diagnoses suspected nondeterministic CI without rerun-until-green or expected-value drift',()=>{
  assert.match(master,/nejvýše jeden diagnostický rerun stejného failed workflow\/jobu na stejném exact-head SHA/);
  assert.match(master,/`PASS` → eviduj `SUSPECTED_FLAKY`/);
  assert.match(master,/Rerun nikdy nesmí sloužit k `rerun until green`/);
  assert.match(core,/nikdy nepoužívej `rerun until green`/);
  assert.match(development,/U podezření na nondeterministický browser\/DOM test neměň expected hodnotu po jednom náhodném běhu/);
});

test('v4.6.85 keeps rejected external writes fail-closed and forbids weaker bypasses',()=>{
  assert.match(master,/nepovažuj operaci za provedenou/);
  assert.match(master,/neobcházej exact expected-head\/hash protection slabším write mechanismem/);
  assert.match(core,/neobcházej exact expected-head\/hash ochranu slabším mechanismem/);
  assert.match(development,/nepoužívej slabší mechanismus jako bypass/);
});

test('v4.6.85 uses prompt repair only after earlier deterministic prevention layers and preserves the Safety Constitution',()=>{
  assert.match(master,/deterministic preflight\/test\/validator → orchestration\/process rule → prompt repair/);
  assert.match(master,/ANTI-LOOP neznamená automaticky prompt repair/);
  assert.match(master,/## 24\. SAFETY CONSTITUTION — NEZMĚNITELNÉ JÁDRO/);
  for(const prompt of promptSet){
    assert.doesNotMatch(prompt,/rerun until green[^`\n]*povol/i);
  }
});
