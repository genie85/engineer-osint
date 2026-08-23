import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {
  compareRunIds,deepDiff,IntegrityError,loadValidatedPatchHistory,mergeIdentified,parseJsonStrict,
  PATCH_SCHEMA_VERSION,safeInlineJson,STRICT_OPTIONAL_FIELDS,STRICT_REQUIRED_ARRAYS,
  STRICT_REQUIRED_COUNTS,STRICT_REQUIRED_OBJECTS,translationMutationViolations,
  validatePatch,validatePublicUrls,validateStrictMaterialization
} from '../lib/integrity.mjs';
import {
  isIntrinsicTranslationPath,LEGACY_FACTUAL_OVERLAY_MODULES,
  LOCALIZATION_DATA_MODULES,PUBLIC_RUNTIME_MODULES
} from '../runtime-modules.mjs';

const validStrictPatch=()=>({
  schema_version:'engineer-osint-patch-v1',
  state:{
    run_id:'engineer-osint-20260823-B62',parent_run_id:'engineer-osint-20260823-B61',status:'SUCCESS',
    window_from:'2026-08-20T14:20:47+02:00',window_to:'2026-08-20T15:20:47+02:00',
    counts:{CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0}
  },
  continuity:{},true_delta:{},new_records:[],updated_records:[],sources:[],relations:[],evidence:[],visuals:[],media:[],
  technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],qa:{},
  presentation_fact_overlay_gap:'OPEN',extensions:{}
});
const legacyAuditEnabled=process.env.ENGINEER_OSINT_LEGACY_AUDIT==='1';

test('safeInlineJson prevents script termination while preserving JSON round trip',()=>{
  const payload={text:'</script><script>alert(1)</script>&'};
  const serialized=safeInlineJson(payload);
  assert.equal(serialized.includes('</script>'),false);
  assert.deepEqual(JSON.parse(serialized),payload);
});

test('strict JSON parser rejects duplicate keys',()=>{
  assert.throws(()=>parseJsonStrict('{"state":1,"state":2}',{source:'fixture'}),IntegrityError);
  assert.deepEqual(parseJsonStrict('{"state":{"ok":true}}'),{state:{ok:true}});
});

test('public URL validation rejects active schemes and credentials',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,x','https://user:pass@example.test/x']){
    assert.throws(()=>validatePublicUrls({source_url:url}),IntegrityError);
  }
  assert.doesNotThrow(()=>validatePublicUrls({source_url:'https://example.test/x'}));
});

test('strict patch validates stable shape and declared counts',()=>{
  assert.doesNotThrow(()=>validatePatch(validStrictPatch(),{strict:true}));
  const bad=validStrictPatch();
  bad.lessons_learned.push({note_en:'missing id'});
  assert.throws(()=>validatePatch(bad,{strict:true}),IntegrityError);
});

test('strict patch rejects a declared count mismatch',()=>{
  const bad=validStrictPatch();
  bad.new_records.push({id:'ENG-EVT-9999'});
  assert.throws(()=>validatePatch(bad,{strict:true}),IntegrityError);
});

test('strict patch rejects an unknown top-level field',()=>{
  const bad=validStrictPatch();
  bad.unversioned_field={};
  assert.throws(()=>validatePatch(bad,{strict:true}),IntegrityError);
});

test('strict patch rejects the singular legacy observed_minimum field',()=>{
  const bad=validStrictPatch();
  bad.observed_minimum=[];
  assert.throws(()=>validatePatch(bad,{strict:true}),IntegrityError);
});

test('strict patch rejects missing counts and unknown schema versions',()=>{
  const missing=validStrictPatch();
  delete missing.state.counts.CURRENT_DELTA;
  assert.throws(()=>validatePatch(missing,{strict:true}),IntegrityError);
  const unknown=validStrictPatch();
  unknown.schema_version='engineer-osint-patch-v999';
  assert.throws(()=>validatePatch(unknown,{strict:true}),IntegrityError);
});

