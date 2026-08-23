import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,normalize,sep} from 'node:path';
import {
  canonicalDigest,compareRunIds,IntegrityError,itemKey,mergeIdentified,parseJsonStrict,sha256Text,
  validatePatch,validatePublicUrls,validateStrictMaterialization
} from './integrity.mjs';

export const RUN_STORE_SCHEMA_VERSION='engineer-osint-run-store-v1';
export const RUN_OPERATION_VERSION='engineer-osint-operations-v1';

const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const fail=(message,details={})=>{throw new IntegrityError(message,details)};
const ensure=(condition,message,details={})=>{if(!condition)fail(message,details)};
const asArray=value=>Array.isArray(value)?value:[];
const hashPattern=/^[a-f0-9]{64}$/;
const assertKeys=(value,allowed,label)=>{
  for(const key of Object.keys(value))ensure(allowed.includes(key),`${label}.${key} is not allowed`);
};
const idRules={
  records:['id'],sources:['id'],relations:['relation_id','id'],evidence:['evidence_id','id'],
  visuals:['asset_id','id'],media:['media_id','id'],technology_signals:['id'],leads:['lead_id','id'],
  observed_minimum:['id'],lessons_learned:['id','lesson_id']
};

function safeStorePath(root,path,expectedPrefix){
  ensure(typeof path==='string'&&path.startsWith(`${expectedPrefix}/`),`Run-store path must start with ${expectedPrefix}/`,{path});
  ensure(!path.split('/').includes('..')&&!path.startsWith('/')&&!path.includes('\\'),'Unsafe run-store path',{path});
  const resolved=normalize(join(root,path));
  const base=normalize(root)+sep;
  ensure(resolved.startsWith(base),'Run-store path escapes its root',{path});
  const stat=lstatSync(resolved);
  ensure(stat.isFile()&&!stat.isSymbolicLink(),'Run-store target must be a regular non-symlink file',{path});
  return resolved;
}

function collection(data,name){
  data.dashboard_patch_extras=data.dashboard_patch_extras||{};
  if(name==='records'){data.records=data.records||{};return data.records.records=data.records.records||[]}
  if(name==='sources'){data.sources=data.sources||{};return data.sources.sources=data.sources.sources||[]}
  if(name==='relations'){data.relations=data.relations||{};return data.relations.relations=data.relations.relations||[]}
  if(name==='evidence'){data.evidence=data.evidence||{};return data.evidence.evidence=data.evidence.evidence||[]}
  if(name==='visuals'){data.visual_registry=data.visual_registry||{};return data.visual_registry.visuals=data.visual_registry.visuals||data.dashboard_patch_extras.visuals||[]}
  if(name==='media'){data.media_registry=data.media_registry||{};return data.media_registry.media=data.media_registry.media||data.dashboard_patch_extras.media||[]}
  if(name==='technology_signals')return data.dashboard_patch_extras.technology_signals=data.dashboard_patch_extras.technology_signals||[];
  if(name==='leads'){data.leads=data.leads||{};return data.leads.leads=data.leads.leads||[]}
  if(name==='observed_minimum')return data.dashboard_patch_extras.observed_minimum_updates=data.dashboard_patch_extras.observed_minimum_updates||[];
  if(name==='lessons_learned'){data.lessons_learned=data.lessons_learned||{};return data.lessons_learned.lessons=data.lessons_learned.lessons||[]}
  fail(`Unsupported canonical collection ${name}`);
}

function syncMirrors(data){
  const ex=data.dashboard_patch_extras=data.dashboard_patch_extras||{};
  ex.relations=structuredClone(collection(data,'relations'));
  ex.evidence=structuredClone(collection(data,'evidence'));
  ex.visuals=structuredClone(collection(data,'visuals'));
  ex.media=structuredClone(collection(data,'media'));
  ex.lessons_learned=structuredClone(collection(data,'lessons_learned'));
}

