import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

export const PATCH_SCHEMA_VERSION='engineer-osint-patch-v1';
export const STRICT_REQUIRED_OBJECTS=['continuity','true_delta','qa'];
export const STRICT_REQUIRED_ARRAYS=['new_records','updated_records','sources','relations','evidence','visuals','media','technology_signals','lead_updates','observed_minimum_updates','lessons_learned'];
export const STRICT_OPTIONAL_FIELDS=['presentation_fact_overlay_gap','extensions'];
export const STRICT_REQUIRED_COUNTS=['CURRENT_DELTA','LATE_DISCOVERED_CURRENT','HISTORICAL_BACKFILL','ENTITY_ENRICHMENT','NEW','UPDATE','CONFIRMATION','CORRECTION','CONTRADICTION','LEAD','NEW_RELATIONS','UPDATED_RELATIONS','NEW_EVIDENCE','UPDATED_EVIDENCE','NEW_SOURCES','UPDATED_SOURCES','NEW_VISUALS','NEW_MEDIA'];

export class IntegrityError extends Error{
  constructor(message,details={}){
    super(message);
    this.name='IntegrityError';
    this.details=details;
  }
}

const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(isObject(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};

export function deterministicId(prefix,value){
  const digest=createHash('sha256').update(canonical(value)).digest('hex').slice(0,16).toUpperCase();
  return `${prefix}-${digest}`;
}

export function parseJsonStrict(text,{source='JSON',maxBytes=30*1024*1024,maxDepth=100}={}){
  assert(typeof text==='string',`${source}: JSON input must be text`);
  assert(Buffer.byteLength(text,'utf8')<=maxBytes,`${source}: JSON exceeds ${maxBytes} bytes`);
  let index=0;
  const fail=message=>{throw new IntegrityError(`${source}: ${message} at offset ${index}`)};
  const whitespace=()=>{while(/\s/.test(text[index]||''))index++};
  const string=()=>{
    if(text[index]!=='"')fail('expected string');
    const start=index++;
    while(index<text.length){
      if(text[index]==='\\'){index+=2;continue}
      if(text[index++]==='"'){
        try{return JSON.parse(text.slice(start,index))}catch{fail('invalid string')}
      }
    }
    fail('unterminated string');
  };
  const value=depth=>{
    if(depth>maxDepth)fail(`maximum depth ${maxDepth} exceeded`);
    whitespace();
    if(text[index]==='{'){
      index++;whitespace();const keys=new Set();
      if(text[index]==='}'){index++;return}
      while(index<text.length){
        whitespace();const key=string();
        if(keys.has(key))fail(`duplicate object key ${JSON.stringify(key)}`);
        keys.add(key);whitespace();if(text[index++]!==':')fail('expected colon');
        value(depth+1);whitespace();
        if(text[index]===','){index++;continue}
        if(text[index]==='}'){index++;return}
        fail('expected comma or closing brace');
      }
      fail('unterminated object');
    }
    if(text[index]==='['){
      index++;whitespace();if(text[index]===']'){index++;return}
      while(index<text.length){
        value(depth+1);whitespace();
        if(text[index]===','){index++;continue}
        if(text[index]===']'){index++;return}
        fail('expected comma or closing bracket');
      }
      fail('unterminated array');
    }
    if(text[index]==='"'){string();return}
    const start=index;
    while(index<text.length&&!/[\s,}\]]/.test(text[index]))index++;
    if(start===index)fail('expected value');
    try{JSON.parse(text.slice(start,index))}catch{fail('invalid primitive')}
  };
  whitespace();value(0);whitespace();if(index!==text.length)fail('unexpected trailing content');
  return JSON.parse(text);
}

export function safeInlineJson(value){
  return JSON.stringify(value)
    .replace(/&/g,'\\u0026')
    .replace(/</g,'\\u003c')
    .replace(/>/g,'\\u003e')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}

