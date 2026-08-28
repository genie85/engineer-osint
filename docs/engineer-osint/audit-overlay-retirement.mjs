import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,mutationFingerprint,parseJsonStrict,validatePublicUrls} from './lib/integrity.mjs';
import {loadCanonicalRunStore} from './lib/run-store.mjs';
import {LEGACY_FACTUAL_OVERLAY_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const html=readFileSync(join(dist,'index.html'),'utf8');
const marker='window.__ENGINEER_DATA__=',a=html.indexOf(marker),b=html.indexOf(';</script>',a);
if(a<0||b<0)throw new Error('OVERLAY_RETIREMENT_AUDIT: ENGINEER_DATA marker missing');
const canonical=parseJsonStrict(html.slice(a+marker.length,b),{source:'built canonical ENGINEER_DATA'});
validatePublicUrls(canonical);
const history=loadCanonicalRunStore({root:src}).report;
const baseline=parseJsonStrict(readFileSync(join(src,'legacy-runtime-overlay-baseline.json'),'utf8'),{source:'legacy overlay baseline'});
const resolved=structuredClone(canonical),context={window:{__ENGINEER_DATA__:resolved},console};
const objectAt=(root,top,collection,index)=>root?.[top]?.[collection]?.[index];
const itemId=item=>item?.id||item?.source_id||item?.lead_id||item?.asset_id||item?.media_id||item?.evidence_id||item?.relation_id||item?.lesson_id;
const valueEnvelope=value=>value===undefined?{present:false}:{present:true,value:structuredClone(value)};
const sourceHints=item=>[...new Set([
  ...(Array.isArray(item?.source_ids)?item.source_ids:[]),
  ...(typeof item?.source_id==='string'&&item.source_id?[item.source_id]:[])
].filter(value=>typeof value==='string'&&value))].sort();
const logicalCollectionByRaw={
  materialized_records:'records',records:'records',new_records:'records',updated_records:'records',
  sources:'sources',
  relations:'relations',new_relations:'relations',updated_relations:'relations',
  evidence:'evidence',new_evidence:'evidence',updated_evidence:'evidence',
  visuals:'visuals',new_visuals:'visuals',
  media:'media',new_media:'media',
  technology_signals:'technology_signals',
  external_leads:'leads',updated_external_leads:'leads',lead_updates:'leads',leads:'leads',
  observed_minimum:'observed_minimum',observed_minimum_updates:'observed_minimum',
  lessons:'lessons_learned',lessons_learned:'lessons_learned',lessons_learned_changes:'lessons_learned'
};
const operationCollections=new Set(['records','sources','relations','evidence','visuals','media','technology_signals','leads','observed_minimum','lessons_learned']);
const protectedFields=new Set(['id','relation_id','evidence_id','asset_id','media_id','lead_id','lesson_id','assessment_id','gap_id','contradiction_id','first_seen_run']);
const modules=[],leafChanges=[],candidateMap=new Map();

const candidateFor=(entry,beforeItem,afterItem)=>{
  if(entry.kind==='OVERLAY_META')return null;
  const logical=entry.logical_collection;
  if(entry.kind==='ADD_ITEM')return {
    key:`${entry.module}|${logical||entry.raw_collection}|${entry.target_id}|ADD_ITEM`,
    module:entry.module,logical_collection:logical,raw_collection:entry.raw_collection,target_id:entry.target_id,
    action:'APPEND_ITEM',route:logical?'STRICT_COLLECTION_APPEND':'MANUAL_COLLECTION_ROUTE_REVIEW',
    leaf_paths:[entry.path],payload:valueEnvelope(afterItem),source_id_hints:sourceHints(afterItem),
    provenance_status:'VERIFY_SOURCE_PROVENANCE_BEFORE_APPEND'
  };
  if(entry.kind==='REMOVE_ITEM')return {
    key:`${entry.module}|${logical||entry.raw_collection}|${entry.target_id}|REMOVE_ITEM`,
    module:entry.module,logical_collection:logical,raw_collection:entry.raw_collection,target_id:entry.target_id,
    action:'RETRACT_ITEM',route:logical&&operationCollections.has(logical)?'OPERATIONS_V1_RETRACT':'MANUAL_COLLECTION_ROUTE_REVIEW',
    leaf_paths:[entry.path],payload:{present:false},source_id_hints:sourceHints(beforeItem),
    provenance_status:sourceHints(beforeItem).length?'VERIFY_SOURCE_HINTS':'SOURCE_BINDING_REQUIRED'
  };
  if(entry.kind==='REPLACE_ITEM')return {
    key:`${entry.module}|${logical||entry.raw_collection}|${entry.target_id}|REPLACE_ITEM`,
    module:entry.module,logical_collection:logical,raw_collection:entry.raw_collection,target_id:entry.target_id,
    action:'REPLACE_ITEM',route:'MANUAL_WHOLE_ITEM_REVIEW',leaf_paths:[entry.path],
    before_value:valueEnvelope(beforeItem),after_value:valueEnvelope(afterItem),source_id_hints:sourceHints(afterItem),
    provenance_status:'MANUAL_REVIEW_REQUIRED'
  };
  const field=entry.top_level_field;
  const beforeField=field?beforeItem?.[field]:undefined,afterField=field?afterItem?.[field]:undefined;
  let route='MANUAL_FIELD_ROUTE_REVIEW';
  if(logical&&operationCollections.has(logical)&&field){
    if(protectedFields.has(field))route='PROTECTED_FIELD_MANUAL_MIGRATION_REVIEW';
    else if(afterField===undefined)route='FIELD_REMOVAL_MANUAL_MIGRATION_REVIEW';
    else route='OPERATIONS_V1_REPLACE_FIELD';
  }
  const hints=sourceHints(afterItem);
  return {
    key:`${entry.module}|${logical||entry.raw_collection}|${entry.target_id}|FIELD|${field||'UNKNOWN'}`,
    module:entry.module,logical_collection:logical,raw_collection:entry.raw_collection,target_id:entry.target_id,
    action:'REPLACE_TOP_LEVEL_FIELD',field,route,leaf_paths:[entry.path],
    before_value:valueEnvelope(beforeField),after_value:valueEnvelope(afterField),source_id_hints:hints,
    provenance_status:route==='OPERATIONS_V1_REPLACE_FIELD'?(hints.length?'VERIFY_SOURCE_HINTS':'SOURCE_BINDING_REQUIRED'):'MANUAL_REVIEW_REQUIRED'
  };
};

for(const [,file] of LEGACY_FACTUAL_OVERLAY_MODULES){
  const expected=baseline.modules[file];
  if(!expected)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} has no pinned baseline`);
  const code=readFileSync(join(src,file),'utf8');
  const fileHash=createHash('sha256').update(code).digest('hex');
  if(fileHash!==expected.file_sha256)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} changed without migration review`);

  const before=structuredClone(resolved);
  vm.runInNewContext(code,context,{filename:file,timeout:3000});
  const changes=deepDiff(before,resolved),changedIds=new Set(),unscoped=[];
  for(const change of changes){
    const match=change.path.match(/^([^.]+)\.([^[]+)\[(\d+)\](?:\.(.+))?$/);
    if(!match){
      if(change.path==='rich_backfill_meta'||change.path.startsWith('rich_backfill_meta.')){
        leafChanges.push({
          module:file,path:change.path,kind:'OVERLAY_META',logical_collection:null,raw_collection:null,target_id:null,
          relative_path:change.path,top_level_field:null,before_value:valueEnvelope(change.before),after_value:valueEnvelope(change.after),
          migration_route:'NO_CANONICAL_MIGRATION_OVERLAY_META'
        });
        continue;
      }
      unscoped.push(change.path);continue;
    }
    const top=match[1],rawCollection=match[2],index=Number(match[3]),relativePath=match[4]||'';
    const beforeItem=objectAt(before,top,rawCollection,index),afterItem=objectAt(resolved,top,rawCollection,index);
    const id=itemId(afterItem)||itemId(beforeItem);
    if(!id){unscoped.push(change.path);continue;}
    changedIds.add(id);
    const logicalCollection=logicalCollectionByRaw[rawCollection]||null;
    const topField=relativePath.match(/^([^.[]+)/)?.[1]||null;
    let kind='FIELD_REPLACEMENT';
    if(!relativePath&&beforeItem===undefined&&afterItem!==undefined)kind='ADD_ITEM';
    else if(!relativePath&&beforeItem!==undefined&&afterItem===undefined)kind='REMOVE_ITEM';
    else if(!relativePath)kind='REPLACE_ITEM';
    else if(change.before===undefined)kind='FIELD_ADDITION';
    else if(change.after===undefined)kind='FIELD_REMOVAL';
    const entry={
      module:file,path:change.path,kind,top_container:top,raw_collection:rawCollection,logical_collection:logicalCollection,
      target_id:id,relative_path:relativePath,top_level_field:topField,
      before_value:valueEnvelope(change.before),after_value:valueEnvelope(change.after)
    };
    const candidate=candidateFor(entry,beforeItem,afterItem);
    entry.migration_route=candidate?.route||'MANUAL_REVIEW_REQUIRED';
    leafChanges.push(entry);
    if(candidate){
      const existing=candidateMap.get(candidate.key);
      if(existing)existing.leaf_paths=[...new Set([...existing.leaf_paths,...candidate.leaf_paths])].sort();
      else candidateMap.set(candidate.key,candidate);
    }
  }
  const unexpected=[...changedIds].filter(id=>!expected.allowed_target_ids.includes(id));
  if(unexpected.length||unscoped.length)throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} escaped pinned targets: ${[...unexpected,...unscoped.slice(0,10)].join(', ')}`);
  const exactPinnedBaseline=canonical.state_latest?.run_id===baseline.baseline_run_id;
  if(exactPinnedBaseline&&(changes.length!==expected.mutation_count||mutationFingerprint(changes)!==expected.mutation_fingerprint))throw new Error(`OVERLAY_RETIREMENT_AUDIT: ${file} no longer matches pinned baseline`);

  modules.push({
    file,
    file_sha256:fileHash,
    mutation_count:changes.length,
    changed_ids:[...changedIds].sort(),
    retirement_status:changes.length===0?'READY_FOR_RETIREMENT_REVIEW':'ACTIVE_MUTATION_DEBT'
  });
}
validatePublicUrls(resolved);

const candidates=[...candidateMap.values()].sort((x,y)=>x.module.localeCompare(y.module)||String(x.logical_collection).localeCompare(String(y.logical_collection))||String(x.target_id).localeCompare(String(y.target_id))||String(x.field||x.action).localeCompare(String(y.field||y.action)));
for(const item of candidates)delete item.key;
for(const module of modules){
  const moduleCandidates=candidates.filter(item=>item.module===module.file);
  module.migration_candidate_count=moduleCandidates.length;
  module.operation_replace_candidates=moduleCandidates.filter(item=>item.route==='OPERATIONS_V1_REPLACE_FIELD').length;
  module.strict_append_candidates=moduleCandidates.filter(item=>item.route==='STRICT_COLLECTION_APPEND').length;
  module.manual_review_candidates=moduleCandidates.filter(item=>item.route.includes('MANUAL')||item.route.includes('REVIEW')).length;
}
const ready=modules.filter(x=>x.retirement_status==='READY_FOR_RETIREMENT_REVIEW').length;
const blocked=modules.length-ready;
const mutations=modules.reduce((n,x)=>n+x.mutation_count,0);
const metaMutations=leafChanges.filter(item=>item.kind==='OVERLAY_META').length;
const canonicalLeafMutations=leafChanges.length-metaMutations;
if(leafChanges.length!==mutations)throw new Error(`OVERLAY_MIGRATION_MAP: leaf change count ${leafChanges.length} does not match retirement mutation count ${mutations}`);
const operationCandidates=candidates.filter(item=>item.route.startsWith('OPERATIONS_V1_')).length;
const appendCandidates=candidates.filter(item=>item.route==='STRICT_COLLECTION_APPEND').length;
const manualCandidates=candidates.length-operationCandidates-appendCandidates;
const sourceBindingRequired=candidates.filter(item=>item.provenance_status==='SOURCE_BINDING_REQUIRED').length;
const report={
  generated_at:new Date().toISOString(),
  status:'PASS',
  policy:'ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT',
  policy_note:'Zero current mutations are necessary but not sufficient: removal still requires regression tests, public-output comparison and baseline/manifest cleanup.',
  current_run_id:history.current_run_id,
  canonical_sha256:history.canonical_sha256,
  module_count:modules.length,
  ready_count:ready,
  blocked_count:blocked,
  total_current_mutations:mutations,
  modules
};
writeFileSync(join(dist,'overlay-retirement-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT overlay retirement audit','',
  `Generated: ${report.generated_at}`,
  `Current canonical run: **${report.current_run_id}**`,
  `Canonical SHA-256: \`${report.canonical_sha256}\``,'',
  `Policy: **${report.policy}**`,'',
  'A zero current mutation count is a necessary retirement gate, not automatic authorization to delete a module. A candidate still requires public-output comparison, regression tests and baseline/runtime-manifest cleanup.','',
  `- Ready for retirement review: **${ready}**`,
  `- Blocked by active mutations: **${blocked}**`,
  `- Total current overlay mutations: **${mutations}**`,'',
  '| Module | Current mutations | Changed IDs | Retirement status |','|---|---:|---|---|',
  ...modules.map(x=>`| \`${x.file}\` | ${x.mutation_count} | ${x.changed_ids.length?x.changed_ids.map(id=>`\`${id}\``).join(', '):'—'} | \`${x.retirement_status}\` |`),'',
  'No canonical data, append-only run, source, evidence or claim is modified by this audit.'
].join('\n');
writeFileSync(join(dist,'overlay-retirement-audit.md'),md+'\n','utf8');

