import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseJsonStrict} from './lib/integrity.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const map=parseJsonStrict(readFileSync(join(dist,'overlay-migration-map.json'),'utf8'),{source:'overlay migration map'});
const review=parseJsonStrict(readFileSync(join(src,'V453_PROVENANCE_REVIEW.json'),'utf8'),{source:'v4.5.3 provenance review'});

if(map.status!=='PASS'||map.schema_version!=='engineer-osint-overlay-migration-map-v1')throw new Error('OVERLAY_PROVENANCE: migration map is not valid');
if(review.schema_version!=='engineer-osint-overlay-provenance-review-v1')throw new Error('OVERLAY_PROVENANCE: unsupported provenance review schema');
if(review.policy!=='CURATED_PRIMARY_SOURCE_REVIEW_DOES_NOT_AUTHORIZE_CANONICAL_APPEND')throw new Error('OVERLAY_PROVENANCE: review policy mismatch');
if(!Array.isArray(review.scope_modules)||review.scope_modules.length===0)throw new Error('OVERLAY_PROVENANCE: empty scope');
if(new Set(review.scope_modules).size!==review.scope_modules.length)throw new Error('OVERLAY_PROVENANCE: duplicate scope module');
for(const module of review.scope_modules){if(!map.module_order.includes(module))throw new Error(`OVERLAY_PROVENANCE: unknown scope module ${module}`);}

const sourceReviews=review.source_reviews||{};
const targetReviews=review.target_reviews||{};
const globalPolicy=review.global_field_policy||{};
const specialRules=Array.isArray(review.special_rules)?review.special_rules:[];
const analyticalFields=new Set(globalPolicy.analytical_route_required||[]);
const administrativeFields=new Set(globalPolicy.administrative_metadata||[]);
const sourceLocatorFields=new Set(globalPolicy.source_locator_fields||[]);
const scopeSet=new Set(review.scope_modules);
const unique=value=>[...new Set(value)];
const intersects=(a=[],b=[])=>a.some(value=>b.includes(value));
const safeHttps=value=>{
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!!url.hostname;}catch{return false;}
};

const reviewSourceIds=Object.keys(sourceReviews).sort();
const sourceIntegrityErrors=[];
for(const sourceId of reviewSourceIds){
  const item=sourceReviews[sourceId];
  if(!sourceId.startsWith('RICH-SRC-'))sourceIntegrityErrors.push(`${sourceId}: unexpected reviewed source id`);
  if(!item||typeof item!=='object')sourceIntegrityErrors.push(`${sourceId}: invalid review object`);
  if(!safeHttps(item?.expected_url))sourceIntegrityErrors.push(`${sourceId}: expected_url must be safe HTTPS`);
  if(typeof item?.authority!=='string'||!item.authority.trim())sourceIntegrityErrors.push(`${sourceId}: authority missing`);
  if(typeof item?.review_note!=='string'||!item.review_note.trim())sourceIntegrityErrors.push(`${sourceId}: review note missing`);
  if(typeof item?.status!=='string'||!item.status.startsWith('VERIFIED_'))sourceIntegrityErrors.push(`${sourceId}: source review is not VERIFIED_*`);
}
for(const [targetId,target] of Object.entries(targetReviews)){
  const ids=Array.isArray(target?.source_ids)?target.source_ids:[];
  if(ids.length===0)sourceIntegrityErrors.push(`${targetId}: no reviewed source ids`);
  for(const id of ids){if(!sourceReviews[id])sourceIntegrityErrors.push(`${targetId}: references unreviewed ${id}`);}
  const groups=['reviewed_source_backed_fields','precision_review_fields','absence_review_fields','expanded_source_review_fields'];
  const seen=new Map();
  for(const group of groups){
    for(const field of target?.[group]||[]){
      if(seen.has(field))sourceIntegrityErrors.push(`${targetId}.${field}: overlaps ${seen.get(field)} and ${group}`);
      seen.set(field,group);
    }
  }
}
for(const rule of specialRules){
  if(typeof rule?.field!=='string'||!rule.field)sourceIntegrityErrors.push(`${rule?.rule_id||'UNKNOWN'}: special rule field missing`);
  if(!Array.isArray(rule?.source_ids)||rule.source_ids.length===0)sourceIntegrityErrors.push(`${rule?.rule_id||'UNKNOWN'}: special rule sources missing`);
  for(const id of rule?.source_ids||[]){if(!sourceReviews[id])sourceIntegrityErrors.push(`${rule?.rule_id||'UNKNOWN'}: special rule references unreviewed ${id}`);}
}

