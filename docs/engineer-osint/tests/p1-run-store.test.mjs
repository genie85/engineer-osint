import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {canonicalDigest,IntegrityError,sha256Text} from '../lib/integrity.mjs';
import {
  applyStrictPatchToCanonicalData,loadCanonicalRunStore,RUN_STORE_SCHEMA_VERSION,validateLegacyMirrorSyncV1,validatePatchOperations
} from '../lib/run-store.mjs';

const counts=()=>({CURRENT_DELTA:0,LATE_DISCOVERED_CURRENT:0,HISTORICAL_BACKFILL:0,ENTITY_ENRICHMENT:0,NEW:0,UPDATE:0,CONFIRMATION:0,CORRECTION:0,CONTRADICTION:0,LEAD:0,NEW_RELATIONS:0,UPDATED_RELATIONS:0,NEW_EVIDENCE:0,UPDATED_EVIDENCE:0,NEW_SOURCES:0,UPDATED_SOURCES:0,NEW_VISUALS:0,NEW_MEDIA:0});
const patch=()=>({
  schema_version:'engineer-osint-patch-v1',state:{run_id:'engineer-osint-20260823-B62',parent_run_id:'engineer-osint-20260823-B61',status:'SUCCESS',window_from:'2026-08-23T03:00:00+02:00',window_to:'2026-08-23T04:00:00+02:00',counts:counts()},
  continuity:{},true_delta:{},new_records:[],updated_records:[],sources:[],relations:[],evidence:[],visuals:[],media:[],technology_signals:[],lead_updates:[],observed_minimum_updates:[],lessons_learned:[],qa:{},presentation_fact_overlay_gap:'OPEN',extensions:{}
});
const canonical=()=>({
  state_latest:{run_id:'engineer-osint-20260823-B61'},records:{records:[{id:'ENG-EVT-TEST1',title:'old',tags:['keep','remove'],source_ids:['ENG-SRC-TEST1']},{id:'ENG-EVT-TEST2',title:'independent'}]},
  sources:{sources:[{id:'ENG-SRC-TEST1',url:'https://example.test/source'}]},relations:{relations:[]},evidence:{evidence:[]},visual_registry:{visuals:[]},media_registry:{media:[]},
  leads:{leads:[]},lessons_learned:{lessons:[]},dashboard_patch_extras:{technology_signals:[],observed_minimum_updates:[],patch_history_runs:['engineer-osint-20260823-B61'],external_leads:[]},
  run_history:{runs:[{run_id:'engineer-osint-20260823-B61'}]},dashboard_materialization:{status:'SUCCESS'}
});
const operation=(op,extra={})=>({operation_id:`ENG-OP-${op}`,op,collection:'records',target_id:'ENG-EVT-TEST1',reason:'Evidence-backed correction for test',source_ids:['ENG-SRC-TEST1'],...extra});

test('correction operations replace fields, remove references and retract safely',()=>{
  const replace=patch();replace.state.counts.CORRECTION=1;replace.extensions.operations_v1=[operation('REPLACE_FIELD',{field:'title',value:'new'})];
  assert.equal(applyStrictPatchToCanonicalData(canonical(),replace).records.records[0].title,'new');

  const remove=patch();remove.state.counts.CORRECTION=1;remove.extensions.operations_v1=[operation('REMOVE_REFERENCE',{field:'tags',value:'remove'})];
  assert.deepEqual(applyStrictPatchToCanonicalData(canonical(),remove).records.records[0].tags,['keep']);

  const retract=patch();retract.state.counts.CORRECTION=1;retract.extensions.operations_v1=[operation('RETRACT',{target_id:'ENG-EVT-TEST2'})];
  assert.equal(applyStrictPatchToCanonicalData(canonical(),retract).records.records.some(item=>item.id==='ENG-EVT-TEST2'),false);
});

test('REMOVE_FIELD deletes an existing top-level field and fails closed on unsafe requests',()=>{
  const remove=patch();remove.state.counts.CORRECTION=1;remove.extensions.operations_v1=[operation('REMOVE_FIELD',{field:'title'})];
  const removed=applyStrictPatchToCanonicalData(canonical(),remove);
  assert.equal(Object.hasOwn(removed.records.records[0],'title'),false);

  const protectedId=patch();protectedId.state.counts.CORRECTION=1;protectedId.extensions.operations_v1=[operation('REMOVE_FIELD',{field:'id'})];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),protectedId),IntegrityError);

  const missing=patch();missing.state.counts.CORRECTION=1;missing.extensions.operations_v1=[operation('REMOVE_FIELD',{field:'summary'})];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),missing),IntegrityError);

  const withValue=patch();withValue.state.counts.CORRECTION=1;withValue.extensions.operations_v1=[operation('REMOVE_FIELD',{field:'title',value:null})];
  assert.throws(()=>validatePatchOperations(withValue),IntegrityError);
});