const migrationMap={
  generated_at:report.generated_at,status:'PASS',schema_version:'engineer-osint-overlay-migration-map-v1',
  current_run_id:history.current_run_id,canonical_sha256:history.canonical_sha256,
  policy:'READ_ONLY_FIELD_LEVEL_MAP_NO_CANONICAL_WRITE',
  total_overlay_leaf_mutations:leafChanges.length,canonical_leaf_mutations:canonicalLeafMutations,overlay_meta_mutations:metaMutations,
  migration_candidate_count:candidates.length,operations_v1_candidates:operationCandidates,strict_append_candidates:appendCandidates,
  manual_review_candidates:manualCandidates,source_binding_required_candidates:sourceBindingRequired,
  module_order:LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file),
  candidates,leaf_changes:leafChanges
};
writeFileSync(join(dist,'overlay-migration-map.json'),JSON.stringify(migrationMap,null,2)+'\n','utf8');
const migrationMd=[
  '# ENGINEER OSINT v4.5.1 overlay migration map','',
  `Generated: ${migrationMap.generated_at}`,
  `Current canonical run: **${migrationMap.current_run_id}**`,
  `Canonical SHA-256: \`${migrationMap.canonical_sha256}\``,'',
  'This is a read-only migration plan. It does not create a run, change canonical data, rewrite manifest hashes or authorize overlay retirement.','',
  `- Total overlay leaf mutations: **${migrationMap.total_overlay_leaf_mutations}**`,
  `- Canonical leaf mutations: **${migrationMap.canonical_leaf_mutations}**`,
  `- Overlay-only metadata mutations: **${migrationMap.overlay_meta_mutations}**`,
  `- Consolidated migration candidates: **${migrationMap.migration_candidate_count}**`,
  `- operations_v1 candidates: **${migrationMap.operations_v1_candidates}**`,
  `- strict collection append candidates: **${migrationMap.strict_append_candidates}**`,
  `- manual review candidates: **${migrationMap.manual_review_candidates}**`,
  `- candidates still requiring source binding: **${migrationMap.source_binding_required_candidates}**`,'',
  '## Candidate summary by module','',
  '| Module | Leaf mutations | Candidates | REPLACE/RETRACT | APPEND | Manual review |','|---|---:|---:|---:|---:|---:|',
  ...modules.map(module=>`| \`${module.file}\` | ${module.mutation_count} | ${module.migration_candidate_count} | ${module.operation_replace_candidates} | ${module.strict_append_candidates} | ${module.manual_review_candidates} |`),'',
  '## Consolidated canonical action candidates','',
  '| Module | Collection | Target | Action / field | Route | Leaf diffs | Provenance |','|---|---|---|---|---|---:|---|',
  ...candidates.map(item=>`| \`${item.module}\` | \`${item.logical_collection||item.raw_collection||'—'}\` | \`${item.target_id||'—'}\` | \`${item.field||item.action}\` | \`${item.route}\` | ${item.leaf_paths.length} | \`${item.provenance_status}\` |`),'',
  '## Exact leaf paths','',
  '| Module | Target | Path | Kind | Route |','|---|---|---|---|---|',
  ...leafChanges.map(item=>`| \`${item.module}\` | \`${item.target_id||'—'}\` | \`${item.path.replace(/\|/g,'\\|')}\` | \`${item.kind}\` | \`${item.migration_route}\` |`),'',
  'Exact before/after values are retained in `overlay-migration-map.json`; the Markdown view intentionally lists paths and routes only.'
].join('\n');
writeFileSync(join(dist,'overlay-migration-map.md'),migrationMd+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_retirement_audit=pass\noverlay_retirement_policy=zero-current-mutations\noverlay_retirement_ready=${ready}\noverlay_retirement_blocked=${blocked}\nlegacy_factual_overlay_mutations=${mutations}\noverlay_migration_map=pass\noverlay_migration_leaf_mutations=${leafChanges.length}\noverlay_migration_canonical_leaf_mutations=${canonicalLeafMutations}\noverlay_migration_meta_mutations=${metaMutations}\noverlay_migration_candidates=${candidates.length}\noverlay_migration_manual_review=${manualCandidates}\n`,'utf8');
console.log(`Overlay retirement audit PASS: ${modules.map(x=>`${x.file}=${x.mutation_count}/${x.retirement_status}`).join('; ')}`);
console.log(`Overlay migration map PASS: leaf=${leafChanges.length}; canonical=${canonicalLeafMutations}; meta=${metaMutations}; candidates=${candidates.length}; ops=${operationCandidates}; append=${appendCandidates}; manual=${manualCandidates}; source-binding=${sourceBindingRequired}`);