function mergeCollection(data,name,items,runId){
  const keys=idRules[name],base=collection(data,name);
  const normalized=items.map(item=>{
    const old=base.find(candidate=>itemKey(candidate,keys)===itemKey(item,keys))||{};
    const merged={...old,...item,last_update_run:runId};
    if(!merged.first_seen_run)merged.first_seen_run=runId;
    if(!merged.run_id)merged.run_id=runId;
    if(item.source_ids)merged.source_ids=[...new Set([...(old.source_ids||[]),...item.source_ids])];
    if(name==='records'){
      if(!merged.type){const match=String(merged.id||'').match(/^(ENG-(?:TECH|EVT|UNIT|SIG|DOC|TTP|LL|TREND|VIS|SRC|REL|EVID))-/);if(match)merged.type=match[1]}
      if(!merged.title&&merged.title_en)merged.title=merged.title_en;
      if(!merged.summary&&merged.summary_en)merged.summary=merged.summary_en;
      if(merged.summary&&!merged.analysis)merged.analysis=merged.summary;
      if(merged.summary&&!merged.fact)merged.fact=merged.summary;
    }
    if(name==='sources'){
      merged.name=merged.title||merged.name||merged.id;
      merged.tier=merged.source_tier??merged.tier;
      merged.url=merged.url||merged.source_url||null;
    }
    if(name==='relations')merged.id=merged.id||merged.relation_id;
    if(name==='evidence')merged.id=merged.id||merged.evidence_id;
    if(name==='leads'){
      merged.id=merged.id||merged.lead_id;
      merged.title=merged.topic||merged.title||merged.id;
    }
    return merged;
  });
  const merged=mergeIdentified(base,normalized,{
    keys,kind:`canonical ${name}`,legacyIdPrefix:name==='observed_minimum'?'ENG-OBS-LEGACY':null
  });
  base.splice(0,base.length,...merged);
}

export function validatePatchOperations(patch){
  const operations=patch?.extensions?.operations_v1;
  if(operations===undefined){
    ensure(patch?.state?.counts?.CORRECTION===0,'A post-snapshot correction requires extensions.operations_v1');
    return [];
  }
  ensure(Array.isArray(operations),'extensions.operations_v1 must be an array');
  const seen=new Set();
  for(const [index,operation] of operations.entries()){
    const at=`extensions.operations_v1[${index}]`;
    ensure(isObject(operation),`${at} must be an object`);
    const allowed=new Set(['operation_id','op','collection','target_id','field','value','reason','source_ids']);
    for(const key of Object.keys(operation))ensure(allowed.has(key),`${at}.${key} is not allowed`);
    ensure(/^ENG-OP-[A-Za-z0-9._-]+$/.test(operation.operation_id||''),`${at}.operation_id is invalid`);
    ensure(!seen.has(operation.operation_id),`Duplicate operation_id ${operation.operation_id}`);seen.add(operation.operation_id);
    ensure(['REPLACE_FIELD','REMOVE_REFERENCE','RETRACT'].includes(operation.op),`${at}.op is unsupported`);
    ensure(Object.hasOwn(idRules,operation.collection),`${at}.collection is unsupported`);
    ensure(typeof operation.target_id==='string'&&operation.target_id,`${at}.target_id is required`);
    ensure(typeof operation.reason==='string'&&operation.reason.trim().length>=12,`${at}.reason must be specific`);
    ensure(Array.isArray(operation.source_ids)&&operation.source_ids.length>0,`${at}.source_ids must contain supporting evidence`);
    ensure(operation.source_ids.every(id=>typeof id==='string'&&id),`${at}.source_ids contains an invalid ID`);
    ensure(new Set(operation.source_ids).size===operation.source_ids.length,`${at}.source_ids contains duplicates`);
    if(operation.op==='RETRACT'&&operation.collection==='sources')ensure(!operation.source_ids.includes(operation.target_id),`${at} cannot cite the source it retracts as its own evidence`);
    if(operation.op!=='RETRACT')ensure(/^[A-Za-z][A-Za-z0-9_]*$/.test(operation.field||''),`${at}.field must be a top-level field name`);
    if(operation.op==='REMOVE_REFERENCE')ensure(typeof operation.value==='string'&&operation.value,`${at}.value must identify the removed reference`);
    if(operation.op==='REPLACE_FIELD')ensure(Object.hasOwn(operation,'value'),`${at}.value is required`);
  }
  ensure(patch.state?.counts?.CORRECTION===operations.length,'Declared CORRECTION must match extensions.operations_v1.length',{
    declared:patch.state?.counts?.CORRECTION,actual:operations.length
  });
  return operations;
}

