import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadCanonicalRunStore,validateIntelligenceExtensionV1,validatePatchOperations,INTELLIGENCE_EXTENSION_VERSION} from '../lib/run-store.mjs';

const uiUrl=new URL('../ui-v41-intelligence.js',import.meta.url);
const manifestUrl=new URL('../runtime-modules.mjs',import.meta.url);
const patchSchemaUrl=new URL('../schemas/patch-v1.schema.json',import.meta.url);
const intelligenceSchemaUrl=new URL('../schemas/intelligence-v1.schema.json',import.meta.url);

const ui=fs.readFileSync(uiUrl,'utf8');
const manifest=fs.readFileSync(manifestUrl,'utf8');
const patchSchema=JSON.parse(fs.readFileSync(patchSchemaUrl,'utf8'));
const intelligenceSchema=JSON.parse(fs.readFileSync(intelligenceSchemaUrl,'utf8'));

test('intelligence v1 has explicit versioned schema and public runtime module',()=>{
  assert.equal(INTELLIGENCE_EXTENSION_VERSION,'engineer-osint-intelligence-v1');
  assert.deepEqual(intelligenceSchema.required,['assessments','gaps','contradictions']);
  assert.ok(patchSchema.properties.extensions.properties.intelligence_v1);
  assert.match(manifest,/engineer-ui-v41-intelligence-module/);
  assert.match(manifest,/ui-v41-intelligence\.js/);
  new vm.Script(ui,{filename:'ui-v41-intelligence.js'});
});

test('intelligence v1 validates evidence-backed assessments, gaps and contradictions',()=>{
  const patch={extensions:{intelligence_v1:{
    assessments:[{assessment_id:'ENG-ASMT-0001',assessment_cs:'Testovací hodnocení',confidence:'HIGH',supporting_evidence_ids:['ENG-EVID-0001'],source_ids:['ENG-SRC-0001'],related_ids:['ENG-TECH-0001'],last_reviewed:'2026-08-28'}],
    gaps:[{gap_id:'ENG-GAP-0001',question_cs:'Co zatím nevíme?',priority:'P1',status:'OPEN',related_ids:['ENG-TECH-0001'],sources_checked:['ENG-SRC-0001'],first_opened:'2026-08-28',last_checked:'2026-08-28'}],
    contradictions:[{contradiction_id:'ENG-CONTRA-0001',topic_cs:'Rozpor',claim_a_cs:'Tvrzení A',claim_b_cs:'Tvrzení B',source_a_ids:['ENG-SRC-0001'],source_b_ids:['ENG-SRC-0002'],status:'UNDER_REVIEW',date_identified:'2026-08-28',confidence:'MEDIUM',related_ids:['ENG-TECH-0001']}]
  }}};
  const ext=validateIntelligenceExtensionV1(patch);
  assert.equal(ext.assessments.length,1);
  assert.equal(ext.gaps.length,1);
  assert.equal(ext.contradictions.length,1);
  assert.throws(()=>validateIntelligenceExtensionV1({extensions:{intelligence_v1:{assessments:[{assessment_id:'ENG-ASMT-BAD',assessment_cs:'Bez důkazu',confidence:'HIGH',supporting_evidence_ids:[],source_ids:['ENG-SRC-0001'],last_reviewed:'2026-08-28'}],gaps:[],contradictions:[]}}}),/supporting_evidence_ids must not be empty/);
});

test('versioned correction operations accept intelligence collections',()=>{
  const patch={state:{counts:{CORRECTION:1}},extensions:{operations_v1:[{
    operation_id:'ENG-OP-v41-test',op:'RETRACT',collection:'assessments',target_id:'ENG-ASMT-0001',reason:'Superseded assessment with sourced replacement',source_ids:['ENG-SRC-0001']
  }]}};
  assert.equal(validatePatchOperations(patch).length,1);
});

test('existing append-only history remains hash-compatible under v4.1 code',()=>{
  const store=loadCanonicalRunStore({root:new URL('..',import.meta.url).pathname.replace(/\/$/,'')});
  assert.equal(store.report.status,'SNAPSHOT_CHAIN_COMPLETE');
  assert.match(store.report.current_run_id,/^engineer-osint-\d{8}-B\d{2,}$/);
  assert.match(store.report.canonical_sha256,/^[a-f0-9]{64}$/);
});

test('v4.1 UI distinguishes canonical intelligence from legacy compatibility views',()=>{
  assert.match(ui,/CANONICAL INTELLIGENCE V1/);
  assert.match(ui,/KOMPATIBILNÍ POHLED ZE STARŠÍCH POLÍ/);
  assert.match(ui,/nativeAssessments/);
  assert.match(ui,/nativeGaps/);
  assert.match(ui,/nativeContradictions/);
  assert.match(ui,/supporting_evidence_ids/);
  assert.match(ui,/sources_checked/);
  assert.match(ui,/source_a_ids/);
  assert.match(ui,/source_b_ids/);
});