test('explicit legacy updated_records mirror sync is field-scoped and canonical-derived',()=>{
  const base=canonical();
  base.dashboard_patch_extras.updated_records=[{id:'ENG-EVT-TEST1',title:'stale',summary:'legacy-only',source_ids:['ENG-SRC-TEST1']}];
  const next=patch();next.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['title','summary']}]};
  const result=applyStrictPatchToCanonicalData(base,next),mirror=result.dashboard_patch_extras.updated_records[0];
  assert.equal(result.records.records[0].title,'old');
  assert.equal(mirror.title,'old');
  assert.equal(Object.hasOwn(mirror,'summary'),false);
  assert.deepEqual(mirror.source_ids,['ENG-SRC-TEST1']);
});

test('legacy mirror sync fails closed on missing, duplicate, protected and stale requests',()=>{
  const base=canonical();base.dashboard_patch_extras.updated_records=[{id:'ENG-EVT-TEST1',title:'stale'}];
  const missing=patch();missing.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-MISSING',fields:['title']}]};
  assert.throws(()=>applyStrictPatchToCanonicalData(base,missing),IntegrityError);
  const protectedField=patch();protectedField.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['id']}]};
  assert.throws(()=>validateLegacyMirrorSyncV1(protectedField),IntegrityError);
  const duplicateField=patch();duplicateField.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['title','title']}]};
  assert.throws(()=>validateLegacyMirrorSyncV1(duplicateField),IntegrityError);
  const duplicateTarget=patch();duplicateTarget.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['title']},{target_id:'ENG-EVT-TEST1',fields:['tags']}]};
  assert.throws(()=>validateLegacyMirrorSyncV1(duplicateTarget),IntegrityError);
  const stale=patch();stale.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['summary']}]};
  const noSummary=canonical();noSummary.dashboard_patch_extras.updated_records=[{id:'ENG-EVT-TEST1'}];
  assert.throws(()=>applyStrictPatchToCanonicalData(noSummary,stale),IntegrityError);
  const noMirror=patch();noMirror.extensions.legacy_mirror_sync_v1={updated_records:[{target_id:'ENG-EVT-TEST1',fields:['title']}]};
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),noMirror),IntegrityError);
});

test('strict append materializes a new source and record with provenance',()=>{
  const next=patch();
  next.sources=[{id:'ENG-SRC-TEST2',title:'New source',url:'https://example.test/new'}];
  next.new_records=[{id:'ENG-EVT-TEST3',title_en:'New event',source_ids:['ENG-SRC-TEST2']}];
  next.state.counts.NEW=1;next.state.counts.NEW_SOURCES=1;
  const result=applyStrictPatchToCanonicalData(canonical(),next),record=result.records.records.find(item=>item.id==='ENG-EVT-TEST3');
  assert.equal(record.title,'New event');
  assert.equal(record.run_id,next.state.run_id);
  assert.equal(record.first_seen_run,next.state.run_id);
  assert.equal(result.sources.sources.some(item=>item.id==='ENG-SRC-TEST2'),true);
});

test('correction operations reject ambiguity, protected IDs and orphaning',()=>{
  const duplicate=patch();duplicate.state.counts.CORRECTION=2;duplicate.extensions.operations_v1=[operation('REPLACE_FIELD',{field:'title',value:'x'}),operation('REPLACE_FIELD',{field:'summary',value:'y'})];
  assert.throws(()=>validatePatchOperations(duplicate),IntegrityError);
  const protectedId=patch();protectedId.state.counts.CORRECTION=1;protectedId.extensions.operations_v1=[operation('REPLACE_FIELD',{field:'id',value:'ENG-EVT-NEW'})];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),protectedId),IntegrityError);
  const missingSource=patch();missingSource.state.counts.CORRECTION=1;missingSource.extensions.operations_v1=[operation('REPLACE_FIELD',{field:'title',value:'x',source_ids:['ENG-SRC-MISSING']})];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),missingSource),IntegrityError);
  const orphan=patch();orphan.state.counts.CORRECTION=1;orphan.extensions.operations_v1=[{...operation('RETRACT'),collection:'sources',target_id:'ENG-SRC-TEST1'}];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),orphan),IntegrityError);
  const samePatch=patch();samePatch.updated_records=[{id:'ENG-EVT-TEST1',title:'updated'}];samePatch.state.counts.UPDATE=1;samePatch.state.counts.CORRECTION=1;samePatch.extensions.operations_v1=[operation('REPLACE_FIELD',{field:'title',value:'corrected'})];
  assert.throws(()=>applyStrictPatchToCanonicalData(canonical(),samePatch),IntegrityError);
});