let patchSchemaCache;
function patchSchema(){
  if(!patchSchemaCache){
    const url=new URL('../schemas/patch-v1.schema.json',import.meta.url);
    patchSchemaCache=parseJsonStrict(readFileSync(url,'utf8'),{source:url.pathname});
  }
  return patchSchemaCache;
}

function validateSchemaNode(value,schema,root,path='$'){
  if(schema.$ref){
    const parts=schema.$ref.replace(/^#\//,'').split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'));
    const target=parts.reduce((item,key)=>item?.[key],root);
    assert(target,`Unresolved JSON Schema reference ${schema.$ref} at ${path}`);
    return validateSchemaNode(value,target,root,path);
  }
  if(schema.const!==undefined)assert(canonical(value)===canonical(schema.const),`${path} must equal ${JSON.stringify(schema.const)}`);
  if(schema.type==='object'){
    assert(isObject(value),`${path} must be an object`);
    for(const field of schema.required||[])assert(Object.prototype.hasOwnProperty.call(value,field),`${path}.${field} is required by patch schema`);
    for(const [field,item] of Object.entries(value)){
      if(schema.properties?.[field])validateSchemaNode(item,schema.properties[field],root,`${path}.${field}`);
      else if(schema.additionalProperties===false)throw new IntegrityError(`${path}.${field} is not allowed by patch schema`);
      else if(isObject(schema.additionalProperties))validateSchemaNode(item,schema.additionalProperties,root,`${path}.${field}`);
    }
  }else if(schema.type==='array'){
    assert(Array.isArray(value),`${path} must be an array`);
    if(schema.items)for(const [index,item] of value.entries())validateSchemaNode(item,schema.items,root,`${path}[${index}]`);
  }else if(schema.type==='string'){
    assert(typeof value==='string',`${path} must be a string`);
    if(schema.minLength!==undefined)assert(value.length>=schema.minLength,`${path} must have at least ${schema.minLength} characters`);
    if(schema.pattern)assert(new RegExp(schema.pattern).test(value),`${path} does not match the required pattern`);
  }else if(schema.type==='integer'){
    assert(Number.isSafeInteger(value),`${path} must be a safe integer`);
    if(schema.minimum!==undefined)assert(value>=schema.minimum,`${path} must be at least ${schema.minimum}`);
  }
}

export function validatePatchSchemaV1(patch){
  validateSchemaNode(patch,patchSchema(),patchSchema());
  return patch;
}

export function itemKey(item,keys){
  for(const key of keys)if(item?.[key])return String(item[key]);
  return null;
}

export function mergeIdentified(base,items,{keys,kind,legacyIdPrefix=null}){
  const merged=new Map();
  const insert=(item,source)=>{
    if(!isObject(item)){
      if(legacyIdPrefix&&typeof item==='string'&&item)return merged.set(item,{id:item,id_provenance:'LEGACY_REFERENCE_ONLY'});
      throw new IntegrityError(`${kind}: non-object item in ${source}`);
    }
    let key=itemKey(item,keys);
    let normalized=item;
    if(!key&&legacyIdPrefix){
      key=deterministicId(legacyIdPrefix,item);
      normalized={...item,id:key,id_provenance:'DETERMINISTIC_LEGACY'};
    }
    if(!key)throw new IntegrityError(`${kind}: item has no supported identifier (${keys.join(', ')})`,{item});
    if(!normalized.id&&keys.includes('id'))normalized={...normalized,id:key};
    merged.set(key,{...(merged.get(key)||{}),...normalized});
  };
  for(const item of base||[])insert(item,'base');
  for(const item of items||[])insert(item,'patch');
  return [...merged.values()];
}

const collectionRules={
  materialized_records:['id'],new_records:['id'],updated_records:['id'],sources:['id'],
  relations:['relation_id','id'],new_relations:['relation_id','id'],updated_relations:['relation_id','id'],
  evidence:['evidence_id','id'],new_evidence:['evidence_id','id'],updated_evidence:['evidence_id','id'],
  lessons_learned:['id','lesson_id'],lessons_learned_changes:['id','lesson_id'],
  external_leads:['lead_id','id','external_id'],updated_external_leads:['lead_id','id','external_id'],
  lead_updates:['lead_id','id'],observed_minimum_updates:['id'],
  visuals:['asset_id','id'],new_visuals:['asset_id','id'],media:['media_id','id'],new_media:['media_id','id'],
  technology_signals:['id']
};
const strictPrimaryIds={
  new_records:'id',updated_records:'id',sources:'id',relations:'relation_id',evidence:'evidence_id',
  visuals:'asset_id',media:'media_id',technology_signals:'id',lead_updates:'lead_id',
  observed_minimum_updates:'id',lessons_learned:'id'
};

function assert(condition,message,details={}){
  if(!condition)throw new IntegrityError(message,details);
}

function validateUrls(value,path='$',{requireAbsolute=false}={}){
  if(Array.isArray(value))return value.forEach((item,index)=>validateUrls(item,`${path}[${index}]`,{requireAbsolute}));
  if(!isObject(value))return;
  for(const [key,item] of Object.entries(value)){
    const child=`${path}.${key}`;
    if(typeof item==='string'&&/(?:^|_)(?:url|uri)$/.test(key)&&item){
      let parsed;
      try{parsed=new URL(item)}catch{
        const schemeLike=/^[a-z][a-z0-9+.-]*:/i.test(item)||item.startsWith('//');
        assert(!requireAbsolute&&!schemeLike,`Unsafe or invalid URL at ${child}`,{value:item});
        continue;
      }
      assert(['http:','https:'].includes(parsed.protocol),`Disallowed URL protocol at ${child}`,{protocol:parsed.protocol});
      assert(!parsed.username&&!parsed.password,`Credentials are forbidden in public URL at ${child}`);
    }
    validateUrls(item,child,{requireAbsolute});
  }
}

export function validatePatch(patch,{strict=false}={}){
  assert(isObject(patch),'Patch must be a JSON object');
  assert(isObject(patch.state),'Patch.state must be an object');
  const state=patch.state;
  assert(/^engineer-osint-\d{8}-B\d{2,}$/.test(state.run_id||''),'Invalid state.run_id',{run_id:state.run_id});
  assert(state.status==='SUCCESS','Only SUCCESS patches may be published',{status:state.status});
  assert(typeof state.parent_run_id==='string'&&state.parent_run_id,'state.parent_run_id is required');
  assert(state.parent_run_id!==state.run_id,'state.parent_run_id must not equal state.run_id');
  const rfc3339=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  for(const field of ['window_from','window_to'])assert(rfc3339.test(state[field]||'')&&Number.isFinite(Date.parse(state[field])),`Invalid RFC 3339 state.${field}`,{value:state[field]});
  assert(Date.parse(state.window_from)<Date.parse(state.window_to),'state window must be a non-empty [from,to) interval');
  assert(isObject(state.counts),'state.counts must be an object');
  for(const [name,count] of Object.entries(state.counts))assert(Number.isSafeInteger(count)&&count>=0,`Invalid non-negative safe integer count ${name}`,{count});
  if(strict){
    validatePatchSchemaV1(patch);
    assert(patch.schema_version===PATCH_SCHEMA_VERSION,`New patches must declare schema_version=${PATCH_SCHEMA_VERSION}`,{schema_version:patch.schema_version});
    for(const field of STRICT_REQUIRED_OBJECTS)assert(isObject(patch[field]),`Strict patch requires object ${field}`);
    for(const field of STRICT_REQUIRED_ARRAYS)assert(Array.isArray(patch[field]),`Strict patch requires array ${field}`);
    const allowed=new Set(['schema_version','state',...STRICT_REQUIRED_OBJECTS,...STRICT_REQUIRED_ARRAYS,...STRICT_OPTIONAL_FIELDS]);
    for(const field of Object.keys(patch))assert(allowed.has(field),`Unknown strict top-level field ${field}; use extensions for versioned additions`);
    for(const name of STRICT_REQUIRED_COUNTS)assert(Number.isSafeInteger(state.counts[name])&&state.counts[name]>=0,`Strict patch requires non-negative count ${name}`);
    const directPairs=[['NEW','new_records'],['UPDATE','updated_records'],['NEW_VISUALS','visuals'],['NEW_MEDIA','media'],['LEAD','lead_updates']];
    for(const [countName,field] of directPairs)assert(state.counts[countName]===patch[field].length,`Declared ${countName} does not match ${field}.length`,{declared:state.counts[countName],actual:patch[field].length});
    const newIds=new Set(patch.new_records.map(item=>item.id));
    for(const item of patch.updated_records)assert(!newIds.has(item.id),`Record ${item.id} appears in both new_records and updated_records`);
  }
  if(patch.schema_version!==undefined)assert(patch.schema_version===PATCH_SCHEMA_VERSION,'Unsupported patch schema_version',{schema_version:patch.schema_version});

  for(const [field,keys] of Object.entries(collectionRules)){
    if(patch[field]===undefined)continue;
    if(patch[field]===null){assert(!strict,`${field} must not be null in a strict patch`);continue;}
    const items=Array.isArray(patch[field])?patch[field]:field==='media'&&Array.isArray(patch[field]?.new_media)?patch[field].new_media:null;
    assert(items!==null,`${field} must be an array`);
    const seenIds=new Set();
    for(const [index,item] of items.entries()){
      if(!isObject(item)){
        assert(!strict,`${field}[${index}] must be an object`);
        continue;
      }
      if(strict){
        const primary=strictPrimaryIds[field];
        assert(primary?item?.[primary]:itemKey(item,keys),`${field}[${index}] has no required identifier${primary?` ${primary}`:` (${keys.join(', ')})`}`);
        const id=primary?String(item[primary]):itemKey(item,keys);
        assert(!seenIds.has(id),`${field} contains duplicate identifier ${id}`);
        seenIds.add(id);
      }
    }
  }
  validateUrls(patch,'$',{requireAbsolute:strict});
  return patch;
}

export function validatePublicUrls(value){
  validateUrls(value);
  return value;
}

export function validateStrictMaterialization(patch,{
  recordIdsBefore=[],sourceIdsBefore=[],relationIdsBefore=[],evidenceIdsBefore=[],visualIdsBefore=[],mediaIdsBefore=[],
  records=[],sources=[],relations=[],evidence=[],visuals=[],media=[],knownEntityIds=[]
}={}){
  if(patch?.schema_version!==PATCH_SCHEMA_VERSION)return;
  const before=new Set(recordIdsBefore);
  for(const item of patch.new_records)assert(!before.has(item.id),`Strict new record ${item.id} already exists before the current patch`);
  for(const item of patch.updated_records)assert(before.has(item.id),`Strict updated record ${item.id} does not exist before the current patch`);

  const assertDeltaCounts=(items,beforeIds,idFor,newCount,updatedCount,kind)=>{
    const prior=new Set(beforeIds),seen=new Set();let added=0,updated=0;
    for(const item of items){
      const id=idFor(item);assert(id,`Strict ${kind} item has no identifier`);
      assert(!seen.has(id),`Strict ${kind} contains duplicate identifier ${id}`);seen.add(id);
      if(prior.has(id))updated++;else added++;
    }
    assert(patch.state.counts[newCount]===added,`Declared ${newCount} does not match new ${kind} items`,{declared:patch.state.counts[newCount],actual:added});
    if(updatedCount)assert(patch.state.counts[updatedCount]===updated,`Declared ${updatedCount} does not match updated ${kind} items`,{declared:patch.state.counts[updatedCount],actual:updated});
    else assert(updated===0,`Strict ${kind} updates are not supported by patch v1`,{updated});
  };
  assertDeltaCounts(patch.sources,sourceIdsBefore,item=>item.id,'NEW_SOURCES','UPDATED_SOURCES','sources');
  assertDeltaCounts(patch.relations,relationIdsBefore,item=>item.relation_id,'NEW_RELATIONS','UPDATED_RELATIONS','relations');
  assertDeltaCounts(patch.evidence,evidenceIdsBefore,item=>item.evidence_id,'NEW_EVIDENCE','UPDATED_EVIDENCE','evidence');
  assertDeltaCounts(patch.visuals,visualIdsBefore,item=>item.asset_id,'NEW_VISUALS',null,'visuals');
  assertDeltaCounts(patch.media,mediaIdsBefore,item=>item.media_id,'NEW_MEDIA',null,'media');

  const recordIds=new Set(records.map(item=>item?.id).filter(Boolean));
  const sourceIds=new Set(sources.map(item=>item?.id).filter(Boolean));
  const relationIds=new Set(relations.map(item=>item?.relation_id||item?.id).filter(Boolean));
  const evidenceIds=new Set(evidence.map(item=>item?.evidence_id||item?.id).filter(Boolean));
  const knownIds=new Set([...recordIds,...knownEntityIds]);
  const currentRecords=[...patch.new_records,...patch.updated_records];
  const validateSourceRefs=(item,id)=>{
    for(const sourceId of item.source_ids||[])assert(sourceIds.has(sourceId),`Strict ${id} references missing source ${sourceId}`);
    if(item.source_id)assert(sourceIds.has(item.source_id),`Strict ${id} references missing source ${item.source_id}`);
  };
  for(const item of currentRecords)validateSourceRefs(item,`record ${item.id}`);
  for(const item of patch.relations){
    for(const field of ['subject_id','object_id'])if(item[field])assert(knownIds.has(item[field]),`Strict relation ${item.relation_id} references missing ${field} ${item[field]}`);
    validateSourceRefs(item,`relation ${item.relation_id}`);
  }
  for(const item of patch.evidence){
    for(const id of item.related_ids||[])assert(knownIds.has(id),`Strict evidence ${item.evidence_id} references missing related ID ${id}`);
    for(const field of ['record_id','related_record_id','target_id'])if(item[field])assert(knownIds.has(item[field]),`Strict evidence ${item.evidence_id} references missing ${field} ${item[field]}`);
    validateSourceRefs(item,`evidence ${item.evidence_id}`);
  }
  for(const item of [...patch.visuals,...patch.media]){
    const id=item.asset_id||item.media_id;
    for(const related of item.related_ids||[])assert(knownIds.has(related),`Strict media ${id} references missing related ID ${related}`);
    for(const related of item.related_record_ids||[])assert(knownIds.has(related),`Strict media ${id} references missing related record ${related}`);
    validateSourceRefs(item,`media ${id}`);
  }
  validatePublicUrls({records:currentRecords,relations:patch.relations,evidence:patch.evidence,visuals:patch.visuals,media:patch.media});
}

function readManifest(path){
  const manifest=parseJsonStrict(readFileSync(path,'utf8'),{source:path});
  assert(manifest.version===1,'Unsupported history integrity manifest version');
  return manifest;
}

const sha256=text=>createHash('sha256').update(text).digest('hex');

export function compareRunIds(leftId,rightId){
  const parse=id=>{const match=String(id).match(/^engineer-osint-(\d{8})-B(\d+)$/);assert(match,`Invalid comparable run ID ${id}`);return {date:Number(match[1]),batch:Number(match[2])}};
  const left=parse(leftId),right=parse(rightId);
  return left.date-right.date||left.batch-right.batch;
}

export function loadValidatedPatchHistory({patchPath,manifestPath,cwd=process.cwd(),currentRawOverride=null}){
  const manifest=readManifest(manifestPath);
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{cwd,encoding:'utf8'}).trim();
  assert(shallow==='false','Full Git history is required; shallow patch replay is forbidden');
  const shas=execFileSync('git',['log','--format=%H','--',patchPath],{cwd,encoding:'utf8'}).trim().split(/\s+/).filter(Boolean).reverse();
  assert(shas.length>0,'Patch history is empty');
  const cutoffIndex=shas.indexOf(manifest.enforcement.cutoff_commit_sha);
  assert(cutoffIndex>=0,'Schema enforcement cutoff commit is absent from patch history',{cutoff_commit_sha:manifest.enforcement.cutoff_commit_sha});
  const allowedMalformed=new Map(manifest.legacy.malformed_patches.map(x=>[x.commit_sha,x.content_sha256]));
  const allowedDuplicates=new Map(manifest.legacy.duplicate_runs.map(x=>[x.run_id,new Set(x.allowed_commit_shas)]));
  const allowedEdges=new Map(manifest.legacy.parent_discontinuities.map(x=>[`${x.previous_run_id}|${x.run_id}|${x.parent_run_id}`,x.commit_sha]));
  const byRun=new Map();
  const malformed=[];
  const duplicates=[];

  for(const [revisionIndex,sha] of shas.entries()){
    let patch;
    let raw;
    try{
      raw=execFileSync('git',['show',`${sha}:${patchPath}`],{cwd,encoding:'utf8',maxBuffer:30*1024*1024});
      patch=parseJsonStrict(raw,{source:`${sha}:${patchPath}`});
    }
    catch(error){
      assert(raw!==undefined&&allowedMalformed.get(sha)===sha256(raw),`Unacknowledged malformed historical patch ${sha}`,{error:error.message});
      malformed.push(sha);
      continue;
    }
    const runId=patch?.state?.run_id;
    assert(runId,`Historical patch ${sha} has no state.run_id`);
    const strict=revisionIndex>cutoffIndex;
    if(sha===manifest.enforcement.cutoff_commit_sha){
      assert(runId===manifest.enforcement.schema_required_after_run_id,'Schema cutoff commit has unexpected run ID',{runId,sha});
      assert(sha256(raw)===manifest.enforcement.cutoff_content_sha256,'Legacy cutoff patch content changed without schema migration',{runId,sha});
    }
    validatePatch(patch,{strict});
    if(byRun.has(runId)){
      const allowed=allowedDuplicates.get(runId);
      assert(allowed?.has(byRun.get(runId).sha)&&allowed.has(sha),`Unacknowledged duplicate run_id ${runId}`,{sha,previous_sha:byRun.get(runId).sha});
      duplicates.push(runId);
    }
    byRun.set(runId,{patch,sha,content_sha256:sha256(raw),strict});
  }

  const currentRaw=currentRawOverride??readFileSync(patchPath,'utf8');
  const current=parseJsonStrict(currentRaw,{source:patchPath});
  const currentRun=current?.state?.run_id;
  assert(currentRun,'Current patch has no state.run_id');
  const currentHash=sha256(currentRaw);
  const currentIsExactCutoff=currentRun===manifest.enforcement.schema_required_after_run_id&&currentHash===manifest.enforcement.cutoff_content_sha256;
  const currentStrict=!currentIsExactCutoff;
  validatePatch(current,{strict:currentStrict});
  if(!byRun.has(currentRun))byRun.set(currentRun,{patch:current,sha:'WORKTREE',content_sha256:currentHash,strict:currentStrict});
  else{
    const committed=byRun.get(currentRun);
    assert(committed.content_sha256===currentHash,`Published run_id ${currentRun} cannot be rewritten with different content`,{committed_sha:committed.sha});
    byRun.set(currentRun,{...committed,patch:current});
  }

  const entries=[...byRun.values()];
  assert(entries.length>0,'No valid patches found');
  const first=entries[0].patch.state;
  assert(first.run_id===manifest.legacy.first_run_id,'Unexpected first replay run',{actual:first.run_id});
  assert(first.parent_run_id===manifest.legacy.external_checkpoint_parent,'Unexpected external checkpoint parent',{actual:first.parent_run_id});
  const cutoffEntry=byRun.get(manifest.enforcement.schema_required_after_run_id);
  assert(cutoffEntry?.sha===manifest.enforcement.cutoff_commit_sha,'Legacy cutoff commit changed',{actual:cutoffEntry?.sha});
  const discontinuities=[];
  for(let index=1;index<entries.length;index++){
    const previous=entries[index-1].patch.state.run_id;
    const state=entries[index].patch.state;
    if(entries[index].strict)assert(compareRunIds(state.run_id,previous)>0,`Strict run_id ${state.run_id} is not newer than ${previous}`);
    if(state.parent_run_id===previous)continue;
    const edge=`${previous}|${state.run_id}|${state.parent_run_id}`;
    assert(allowedEdges.get(edge)===entries[index].sha,`Unacknowledged parent-chain discontinuity for ${state.run_id}`,{previous,parent:state.parent_run_id,sha:entries[index].sha});
    discontinuities.push({previous_run_id:previous,run_id:state.run_id,parent_run_id:state.parent_run_id});
  }
  const latest=entries.at(-1).patch.state.run_id;
  assert(latest===currentRun,'Current patch is not the latest replay run',{latest,currentRun});
  const acknowledgedIssues=malformed.length+duplicates.length+discontinuities.length+1;
  return {
    patches:entries.map(entry=>entry.patch),
    report:{
      status:acknowledgedIssues?'DEGRADED_LEGACY_ACKNOWLEDGED':'COMPLETE',
      run_count:entries.length,
      revision_count:shas.length,
      malformed_patch_shas:malformed,
      duplicate_run_ids:[...new Set(duplicates)],
      parent_discontinuities:discontinuities,
      external_checkpoint_parent:manifest.legacy.external_checkpoint_parent,
      enforcement_cutoff:manifest.enforcement.schema_required_after_run_id
    }
  };
}