const scopedCandidates=map.candidates.filter(item=>scopeSet.has(item.module));
if(scopedCandidates.length===0)throw new Error('OVERLAY_PROVENANCE: no migration candidates in scope');
const unexpectedRoutes=scopedCandidates.filter(item=>!['OPERATIONS_V1_REPLACE_FIELD','OPERATIONS_V1_RETRACT','STRICT_COLLECTION_APPEND'].includes(item.route));
if(unexpectedRoutes.length)throw new Error(`OVERLAY_PROVENANCE: scoped structural migration is incomplete (${unexpectedRoutes.length} unsupported/manual routes)`);

const appendSourceCandidates=scopedCandidates.filter(item=>item.route==='STRICT_COLLECTION_APPEND');
const appendSourceIds=appendSourceCandidates.map(item=>item.target_id).sort();
for(const item of appendSourceCandidates){
  if(item.logical_collection!=='sources')sourceIntegrityErrors.push(`${item.module}:${item.target_id}: non-source strict append in v4.5.3 scope`);
  const payload=item.payload?.present===true?item.payload.value:null;
  const curated=sourceReviews[item.target_id];
  if(!curated)sourceIntegrityErrors.push(`${item.target_id}: source append has no curated review`);
  if(!payload)sourceIntegrityErrors.push(`${item.target_id}: source append payload missing`);
  if(payload?.id!==item.target_id)sourceIntegrityErrors.push(`${item.target_id}: payload id mismatch`);
  if(payload?.url!==curated?.expected_url)sourceIntegrityErrors.push(`${item.target_id}: payload URL differs from curated expected URL`);
  if(payload?.type!=='PRIMARY'||payload?.tier!==1)sourceIntegrityErrors.push(`${item.target_id}: reviewed new source is not PRIMARY tier 1`);
}
for(const id of reviewSourceIds){if(!appendSourceIds.includes(id))sourceIntegrityErrors.push(`${id}: curated source review has no strict append candidate`);}
for(const id of appendSourceIds){if(!sourceReviews[id])sourceIntegrityErrors.push(`${id}: strict append candidate is not in curated source review`);}

const locatorStatus=(candidate,target)=>{
  const expected=(target?.source_ids||[]).map(id=>sourceReviews[id]?.expected_url).filter(Boolean);
  if(candidate.after_value?.present!==true)return {category:'SOURCE_LOCATOR_REVIEW_REQUIRED',note:'Source locator candidate has no after value.'};
  if(expected.includes(candidate.after_value.value))return {category:'SOURCE_LOCATOR_REVIEWED',note:'Locator exactly matches a curated primary-source URL for this target.'};
  return {category:'SOURCE_LOCATOR_REVIEW_REQUIRED',note:'Locator does not exactly match a curated primary-source URL for this target.'};
};

const classify=candidate=>{
  if(candidate.route==='STRICT_COLLECTION_APPEND')return {category:'SOURCE_DEFINITION_REVIEWED',note:'New source definition exactly matches the curated primary-source review registry.'};
  if(candidate.route==='OPERATIONS_V1_RETRACT')return {category:'RETRACTION_REVIEW_REQUIRED',note:'Retraction needs an explicit evidence-backed retirement/correction decision.'};
  const field=candidate.field;
  const target=targetReviews[candidate.target_id];
  const hints=Array.isArray(candidate.source_id_hints)?candidate.source_id_hints:[];
  for(const rule of specialRules){
    if(rule.field===field&&intersects(hints,rule.source_ids||[]))return {category:'REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT',rule_id:rule.rule_id,note:rule.note};
  }
  if(analyticalFields.has(field))return {category:'ANALYTICAL_ROUTE_REQUIRED',note:'This field is an analytical or uncertainty statement and must not be canonicalized merely because a source URL exists.'};
  if(administrativeFields.has(field))return {category:'ADMINISTRATIVE_METADATA_REVIEW_REQUIRED',note:'This field is migration/provenance metadata rather than a source-supported factual assertion; its production value must be set by the real run.'};
  if(sourceLocatorFields.has(field))return locatorStatus(candidate,target);
  if(!target)return {category:'UNCLASSIFIED_REVIEW_REQUIRED',note:'No target-specific provenance review or global/special field policy covers this candidate.'};
  if(!intersects(hints,target.source_ids||[]))return {category:'SOURCE_SCOPE_MISMATCH',note:'Candidate source hints do not intersect the curated source set for this target.'};
  if((target.reviewed_source_backed_fields||[]).includes(field))return {category:'REVIEWED_SOURCE_BACKED',note:'Field was reviewed against the curated primary source set for this target.'};
  if((target.precision_review_fields||[]).includes(field))return {category:'PRECISION_REVIEW_REQUIRED',note:'Source supports the underlying fact but the overlay value has a precision/rounding issue that must be resolved before canonicalization.'};
  if((target.absence_review_fields||[]).includes(field))return {category:'ABSENCE_REVIEW_REQUIRED',note:'The value is based on absence in a scoped source and must remain explicitly scoped rather than generalized.'};
  if((target.expanded_source_review_fields||[]).includes(field))return {category:'EXPANDED_SOURCE_REVIEW_REQUIRED',note:'Current curated sources are insufficient for the full wording; an additional authoritative source or narrower value is required.'};
  return {category:'UNCLASSIFIED_REVIEW_REQUIRED',note:'Target review exists but does not classify this field.'};
};