test('legacy merge derives a stable ID instead of dropping an item',()=>{
  const item={classification:'OBSERVATION',related_id:'ENG-EVT-0001',note_en:'test'};
  const first=mergeIdentified([], [item], {keys:['id'],kind:'lessons',legacyIdPrefix:'ENG-LL-LEGACY'});
  const second=mergeIdentified([], [item], {keys:['id'],kind:'lessons',legacyIdPrefix:'ENG-LL-LEGACY'});
  assert.equal(first.length,1);
  assert.equal(first[0].id,second[0].id);
  assert.equal(first[0].id_provenance,'DETERMINISTIC_LEGACY');
});

test('deep diff permits translated fields but detects factual mutation',()=>{
  const before=[{id:'ENG-EVT-0001',title:'A',source_ids:['ENG-SRC-0001']}];
  const translated=[{...before[0],title_cs:'Á'}];
  const factual=[{...translated[0],source_ids:['ENG-SRC-0002']}];
  const allow=path=>path.endsWith('_cs');
  assert.deepEqual(deepDiff(before,translated,{allowedPath:allow}),[]);
  assert.equal(deepDiff(before,factual,{allowedPath:allow})[0].path,'[0].source_ids[0]');
});

test('translation guard accepts provenance-backed localization and rejects factual mutation',()=>{
  const before={records:{records:[{id:'ENG-EVT-0001',title:'A'}]},leads:{leads:[{id:'LEAD-1',title:'B'}]},sources:{sources:[{id:'ENG-SRC-1',title:'C'}]}};
  const translated=structuredClone(before);
  translated.records.records[0].title_cs='Á';
  translated.records.records[0].__i18n_public_orig={title:'A'};
  translated.records.records[0].title='Á';
  translated.leads.leads[0].title_cs='Bé';
  translated.translation_audit_cs={status:'PASS'};
  assert.deepEqual(translationMutationViolations(before,translated,{intrinsicPath:isIntrinsicTranslationPath}),[]);
  const factual=structuredClone(translated);
  factual.sources.sources[0].title='changed';
  assert.equal(translationMutationViolations(before,factual,{intrinsicPath:isIntrinsicTranslationPath}).some(change=>change.path==='sources.sources[0].title'),true);
});

test('strict materialization rejects invalid delta semantics and orphan references',()=>{
  const patch=validStrictPatch();
  patch.new_records=[{id:'ENG-EVT-0002',source_ids:['ENG-SRC-0001']}];
  patch.state.counts.NEW=1;
  patch.state.counts.NEW_SOURCES=1;
  patch.sources=[{id:'ENG-SRC-0001',url:'https://example.test/source'}];
  const materialized={recordIdsBefore:['ENG-EVT-0001'],records:[{id:'ENG-EVT-0001'},...patch.new_records],sources:patch.sources,relations:[],evidence:[],visuals:[],media:[]};
  assert.doesNotThrow(()=>validateStrictMaterialization(patch,materialized));
  const duplicate=structuredClone(patch);duplicate.new_records[0].id='ENG-EVT-0001';
  assert.throws(()=>validateStrictMaterialization(duplicate,materialized),IntegrityError);
  const orphan=structuredClone(patch);orphan.new_records[0].source_ids=['ENG-SRC-MISSING'];
  assert.throws(()=>validateStrictMaterialization(orphan,materialized),IntegrityError);
});

test('strict materialization classifies new and updated registries against prior IDs',()=>{
  const patch=validStrictPatch();
  patch.sources=[{id:'ENG-SRC-OLD',url:'https://example.test/old'},{id:'ENG-SRC-NEW',url:'https://example.test/new'}];
  patch.relations=[{relation_id:'ENG-REL-OLD',subject_id:'ENG-EVT-0001',object_id:'ENG-EVT-0002'}];
  patch.evidence=[{evidence_id:'ENG-EVID-NEW',related_ids:['ENG-EVT-0001'],source_ids:['ENG-SRC-NEW']}];
  Object.assign(patch.state.counts,{NEW_SOURCES:1,UPDATED_SOURCES:1,NEW_RELATIONS:0,UPDATED_RELATIONS:1,NEW_EVIDENCE:1,UPDATED_EVIDENCE:0});
  const materialized={
    recordIdsBefore:['ENG-EVT-0001','ENG-EVT-0002'],sourceIdsBefore:['ENG-SRC-OLD'],relationIdsBefore:['ENG-REL-OLD'],evidenceIdsBefore:[],
    records:[{id:'ENG-EVT-0001'},{id:'ENG-EVT-0002'}],sources:patch.sources,relations:patch.relations,evidence:patch.evidence,visuals:[],media:[]
  };
  assert.doesNotThrow(()=>validateStrictMaterialization(patch,materialized));
  patch.state.counts.UPDATED_SOURCES=0;
  assert.throws(()=>validateStrictMaterialization(patch,materialized),IntegrityError);
});