export function deepDiff(before,after,{allowedPath}={}){
  const changes=[];
  const visit=(a,b,path)=>{
    if(canonical(a)===canonical(b))return;
    if(allowedPath?.(path,a,b))return;
    if(Array.isArray(a)&&Array.isArray(b)){
      for(let index=0;index<Math.max(a.length,b.length);index++)visit(a[index],b[index],`${path}[${index}]`);
      return;
    }
    if(isObject(a)&&isObject(b)){
      for(const key of new Set([...Object.keys(a),...Object.keys(b)]))visit(a[key],b[key],path?`${path}.${key}`:key);
      return;
    }
    changes.push({path,before:a,after:b});
  };
  visit(before,after,'');
  return changes;
}

const pathTokens=path=>{
  const tokens=[];
  for(const match of path.matchAll(/(?:^|\.)([^.\[]+)|\[(\d+)\]/g))tokens.push(match[1]??Number(match[2]));
  return tokens;
};
const valueAt=(root,tokens)=>tokens.reduce((value,key)=>value?.[key],root);

export function translationMutationViolations(before,after,{intrinsicPath=()=>false}={}){
  const violations=[];
  for(const change of deepDiff(before,after)){
    if(intrinsicPath(change.path))continue;
    const tokens=pathTokens(change.path);
    let justified=false;
    for(let index=0;index<tokens.length;index++){
      const parent=valueAt(after,tokens.slice(0,index));
      const key=tokens[index];
      const beforeValue=valueAt(before,tokens.slice(0,index+1));
      if(parent?.__i18n_public_orig&&Object.prototype.hasOwnProperty.call(parent.__i18n_public_orig,key)&&canonical(parent.__i18n_public_orig[key])===canonical(beforeValue)){
        justified=true;break;
      }
      if(key==='text'&&Object.prototype.hasOwnProperty.call(parent||{},'__i18n_public_orig_text')&&canonical(parent.__i18n_public_orig_text)===canonical(beforeValue)){
        justified=true;break;
      }
    }
    if(!justified)violations.push(change);
  }
  return violations;
}

export function mutationFingerprint(changes){
  return createHash('sha256').update(canonical(changes)).digest('hex');
}