function applyOperations(data,patch){
  const operations=validatePatchOperations(patch),sourceIds=new Set(collection(data,'sources').map(item=>item.id));
  const protectedFields=new Set(['id','relation_id','evidence_id','asset_id','media_id','lead_id','lesson_id','first_seen_run']);
  const log=data.canonical_change_log=data.canonical_change_log||{operations:[]};
  const logged=new Set(log.operations.map(item=>item.operation_id));
  for(const operation of operations){
    ensure(!logged.has(operation.operation_id),`Operation ${operation.operation_id} was already applied`);
    for(const sourceId of operation.source_ids)ensure(sourceIds.has(sourceId),`Operation ${operation.operation_id} references missing source ${sourceId}`);
    const items=collection(data,operation.collection),keys=idRules[operation.collection];
    const index=items.findIndex(item=>itemKey(item,keys)===operation.target_id);
    ensure(index>=0,`Operation ${operation.operation_id} target ${operation.target_id} does not exist`);
    const target=items[index];
    if(operation.op==='REPLACE_FIELD'){
      ensure(!protectedFields.has(operation.field),`Operation ${operation.operation_id} cannot replace protected field ${operation.field}`);
      target[operation.field]=structuredClone(operation.value);
    }else if(operation.op==='REMOVE_REFERENCE'){
      ensure(!protectedFields.has(operation.field),`Operation ${operation.operation_id} cannot alter protected field ${operation.field}`);
      ensure(Array.isArray(target[operation.field]),`Operation ${operation.operation_id} target field is not an array`);
      ensure(target[operation.field].includes(operation.value),`Operation ${operation.operation_id} reference ${operation.value} is absent`);
      target[operation.field]=target[operation.field].filter(value=>value!==operation.value);
    }else if(operation.op==='RETRACT')items.splice(index,1);
    log.operations.push({...structuredClone(operation),run_id:patch.state.run_id,applied_at_window_to:patch.state.window_to});
    logged.add(operation.operation_id);
  }
}

function validateCanonicalReferences(data){
  const records=collection(data,'records'),sources=collection(data,'sources'),relations=collection(data,'relations'),evidence=collection(data,'evidence');
  const sourceIds=new Set(sources.map(item=>item.id));
  const knownIds=new Set([
    ...records,...sources,...relations,...evidence,...collection(data,'visuals'),...collection(data,'media'),
    ...collection(data,'technology_signals'),...collection(data,'leads'),
    ...collection(data,'observed_minimum'),...collection(data,'lessons_learned'),
    ...asArray(data.dashboard_patch_extras?.trends),...asArray(data.dashboard_patch_extras?.doctrine),
    ...asArray(data.dashboard_patch_extras?.orbat_updates)
  ].map(item=>itemKey(item,['id','lead_id','lesson_id','relation_id','evidence_id','asset_id','media_id'])).filter(Boolean));
  const sourceRefs=(item,label)=>{
    for(const id of asArray(item.source_ids))ensure(sourceIds.has(id),`${label} references missing source ${id}`);
    if(item.source_id)ensure(sourceIds.has(item.source_id),`${label} references missing source ${item.source_id}`);
  };
  for(const item of records)sourceRefs(item,`Record ${item.id}`);
  for(const [name,items] of [
    ['technology signal',collection(data,'technology_signals')],['lead',collection(data,'leads')],
    ['observed minimum',collection(data,'observed_minimum')],['lesson learned',collection(data,'lessons_learned')],
    ['trend',asArray(data.dashboard_patch_extras?.trends)],['doctrine',asArray(data.dashboard_patch_extras?.doctrine)],
    ['ORBAT update',asArray(data.dashboard_patch_extras?.orbat_updates)]
  ])for(const item of items)sourceRefs(item,`${name} ${itemKey(item,['id','lead_id','lesson_id'])||'UNKNOWN'}`);
  for(const item of relations){
    const id=item.relation_id||item.id;
    for(const field of ['subject_id','object_id'])if(item[field])ensure(knownIds.has(item[field]),`Relation ${id} references missing ${field} ${item[field]}`);
    sourceRefs(item,`Relation ${id}`);
  }
  for(const item of evidence){
    const id=item.evidence_id||item.id;
    for(const related of asArray(item.related_ids))ensure(knownIds.has(related),`Evidence ${id} references missing related ID ${related}`);
    for(const field of ['record_id','related_record_id','target_id'])if(item[field])ensure(knownIds.has(item[field]),`Evidence ${id} references missing ${field} ${item[field]}`);
    sourceRefs(item,`Evidence ${id}`);
  }
  for(const [name,idKeys] of [['visuals',['asset_id','id']],['media',['media_id','id']]])for(const item of collection(data,name)){
    const id=itemKey(item,idKeys);
    for(const related of [...asArray(item.related_ids),...asArray(item.related_record_ids)])ensure(knownIds.has(related),`${name} ${id} references missing related ID ${related}`);
    sourceRefs(item,`${name} ${id}`);
  }
  validatePublicUrls(data);
}