const candidateReviews=scopedCandidates.map(candidate=>{
  const classification=classify(candidate);
  return {
    module:candidate.module,logical_collection:candidate.logical_collection,target_id:candidate.target_id,
    field:candidate.field||null,action:candidate.action,route:candidate.route,
    source_id_hints:candidate.source_id_hints||[],category:classification.category,
    rule_id:classification.rule_id||null,note:classification.note
  };
});
const categoryCounts={};
for(const item of candidateReviews)categoryCounts[item.category]=(categoryCounts[item.category]||0)+1;
const count=category=>categoryCounts[category]||0;
const unclassified=count('UNCLASSIFIED_REVIEW_REQUIRED');
const scopeMismatches=count('SOURCE_SCOPE_MISMATCH');
const locatorReview=count('SOURCE_LOCATOR_REVIEW_REQUIRED');
const integrityErrors=unique(sourceIntegrityErrors).sort();
const pass=unclassified===0&&scopeMismatches===0&&locatorReview===0&&integrityErrors.length===0&&candidateReviews.length===scopedCandidates.length;
const furtherReviewCategories=new Set([
  'ANALYTICAL_ROUTE_REQUIRED','ADMINISTRATIVE_METADATA_REVIEW_REQUIRED','PRECISION_REVIEW_REQUIRED',
  'ABSENCE_REVIEW_REQUIRED','EXPANDED_SOURCE_REVIEW_REQUIRED','RETRACTION_REVIEW_REQUIRED'
]);
const furtherReviewCandidates=candidateReviews.filter(item=>furtherReviewCategories.has(item.category)).length;
const reviewedSourceBacked=count('REVIEWED_SOURCE_BACKED')+count('REVIEWED_SOURCE_BACKED_WITH_ATTRIBUTION_LIMIT');
const verifiedStructuralCandidates=reviewedSourceBacked+count('SOURCE_DEFINITION_REVIEWED')+count('SOURCE_LOCATOR_REVIEWED');

