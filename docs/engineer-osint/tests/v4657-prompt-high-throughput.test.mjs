import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='docs/engineer-osint';
const read=name=>readFileSync(`${root}/${name}`,'utf8');
const master=read('MASTER_PROMPT.md');
const core=read('PROMPT_CORE.md');
const research=read('PROMPT_RESEARCH.md');
const development=read('PROMPT_DEVELOPMENT.md');
const handoff=read('PROMPT_HANDOFF_CONTRACT.md');

const moduleVersion=text=>text.match(/\bv(3\.\d+)\b/)?.[1]??null;

test('v4.6.57 activates exact prompt semantic version 3.7 across the modular execution set',()=>{
  assert.match(master,/MASTER PROMPT v3\.7/);
  assert.equal(moduleVersion(master),'3.7');
  assert.equal(moduleVersion(core),'3.7');
  assert.equal(moduleVersion(research),'3.7');
  assert.equal(moduleVersion(development),'3.7');
  assert.match(handoff,/Prompt semantic version: 3\.7/);
});

test('v4.6.57 adds high-throughput orchestration without weakening the safety constitution',()=>{
  for(const phrase of [
    'HIGH-THROUGHPUT / NO-QUALITY-LOSS EXECUTION',
    'ONE ACTIVE WRITE SLICE',
    'FAIL CLOSED',
    'authorization → execution',
    'EXACT-HEAD CI',
    'SAFETY CONSTITUTION',
    'Canonical history nikdy nepřepisuj'
  ]) assert.ok(master.includes(phrase),`missing protected contract: ${phrase}`);
  assert.match(master,/DĚLEJ STEJNÉ NEBO SILNĚJŠÍ KONTROLY CHYTŘEJI, NE MÉNĚ KONTROL/);
});

test('v4.6.57 distinguishes dynamic fresh state from reusable exact immutable objects',()=>{
  assert.match(master,/DYNAMIC STATE/);
  assert.match(master,/IMMUTABLE EXACT OBJECT/);
  assert.match(master,/`main`, branch head, PR state/);
  assert.match(master,/canonical tip\/current run/);
  assert.match(master,/deployment\/Pages stav/);
  assert.match(master,/exact Git commit SHA, Git blob SHA/);
  assert.match(master,/aktuálním runu ověřen podle své exact identity/);
  assert.match(master,/Reuse immutable objektu nikdy nenahrazuje fresh verification dynamického reference/);
  assert.match(core,/Exact immutable commit\/blob\/hash objekt ověřený v tomto runu můžeš bezpečně reuse/);
});

test('v4.6.57 batches independent reads but serializes true dependencies',()=>{
  assert.match(master,/Batch-first fresh snapshot/);
  assert.match(master,/Nezávislé read-only dotazy prováděj podle možností v jednom batch\/parallel roundu/);
  assert.match(master,/Serializuj pouze kroky, jejichž správný vstup skutečně závisí na výsledku předchozího kroku/);
  assert.match(core,/Nezávislé read-only fresh-state dotazy batchuj\/paralelizuj/);
});

test('v4.6.57 safe runway accelerates reversible work but preserves one active write slice and fresh sequential boundaries',()=>{
  assert.match(master,/### Safe runway/);
  assert.match(master,/Nezastavuj pouze proto, že vznikla branch, commit, PR nebo targeted test/);
  assert.match(master,/více navazujících slices pouze sekvenčně/);
  assert.match(master,/předchozí slice musí být plně uzavřen/);
  assert.match(master,/ONE ACTIVE WRITE SLICE/);
  assert.match(development,/Safe runway dovoluje pokračovat přes branch → implementaci → targeted test → PR → gate/);
});

test('v4.6.57 mutation bundles are strictly CLASS B/C and excluded from protected CLASS A writes',()=>{
  assert.match(master,/CLASS B\/C mutation bundle/);
  assert.match(master,/Pro CLASS B nebo CLASS C lze použít mutation bundle/);
  assert.match(master,/předem vymezený účel, branch a explicitní path\/scope set/);
  assert.match(master,/Mutation bundle je zakázán pro CLASS A canonical\/history mutation, authorization\/execution, permission\/security-boundary změnu/);
  assert.match(core,/CLASS A canonical\/history\/authorization\/permissions\/security-boundary operace bundle používat nesmějí/);
  assert.match(development,/Mutation bundle nikdy nepoužívej pro CLASS A canonical\/history, authorization\/execution, permissions nebo security-boundary změny/);
});

test('v4.6.57 validates early and coalesces known fixes while keeping final exact-head full CI mandatory',()=>{
  assert.match(master,/Validate early, full CI on finalized head/);
  assert.match(master,/targeted\/static\/deterministic kontroly/);
  assert.match(master,/coalescuj je před dalším full-CI během/);
  assert.match(master,/celý požadovaný CI surface musí projít na finalizovaném PR headu/);
  assert.match(master,/Jakákoli následná změna headu zneplatní předchozí exact-head CI/);
  assert.match(development,/Jakákoli změna headu zneplatní předchozí exact-head výsledek/);
});

test('v4.6.57 observes CI efficiently without treating reduced observability as reduced validation',()=>{
  assert.match(master,/Efficient CI observability/);
  assert.match(master,/nejprve čti agregovaný workflow\/check status/);
  assert.match(master,/Detail jobu, stepů nebo logů načítej až při `FAILURE`, `CANCELLED`, nejasnosti, nondeterminismu/);
  assert.match(development,/CI nejprve sleduj agregovaně/);
  assert.match(development,/explicitní proof potřebě/);
});

test('v4.6.57 parallelizes research acquisition but keeps factual and media adjudication individual',()=>{
  assert.match(research,/Parallel discovery, individual adjudication/);
  assert.match(research,/source\/card\/claim discovery dotazy lze batchovat a paralelizovat/);
  assert.match(research,/Každý claim, conflict, confidence, media licence a identity classification musí být vyhodnocen individuálně/);
  assert.match(research,/nikdy samy automaticky nezvyšují `FACT`, confidence, licence ani identity status/);
  assert.match(research,/Counter-evidence search, freshness a provenance se kvůli throughputu nesmí omezit/);
});

test('v4.6.57 has an explicit no-quality-trade gate across master and domain views',()=>{
  for(const phrase of ['evidence quality','freshness','counter-evidence/conflict search','required test surface','exact-head semantics','fail-closed','auditovatelnost','canonical/historical ochranu']){
    assert.ok(master.includes(phrase),`master no-quality rule missing: ${phrase}`);
  }
  assert.match(core,/Optimalizace nesmí snížit evidence\/freshness, required test surface, exactness, fail-closed, auditovatelnost/);
  assert.match(development,/Žádná throughput optimalizace nesmí snížit test surface, exactness, fail-closed, auditovatelnost/);
});