test('strict materialization rejects orphan relation, evidence and media references',()=>{
  const base={recordIdsBefore:['ENG-EVT-0001'],records:[{id:'ENG-EVT-0001'}],sources:[],relations:[],evidence:[],visuals:[],media:[]};
  const relation=validStrictPatch();
  relation.relations=[{relation_id:'ENG-REL-NEW',subject_id:'ENG-EVT-0001',object_id:'ENG-EVT-MISSING'}];
  relation.state.counts.NEW_RELATIONS=1;
  assert.throws(()=>validateStrictMaterialization(relation,{...base,relations:relation.relations}),IntegrityError);
  const evidence=validStrictPatch();
  evidence.evidence=[{evidence_id:'ENG-EVID-NEW',related_ids:['ENG-EVT-MISSING']}];
  evidence.state.counts.NEW_EVIDENCE=1;
  assert.throws(()=>validateStrictMaterialization(evidence,{...base,evidence:evidence.evidence}),IntegrityError);
  const media=validStrictPatch();
  media.media=[{media_id:'ENG-MEDIA-NEW',related_ids:['ENG-EVT-MISSING'],url:'https://example.test/media'}];
  media.state.counts.NEW_MEDIA=1;
  assert.throws(()=>validateStrictMaterialization(media,{...base,media:media.media}),IntegrityError);
});

test('schema document stays aligned with the stdlib strict validator',()=>{
  const schema=JSON.parse(readFileSync('docs/engineer-osint/schemas/patch-v1.schema.json','utf8'));
  assert.equal(schema.properties.schema_version.const,PATCH_SCHEMA_VERSION);
  assert.deepEqual(new Set(schema.required),new Set(['schema_version','state',...STRICT_REQUIRED_OBJECTS,...STRICT_REQUIRED_ARRAYS]));
  assert.deepEqual(new Set(Object.keys(schema.properties)),new Set(['schema_version','state',...STRICT_REQUIRED_OBJECTS,...STRICT_REQUIRED_ARRAYS,...STRICT_OPTIONAL_FIELDS]));
  assert.deepEqual(new Set(schema.properties.state.properties.counts.required),new Set(STRICT_REQUIRED_COUNTS));
  assert.deepEqual(new Set(Object.keys(schema.properties.state.properties.counts.properties)),new Set(STRICT_REQUIRED_COUNTS));
  assert.equal(schema.properties.state.properties.counts.additionalProperties,false);
  assert.equal(schema.additionalProperties,false);
});

test('real legacy history is explicit degraded state, never complete',{skip:!legacyAuditEnabled},()=>{
  const source='docs/engineer-osint';
  const {report}=loadValidatedPatchHistory({
    patchPath:join(source,'b11-patch.json'),manifestPath:join(source,'history-integrity-baseline.json')
  });
  assert.equal(report.status,'DEGRADED_LEGACY_ACKNOWLEDGED');
  assert.equal(report.malformed_patch_shas.length,3);
  assert.equal(report.duplicate_run_ids.length,5);
});

test('worktree after the cutoff cannot bypass strict schema with an older run date',{skip:!legacyAuditEnabled},()=>{
  const source='docs/engineer-osint';
  const legacy=JSON.parse(readFileSync(join(source,'b11-patch.json'),'utf8'));
  legacy.state.run_id='engineer-osint-20260822-B99';
  legacy.state.parent_run_id='engineer-osint-20260823-B61';
  assert(compareRunIds(legacy.state.run_id,legacy.state.parent_run_id)<0);
  assert.throws(()=>loadValidatedPatchHistory({
    patchPath:join(source,'b11-patch.json'),manifestPath:join(source,'history-integrity-baseline.json'),
    currentRawOverride:JSON.stringify(legacy)
  }),IntegrityError);
});