function validateCanonicalIdentity(data){
  for(const [name,keys] of Object.entries(idRules)){
    const seen=new Set();
    for(const [index,item] of collection(data,name).entries()){
      const id=itemKey(item,keys);
      ensure(Boolean(id),`Canonical ${name}[${index}] has no stable identifier`);
      ensure(!seen.has(id),`Canonical ${name} contains duplicate identifier ${id}`);
      seen.add(id);
    }
  }
}

function reconcileLegacyVisualMirror(data){
  const canonical=asArray(data.visual_registry?.visuals),legacy=asArray(data.dashboard_patch_extras?.visuals);
  if(!legacy.length)return;
  const byId=new Map(canonical.map(item=>[itemKey(item,idRules.visuals),item]));
  for(const item of legacy){
    const id=itemKey(item,idRules.visuals);
    ensure(Boolean(id),'Legacy visual mirror item has no stable identifier');
    const existing=byId.get(id);
    if(existing)ensure(canonicalDigest(existing)===canonicalDigest(item),`Legacy visual mirror conflict for ${id}`);
  }
  data.visual_registry=data.visual_registry||{};
  data.visual_registry.visuals=mergeIdentified(canonical,structuredClone(legacy),{keys:idRules.visuals,kind:'canonical visuals legacy mirror'});
}

export function applyStrictPatchToCanonicalData(input,patch){
  validatePatch(patch,{strict:true});
  const data=structuredClone(input),runId=patch.state.run_id;
  reconcileLegacyVisualMirror(data);
  const touched=new Map([
    ['records',[...patch.new_records,...patch.updated_records]],['sources',patch.sources],['relations',patch.relations],
    ['evidence',patch.evidence],['visuals',patch.visuals],['media',patch.media],['technology_signals',patch.technology_signals],
    ['leads',patch.lead_updates],['observed_minimum',patch.observed_minimum_updates],['lessons_learned',patch.lessons_learned]
  ].map(([name,items])=>[name,new Set(items.map(item=>itemKey(item,idRules[name])).filter(Boolean))]));
  for(const operation of validatePatchOperations(patch))ensure(!touched.get(operation.collection)?.has(operation.target_id),
    `Operation ${operation.operation_id} cannot target an item also changed by the same patch`);
  const before={
    recordIdsBefore:collection(data,'records').map(item=>item.id),sourceIdsBefore:collection(data,'sources').map(item=>item.id),
    relationIdsBefore:collection(data,'relations').map(item=>item.relation_id||item.id),evidenceIdsBefore:collection(data,'evidence').map(item=>item.evidence_id||item.id),
    visualIdsBefore:collection(data,'visuals').map(item=>item.asset_id||item.id),mediaIdsBefore:collection(data,'media').map(item=>item.media_id||item.id)
  };
  mergeCollection(data,'records',[...patch.new_records,...patch.updated_records],runId);
  mergeCollection(data,'sources',patch.sources,runId);
  mergeCollection(data,'relations',patch.relations,runId);
  mergeCollection(data,'evidence',patch.evidence,runId);
  mergeCollection(data,'visuals',patch.visuals,runId);
  mergeCollection(data,'media',patch.media,runId);
  mergeCollection(data,'technology_signals',patch.technology_signals,runId);
  mergeCollection(data,'leads',patch.lead_updates,runId);
  mergeCollection(data,'observed_minimum',patch.observed_minimum_updates,runId);
  mergeCollection(data,'lessons_learned',patch.lessons_learned,runId);
  applyOperations(data,patch);
  syncMirrors(data);
  const knownEntityIds=[
    ...collection(data,'technology_signals'),...collection(data,'leads'),
    ...collection(data,'observed_minimum'),...collection(data,'lessons_learned'),
    ...asArray(data.dashboard_patch_extras?.trends),...asArray(data.dashboard_patch_extras?.doctrine),
    ...asArray(data.dashboard_patch_extras?.orbat_updates)
  ].map(item=>itemKey(item,['id','lead_id','lesson_id'])).filter(Boolean);
  validateStrictMaterialization(patch,{
    ...before,records:collection(data,'records'),sources:collection(data,'sources'),relations:collection(data,'relations'),
    evidence:collection(data,'evidence'),visuals:collection(data,'visuals'),media:collection(data,'media'),knownEntityIds
  });
  validateCanonicalReferences(data);
  data.state_latest={...(data.state_latest||{}),...structuredClone(patch.state)};
  data.run_history=data.run_history||{runs:[]};data.run_history.runs=data.run_history.runs||[];
  ensure(!data.run_history.runs.some(item=>item.run_id===runId),`Run history already contains ${runId}`);
  data.run_history.runs.push({run_id:runId,parent:patch.state.parent_run_id,status:'SUCCESS',window:`${patch.state.window_from} → ${patch.state.window_to}`,counts:structuredClone(patch.state.counts)});
  const ex=data.dashboard_patch_extras=data.dashboard_patch_extras||{};
  ex.external_leads=mergeIdentified(asArray(ex.external_leads),structuredClone(patch.lead_updates),{
    keys:idRules.leads,kind:'canonical external leads'
  });
  ex.patch_history_runs=[...new Set([...asArray(ex.patch_history_runs),runId])];
  ex.updated_records=[...asArray(ex.updated_records),...structuredClone(patch.updated_records)];
  ex.run_metadata=[...asArray(ex.run_metadata),{run_id:runId,continuity:structuredClone(patch.continuity),true_delta:structuredClone(patch.true_delta),qa:structuredClone(patch.qa)}];
  data.dashboard_materialization=data.dashboard_materialization||{};
  data.dashboard_materialization.status='SUCCESS';
  data.dashboard_materialization.continuity='SNAPSHOT_CHAIN_COMPLETE';
  data.dashboard_materialization.current_run_id=runId;
  data.dashboard_materialization.patch_run_count=asArray(ex.patch_history_runs).length;
  data.dashboard_materialization.patch_run_ids=structuredClone(ex.patch_history_runs);
  return data;
}