const output={
  generated_at:new Date().toISOString(),status:pass?'PASS':'FAIL',schema_version:'engineer-osint-overlay-provenance-audit-v1',
  current_run_id:map.current_run_id,canonical_sha256:map.canonical_sha256,reviewed_at:review.reviewed_at,
  policy:review.policy,scope_modules:review.scope_modules,
  canonical_write_performed:false,append_run_invoked:false,safe_to_append:false,safe_to_retire_overlays:false,
  candidate_count:candidateReviews.length,classified_candidate_count:candidateReviews.length-unclassified,
  source_definition_candidates:count('SOURCE_DEFINITION_REVIEWED'),reviewed_source_backed_candidates:reviewedSourceBacked,
  source_locator_reviewed_candidates:count('SOURCE_LOCATOR_REVIEWED'),verified_structural_candidates:verifiedStructuralCandidates,
  analytical_route_candidates:count('ANALYTICAL_ROUTE_REQUIRED'),administrative_metadata_review_candidates:count('ADMINISTRATIVE_METADATA_REVIEW_REQUIRED'),
  precision_review_candidates:count('PRECISION_REVIEW_REQUIRED'),absence_review_candidates:count('ABSENCE_REVIEW_REQUIRED'),
  expanded_source_review_candidates:count('EXPANDED_SOURCE_REVIEW_REQUIRED'),retraction_review_candidates:count('RETRACTION_REVIEW_REQUIRED'),
  further_review_candidates:furtherReviewCandidates,unclassified_candidates:unclassified,source_scope_mismatches:scopeMismatches,
  source_locator_review_required:locatorReview,integrity_error_count:integrityErrors.length,category_counts:categoryCounts,
  integrity_errors:integrityErrors,candidates:candidateReviews
};
writeFileSync(join(dist,'overlay-provenance-audit.json'),JSON.stringify(output,null,2)+'\n','utf8');
const md=[
  '# ENGINEER OSINT v4.5.3 provenance gate','',
  `Generated: ${output.generated_at}`,
  `Current canonical run: **${output.current_run_id}**`,
  `Status: **${output.status}**`,'',
  'This gate checks whether every structurally migratable candidate in the first three legacy overlays has an explicit provenance classification. PASS means the review registry is complete and internally consistent; it does **not** authorize a canonical append or overlay retirement.','',
  `- Scope modules: **${output.scope_modules.length}**`,
  `- Classified migration candidates: **${output.classified_candidate_count}/${output.candidate_count}**`,
  `- Reviewed source-backed factual candidates: **${output.reviewed_source_backed_candidates}**`,
  `- Reviewed new primary-source definitions: **${output.source_definition_candidates}**`,
  `- Reviewed source locators: **${output.source_locator_reviewed_candidates}**`,
  `- Analytical-route candidates: **${output.analytical_route_candidates}**`,
  `- Administrative/provenance metadata review: **${output.administrative_metadata_review_candidates}**`,
  `- Precision review: **${output.precision_review_candidates}**`,
  `- Absence review: **${output.absence_review_candidates}**`,
  `- Expanded-source review: **${output.expanded_source_review_candidates}**`,
  `- Unclassified candidates: **${output.unclassified_candidates}**`,
  `- Source-scope mismatches: **${output.source_scope_mismatches}**`,
  `- Integrity errors: **${output.integrity_error_count}**`,
  `- Safe to append: **NO**`,'',
  '## Category summary','',
  '| Category | Candidates |','|---|---:|',
  ...Object.entries(categoryCounts).sort(([a],[b])=>a.localeCompare(b)).map(([category,n])=>`| \`${category}\` | ${n} |`),'',
  '## Candidates still requiring substantive review','',
  ...candidateReviews.filter(item=>furtherReviewCategories.has(item.category)).map(item=>`- \`${item.module}\` → \`${item.logical_collection}:${item.target_id}:${item.field||item.action}\` — **${item.category}** — ${item.note}`),
  ...(furtherReviewCandidates?[]:['- None']),'',
  '## Integrity errors','',
  ...(integrityErrors.length?integrityErrors.map(value=>`- ${value}`):['- None']),'',
  '## Safety','',
  'No persistent canonical data, append-only run, run-store manifest, overlay factual value or source/evidence/claim is modified by this audit. A future production migration still requires reviewed final values, normal strict append-only execution, full chain validation and a fresh zero-mutation retirement audit.'
].join('\n');
writeFileSync(join(dist,'overlay-provenance-audit.md'),md+'\n','utf8');
appendFileSync(join(dist,'health.txt'),`overlay_provenance_audit=${pass?'pass':'fail'}\noverlay_provenance_scope_modules=${output.scope_modules.length}\noverlay_provenance_candidates=${output.candidate_count}\noverlay_provenance_reviewed_source_backed=${output.reviewed_source_backed_candidates}\noverlay_provenance_source_definitions=${output.source_definition_candidates}\noverlay_provenance_analytical_route=${output.analytical_route_candidates}\noverlay_provenance_admin_review=${output.administrative_metadata_review_candidates}\noverlay_provenance_precision_review=${output.precision_review_candidates}\noverlay_provenance_absence_review=${output.absence_review_candidates}\noverlay_provenance_expanded_source_review=${output.expanded_source_review_candidates}\noverlay_provenance_unclassified=${output.unclassified_candidates}\noverlay_provenance_integrity_errors=${output.integrity_error_count}\noverlay_provenance_safe_to_append=0\noverlay_provenance_canonical_writes=0\n`,'utf8');
console.log(`Overlay provenance audit ${output.status}: candidates=${output.candidate_count}; source-backed=${output.reviewed_source_backed_candidates}; source-definitions=${output.source_definition_candidates}; analytical=${output.analytical_route_candidates}; admin=${output.administrative_metadata_review_candidates}; precision=${output.precision_review_candidates}; absence=${output.absence_review_candidates}; expanded=${output.expanded_source_review_candidates}; unclassified=${output.unclassified_candidates}; errors=${output.integrity_error_count}; safe-to-append=NO`);
if(!pass)throw new Error(`OVERLAY_PROVENANCE failed: unclassified=${unclassified}; scope-mismatch=${scopeMismatches}; locator-review=${locatorReview}; integrity-errors=${integrityErrors.length}`);