test('published legacy cutoff run cannot be changed in the worktree',{skip:!legacyAuditEnabled},()=>{
  const source='docs/engineer-osint';
  const legacy=JSON.parse(readFileSync(join(source,'b11-patch.json'),'utf8'));
  legacy.state.counts.NEW=999;
  assert.throws(()=>loadValidatedPatchHistory({
    patchPath:join(source,'b11-patch.json'),manifestPath:join(source,'history-integrity-baseline.json'),
    currentRawOverride:JSON.stringify(legacy)
  }),IntegrityError);
});

test('canonical snapshot restores base values, keeps translations and is deeply frozen',()=>{
  const source={records:{records:[{id:'ENG-EVT-0001',title:'lokalizováno',title_cs:'lokalizováno',__i18n_public_orig:{title:'original'}}]}};
  const context={window:{__ENGINEER_DATA__:source},structuredClone};
  vm.runInNewContext(readFileSync('docs/engineer-osint/canonical-snapshot.js','utf8'),context,{timeout:1000});
  const snapshot=context.window.__ENGINEER_CANONICAL_DATA__;
  assert.equal(Object.isFrozen(snapshot),true);
  assert.equal(Object.isFrozen(snapshot.records.records[0]),true);
  source.records.records[0].title='localized';
  assert.equal(snapshot.records.records[0].title,'original');
  assert.equal(snapshot.records.records[0].title_cs,'lokalizováno');
  assert.equal('__i18n_public_orig' in snapshot.records.records[0],false);
  assert.equal(Object.keys(context.window).includes('__ENGINEER_CANONICAL_DATA__'),false);
});

test('CSV export neutralizes spreadsheet formulas and uses the canonical snapshot',()=>{
  const source=readFileSync('docs/engineer-osint/ui-phase9-intelligence.js','utf8');
  const match=source.match(/(const csvCell=.*?);function advanced\(\)/s);
  assert(match,'csvCell helper not found');
  const context={};
  vm.runInNewContext(`${match[1]};result=['=HYPERLINK(1)','+CMD','-1','@SUM(1)','\\tTAB','\\rCR','safe'].map(csvCell)`,context,{timeout:1000});
  for(const cell of context.result.slice(0,6))assert.match(cell,/^"'/);
  assert.equal(context.result[6],'"safe"');
  assert.match(source,/const D=window\.__ENGINEER_CANONICAL_DATA__\|\|window\.__ENGINEER_DATA__/);
});

test('public postprocess and runtime audit share one explicit module manifest',()=>{
  const source=readFileSync('docs/engineer-osint/postprocess-ui.mjs','utf8');
  assert.equal(PUBLIC_RUNTIME_MODULES.some(([,file])=>file==='canonical-snapshot.js'),true);
  assert.match(source,/PUBLIC_RUNTIME_MODULES/);
  const audit=readFileSync('docs/engineer-osint/validate-runtime.mjs','utf8');
  assert.match(audit,/LOCALIZATION_DATA_MODULES/);
  assert.match(audit,/LEGACY_FACTUAL_OVERLAY_MODULES/);
  assert.equal(LOCALIZATION_DATA_MODULES.some(([,file])=>file==='i18n-content-cs-events-backlog.js'),true);
  const legacy=parseJsonStrict(readFileSync('docs/engineer-osint/legacy-runtime-overlay-baseline.json','utf8'));
  assert.deepEqual(new Set(Object.keys(legacy.modules)),new Set(LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file)));
  assert.equal(PUBLIC_RUNTIME_MODULES.length>LOCALIZATION_DATA_MODULES.length,true);
  const snapshotIndex=PUBLIC_RUNTIME_MODULES.findIndex(([,file])=>file==='canonical-snapshot.js');
  const lastLocalization=Math.max(...LOCALIZATION_DATA_MODULES.map(([,file])=>PUBLIC_RUNTIME_MODULES.findIndex(([,candidate])=>candidate===file)));
  assert.equal(snapshotIndex>lastLocalization,true);
});