export function loadCanonicalRunStore({root='docs/engineer-osint',manifestPath=join(root,'data/run-store-manifest.json')}={}){
  ensure(lstatSync(manifestPath).isFile()&&!lstatSync(manifestPath).isSymbolicLink(),'Run-store manifest must be a regular non-symlink file');
  const manifest=parseJsonStrict(readFileSync(manifestPath,'utf8'),{source:manifestPath});
  ensure(manifest.schema_version===RUN_STORE_SCHEMA_VERSION,`Unsupported run-store schema ${manifest.schema_version}`);
  ensure(isObject(manifest.snapshot)&&Array.isArray(manifest.runs),'Run-store manifest requires snapshot and runs');
  assertKeys(manifest,['schema_version','store_id','snapshot','runs','legacy_history','policy'],'manifest');
  assertKeys(manifest.snapshot,['run_id','path','file_sha256','canonical_sha256','source_main_sha','legacy_run_count','legacy_revision_count','record_count','source_count'],'manifest.snapshot');
  ensure(/^engineer-osint-[0-9]{8}-B[0-9]{2,}$/.test(manifest.snapshot.run_id||''),'Canonical snapshot run_id is invalid');
  ensure(manifest.snapshot.path===`data/snapshots/canonical-${manifest.snapshot.run_id}.json`,'Canonical snapshot path does not match run_id');
  ensure(hashPattern.test(manifest.snapshot.file_sha256||'')&&hashPattern.test(manifest.snapshot.canonical_sha256||''),'Canonical snapshot hashes are invalid');
  const snapshotPath=safeStorePath(root,manifest.snapshot.path,'data/snapshots');
  const snapshotRaw=readFileSync(snapshotPath,'utf8');
  ensure(sha256Text(snapshotRaw)===manifest.snapshot.file_sha256,'Canonical snapshot file hash mismatch');
  let data=parseJsonStrict(snapshotRaw,{source:snapshotPath,maxBytes:40*1024*1024});
  ensure(canonicalDigest(data)===manifest.snapshot.canonical_sha256,'Canonical snapshot semantic hash mismatch');
  ensure(data.state_latest?.run_id===manifest.snapshot.run_id,'Canonical snapshot run_id mismatch');
  ensure(collection(data,'records').length===manifest.snapshot.record_count,'Canonical snapshot record count mismatch');
  ensure(collection(data,'sources').length===manifest.snapshot.source_count,'Canonical snapshot source count mismatch');
  validateCanonicalIdentity(data);validateCanonicalReferences(data);
  let currentRunId=manifest.snapshot.run_id,currentHash=manifest.snapshot.canonical_sha256;
  const patches=[],seenRuns=new Set([currentRunId]),seenPaths=new Set();
  for(const [index,entry] of manifest.runs.entries()){
    ensure(isObject(entry),`Manifest runs[${index}] must be an object`);
    assertKeys(entry,['run_id','parent_run_id','parent_canonical_sha256','path','file_sha256','canonical_sha256'],`manifest.runs[${index}]`);
    ensure(typeof entry.run_id==='string'&&!seenRuns.has(entry.run_id),`Duplicate run-store run_id ${entry.run_id}`);
    ensure(entry.path===`data/runs/${entry.run_id}.json`,`Run-store path does not match run_id ${entry.run_id}`);
    ensure(entry.parent_run_id===currentRunId,`Run-store parent mismatch for ${entry.run_id}`,{expected:currentRunId,actual:entry.parent_run_id});
    ensure(compareRunIds(entry.run_id,currentRunId)>0,`Run-store run_id ${entry.run_id} is not newer than ${currentRunId}`);
    ensure(hashPattern.test(entry.file_sha256||'')&&hashPattern.test(entry.parent_canonical_sha256||'')&&hashPattern.test(entry.canonical_sha256||''),`Run-store hashes are invalid for ${entry.run_id}`);
    ensure(entry.parent_canonical_sha256===currentHash,`Run-store parent canonical hash mismatch for ${entry.run_id}`);
    const path=safeStorePath(root,entry.path,'data/runs');
    ensure(!seenPaths.has(path),`Duplicate run-store path ${entry.path}`);seenPaths.add(path);
    const raw=readFileSync(path,'utf8');
    ensure(sha256Text(raw)===entry.file_sha256,`Run patch file hash mismatch for ${entry.run_id}`);
    const patch=parseJsonStrict(raw,{source:path});validatePatch(patch,{strict:true});validatePatchOperations(patch);
    ensure(patch.state.run_id===entry.run_id,`Run patch identity mismatch for ${entry.run_id}`);
    ensure(patch.state.parent_run_id===entry.parent_run_id,`Run patch parent mismatch for ${entry.run_id}`);
    data=applyStrictPatchToCanonicalData(data,patch);
    currentHash=canonicalDigest(data);
    ensure(currentHash===entry.canonical_sha256,`Run canonical output hash mismatch for ${entry.run_id}`);
    currentRunId=entry.run_id;seenRuns.add(currentRunId);patches.push(patch);
  }
  const registered=new Set(manifest.runs.map(entry=>entry.path));
  const unregistered=readdirSync(join(root,'data/runs'),{withFileTypes:true})
    .filter(entry=>entry.isFile()&&entry.name.endsWith('.json'))
    .map(entry=>`data/runs/${entry.name}`).filter(path=>!registered.has(path));
  ensure(unregistered.length===0,'Unregistered JSON run files are forbidden',{unregistered});
  const legacy=manifest.legacy_history||{};
  const report={
    status:'SNAPSHOT_CHAIN_COMPLETE',run_count:(manifest.snapshot.legacy_run_count||1)+patches.length,
    revision_count:manifest.snapshot.legacy_revision_count||manifest.snapshot.legacy_run_count||1,
    append_only_run_count:patches.length,snapshot_run_id:manifest.snapshot.run_id,
    snapshot_file_sha256:manifest.snapshot.file_sha256,canonical_sha256:currentHash,current_run_id:currentRunId,
    legacy_status:legacy.status||'UNKNOWN',malformed_patch_shas:legacy.malformed_patch_shas||[],
    duplicate_run_ids:legacy.duplicate_run_ids||[],parent_discontinuities:legacy.parent_discontinuities||[],
    external_checkpoint_parent:legacy.external_checkpoint_parent||null,enforcement_cutoff:legacy.enforcement_cutoff||manifest.snapshot.run_id
  };
  return {data,manifest,patches,report};
}