function fixtureStore(){
  const root=mkdtempSync(join(tmpdir(),'engineer-run-store-'));
  mkdirSync(join(root,'data/snapshots'),{recursive:true});mkdirSync(join(root,'data/runs'),{recursive:true});
  const data=canonical(),snapshotRaw=JSON.stringify(data,null,2)+'\n';
  writeFileSync(join(root,'data/snapshots/canonical-engineer-osint-20260823-B61.json'),snapshotRaw);
  const manifest={schema_version:RUN_STORE_SCHEMA_VERSION,store_id:'test',snapshot:{run_id:'engineer-osint-20260823-B61',path:'data/snapshots/canonical-engineer-osint-20260823-B61.json',file_sha256:sha256Text(snapshotRaw),canonical_sha256:canonicalDigest(data),legacy_run_count:1,legacy_revision_count:1,record_count:2,source_count:1},runs:[],legacy_history:{status:'COMPLETE'},policy:{append_only:true}};
  writeFileSync(join(root,'data/run-store-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {root,data,manifest,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

test('run-store verifies an append-only file and canonical hash chain',()=>{
  const fixture=fixtureStore();
  try{
    const next=patch(),raw=JSON.stringify(next,null,2)+'\n',result=applyStrictPatchToCanonicalData(fixture.data,next);
    writeFileSync(join(fixture.root,`data/runs/${next.state.run_id}.json`),raw);
    fixture.manifest.runs.push({run_id:next.state.run_id,parent_run_id:next.state.parent_run_id,parent_canonical_sha256:fixture.manifest.snapshot.canonical_sha256,path:`data/runs/${next.state.run_id}.json`,file_sha256:sha256Text(raw),canonical_sha256:canonicalDigest(result)});
    writeFileSync(join(fixture.root,'data/run-store-manifest.json'),JSON.stringify(fixture.manifest,null,2)+'\n');
    const loaded=loadCanonicalRunStore({root:fixture.root});
    assert.equal(loaded.report.status,'SNAPSHOT_CHAIN_COMPLETE');
    assert.equal(loaded.report.append_only_run_count,1);
    assert.equal(loaded.report.current_run_id,next.state.run_id);
  }finally{fixture.cleanup();}
});

test('run-store rejects altered files, stale parents and unregistered runs',()=>{
  for(const scenario of ['snapshot-hash','parent','run-hash','unregistered-file']){
    const fixture=fixtureStore();
    try{
      const next=patch(),raw=JSON.stringify(next,null,2)+'\n',result=applyStrictPatchToCanonicalData(fixture.data,next),entry={run_id:next.state.run_id,parent_run_id:next.state.parent_run_id,parent_canonical_sha256:fixture.manifest.snapshot.canonical_sha256,path:`data/runs/${next.state.run_id}.json`,file_sha256:sha256Text(raw),canonical_sha256:canonicalDigest(result)};
      writeFileSync(join(fixture.root,`data/runs/${next.state.run_id}.json`),scenario==='run-hash'?raw+' ':raw);
      if(scenario==='snapshot-hash')fixture.manifest.snapshot.file_sha256='0'.repeat(64);
      if(scenario==='parent')entry.parent_run_id='engineer-osint-20260823-B60';
      fixture.manifest.runs.push(entry);
      if(scenario==='unregistered-file')writeFileSync(join(fixture.root,'data/runs/engineer-osint-20260823-B99.json'),'{}\n');
      writeFileSync(join(fixture.root,'data/run-store-manifest.json'),JSON.stringify(fixture.manifest,null,2)+'\n');
      assert.throws(()=>loadCanonicalRunStore({root:fixture.root}),IntegrityError,scenario);
    }finally{fixture.cleanup();}
  }
});

test('repository snapshot is canonical and no Git history is needed to load it',()=>{
  const loaded=loadCanonicalRunStore({root:'docs/engineer-osint'});
  assert.equal(loaded.report.snapshot_run_id,'engineer-osint-20260823-B61');
  assert.equal(loaded.report.current_run_id,loaded.data.state_latest.run_id);
  const next=patch(),match=loaded.report.current_run_id.match(/^(engineer-osint-\d{8}-B)(\d+)$/);
  assert.ok(match,'current run ID must be incrementable for append-only smoke test');
  next.state.parent_run_id=loaded.report.current_run_id;
  next.state.run_id=`${match[1]}${String(Number(match[2])+1).padStart(match[2].length,'0')}`;
  assert.equal(applyStrictPatchToCanonicalData(loaded.data,next).state_latest.run_id,next.state.run_id);
  assert.equal(readFileSync('docs/engineer-osint/data/run-store-manifest.json','utf8').includes('DEGRADED_LEGACY_ACKNOWLEDGED'),true);
});

test('patch schema publishes explicit legacy updated_records mirror sync contract',()=>{
  const schema=JSON.parse(readFileSync('docs/engineer-osint/schemas/patch-v1.schema.json','utf8'));
  assert.equal(schema.properties.extensions.properties.legacy_mirror_sync_v1.$ref,'#/$defs/legacyMirrorSyncV1');
  assert.deepEqual(schema.$defs.legacyMirrorSyncV1.required,['updated_records']);
  assert.deepEqual(schema.$defs.legacyUpdatedRecordMirrorSyncRequest.required,['target_id','fields']);
  assert.equal(schema.$defs.legacyUpdatedRecordMirrorSyncRequest.properties.fields.uniqueItems,true);
});

test('patch schema publishes the versioned correction operation contract',()=>{
  const schema=JSON.parse(readFileSync('docs/engineer-osint/schemas/patch-v1.schema.json','utf8'));
  assert.equal(schema.properties.extensions.properties.operations_v1.items.$ref,'#/$defs/operationV1');
  assert.deepEqual(new Set(schema.$defs.operationV1.properties.op.enum),new Set(['REPLACE_FIELD','REMOVE_REFERENCE','REMOVE_FIELD','RETRACT']));
  assert.equal(schema.$defs.operationV1.additionalProperties,false);
});

test('P0 and P1 contracts agree that ancestor-only publication lag does not block factual continuity',()=>{
  const p0=readFileSync('docs/engineer-osint/P0_AUTONOMY_POLICY.md','utf8');
  const p1=readFileSync('docs/engineer-osint/P1_RUN_STORE.md','utf8');
  for(const contract of [p0,p1]){
    assert.match(contract,/`FACTUAL_SUCCESS_TIP`/);
    assert.match(contract,/`PUBLISHED_TIP`/);
    assert.match(contract,/`PUBLICATION_LAG`/);
    assert.match(contract,/must not block (?:the next factual research run|a later research run)/);
  }
  assert.doesNotMatch(p0,/new factual research run must not start/);
  assert.match(p0,/proven ancestor/);
  assert.match(p0,/Every intervening unpublished SUCCESS run must have a complete, validated and immutable handoff/);
  assert.match(p0,/`FACTUAL_PUBLICATION_LINEAGE_DIVERGENCE`/);
  assert.match(p0,/block both factual continuation and publication/);
  assert.match(p0,/appends exactly the first missing immutable run/);
});


test('strict append preserves disjoint legacy visual mirror before synchronization',()=>{
  const base=canonical();
  base.visual_registry={visuals:[{asset_id:'ENG-VIS-0001',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1']}]};
  base.dashboard_patch_extras.visuals=[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Katyusha'}];
  const result=applyStrictPatchToCanonicalData(base,patch());
  const canonicalIds=result.visual_registry.visuals.map(item=>item.asset_id||item.id).sort();
  const mirrorIds=result.dashboard_patch_extras.visuals.map(item=>item.asset_id||item.id).sort();
  assert.deepEqual(canonicalIds,['ENG-VIS-0001','ENG-VIS-0054']);
  assert.deepEqual(mirrorIds,canonicalIds);
});

test('strict append rejects conflicting legacy visual mirror identities',()=>{
  const base=canonical();
  base.visual_registry={visuals:[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Canonical'}]};
  base.dashboard_patch_extras.visuals=[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Conflicting mirror'}];
  assert.throws(()=>applyStrictPatchToCanonicalData(base,patch()),IntegrityError);
});
