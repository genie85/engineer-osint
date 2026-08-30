import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {LEGACY_FACTUAL_OVERLAY_MODULES,TRANSITION_GUARDED_LEGACY_OVERLAY_FILES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4531_IDENTITY_FIX_MIGRATION_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`IDENTITY_FIX_READINESS: ${message}`)};
const sameArray=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Reuse the production retirement/migration-map audit. It is read-only and evaluates
// the currently active legacy factual runtime against the canonical built artifact.
execFileSync(process.execPath,[join(src,'audit-overlay-retirement.mjs')],{stdio:'inherit'});

const retirement=JSON.parse(readFileSync(join(dist,'overlay-retirement-audit.json'),'utf8'));
const map=JSON.parse(readFileSync(join(dist,'overlay-migration-map.json'),'utf8'));
const overlayPath=join(src,policy.overlay_file);
const overlaySha=createHash('sha256').update(readFileSync(overlayPath)).digest('hex');
const activeFiles=LEGACY_FACTUAL_OVERLAY_MODULES.map(([,file])=>file);

if(policy.status!=='READ_ONLY_MIGRATION_REVIEW_REQUIRED')fail('policy status broadened');
if(policy.safety?.canonical_write_performed!==false||policy.safety?.append_run_invoked!==false||policy.safety?.safe_to_append_identity_migration!==false||policy.safety?.safe_to_retire_identity_fix_overlay!==false||policy.safety?.identity_fix_runtime_removal_authorized!==false)fail('policy safety boundary broadened');
if(TRANSITION_GUARDED_LEGACY_OVERLAY_FILES.size!==0)fail('first-three transition guard unexpectedly reactivated');
if(!sameArray(activeFiles,[policy.overlay_file]))fail(`active legacy factual runtime is not identity-fix only: ${activeFiles.join(',')}`);
if(overlaySha!==policy.overlay_file_sha256)fail(`identity-fix file hash drift: ${overlaySha}`);
if(retirement.status!=='PASS'||map.status!=='PASS')fail('base retirement/migration-map audit did not PASS');
if(retirement.current_run_id!==policy.persistent_tip_required||map.current_run_id!==policy.persistent_tip_required)fail('persistent tip mismatch');
if(retirement.canonical_sha256!==policy.persistent_canonical_sha256_required||map.canonical_sha256!==policy.persistent_canonical_sha256_required)fail('persistent canonical hash mismatch');
if(retirement.module_count!==1||retirement.ready_count!==0||retirement.blocked_count!==1)fail('identity-fix must remain the only blocked legacy factual module');
const module=retirement.modules?.[0];
if(module?.file!==policy.overlay_file||module?.file_sha256!==policy.overlay_file_sha256||module?.retirement_status!=='ACTIVE_MUTATION_DEBT')fail('identity-fix retirement module contract mismatch');
if(module.mutation_count!==policy.expected.current_mutation_count||retirement.total_current_mutations!==policy.expected.current_mutation_count)fail('identity-fix mutation count drift');
if(module.migration_candidate_count!==policy.expected.migration_candidate_count||map.migration_candidate_count!==policy.expected.migration_candidate_count)fail('migration candidate count drift');
if(module.operation_replace_candidates!==policy.expected.operations_v1_candidates||map.operations_v1_candidates!==policy.expected.operations_v1_candidates)fail('operations_v1 candidate count drift');
if(module.strict_append_candidates!==policy.expected.strict_append_candidates||map.strict_append_candidates!==policy.expected.strict_append_candidates)fail('unexpected strict append candidates');
if(module.manual_review_candidates!==policy.expected.manual_review_candidates||map.manual_review_candidates!==policy.expected.manual_review_candidates)fail('manual-review candidate count drift');
if(map.source_binding_required_candidates!==policy.expected.source_binding_required_candidates)fail('source-binding debt drift');
if(!sameArray([...(module.changed_ids||[])].sort(),[...policy.expected.changed_ids].sort()))fail('identity target set drift');

const manual=(map.candidates||[])
  .filter(item=>String(item.route||'').includes('MANUAL')||String(item.route||'').includes('PROTECTED')||String(item.route||'').includes('REVIEW')&&!String(item.route||'').startsWith('OPERATIONS_V1_'))
  .map(item=>`${item.logical_collection}:${item.target_id}:${item.field||item.action}`)
  .sort();
const expectedManual=[...policy.expected.manual_field_removals].sort();
if(!sameArray(manual,expectedManual))fail(`manual migration scope drift: ${manual.join(',')}`);
for(const candidate of map.candidates||[]){
  if(candidate.module!==policy.overlay_file)fail(`foreign migration candidate ${candidate.module}`);
  if(!policy.expected.changed_ids.includes(candidate.target_id))fail(`foreign target ${candidate.target_id}`);
}

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-fix-migration-readiness-audit-v1',
  current_run_id:retirement.current_run_id,canonical_sha256:retirement.canonical_sha256,
  overlay_file:policy.overlay_file,overlay_file_sha256:overlaySha,
  current_mutation_count:module.mutation_count,changed_ids:[...module.changed_ids].sort(),
  migration_candidate_count:map.migration_candidate_count,operations_v1_candidates:map.operations_v1_candidates,
  manual_review_candidates:map.manual_review_candidates,manual_field_removals:manual,
  strict_append_candidates:map.strict_append_candidates,source_binding_required_candidates:map.source_binding_required_candidates,
  readiness_status:'BLOCKED_PENDING_EXACT_IDENTITY_CANONICAL_MIGRATION',
  next_required_action:'BUILD_REVIEWED_IDENTITY_FIX_PATCH_CANDIDATE_WITH_EXPLICIT_FIELD_REMOVALS',
  canonical_write_performed:false,append_run_invoked:false,safe_to_append_identity_migration:false,
  safe_to_retire_identity_fix_overlay:false,identity_fix_runtime_removal_authorized:false,
  first_three_retirement_scope_reopened:false
};
writeFileSync(join(dist,'identity-fix-migration-readiness.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(dist,'identity-fix-migration-readiness.md'),[
  '# ENGINEER OSINT v4.5.31 — identity-fix migration readiness','',
  'Status: **PASS — migration required before retirement**',
  `Current run: **${report.current_run_id}**`,
  `Canonical SHA-256: \`${report.canonical_sha256}\``,'',
  `- Active identity-fix mutations: **${report.current_mutation_count}**`,
  `- Canonical migration candidates: **${report.migration_candidate_count}**`,
  `- operations_v1 candidates: **${report.operations_v1_candidates}**`,
  `- Explicit manual field removals: **${report.manual_review_candidates}**`,
  `- Strict appends required: **${report.strict_append_candidates}**`,
  `- Unresolved source binding: **${report.source_binding_required_candidates}**`,'',
  'The identity-fix overlay remains active. This audit performs no canonical write, does not invoke append-run, and does not authorize runtime retirement.',''
].join('\n'));
appendFileSync(join(dist,'health.txt'),`identity_fix_migration_readiness=pass\nidentity_fix_current_mutations=${report.current_mutation_count}\nidentity_fix_migration_candidates=${report.migration_candidate_count}\nidentity_fix_operations_v1_candidates=${report.operations_v1_candidates}\nidentity_fix_manual_field_removals=${report.manual_review_candidates}\nidentity_fix_safe_to_append=0\nidentity_fix_safe_to_retire=0\nidentity_fix_canonical_writes=0\n`);
console.log(`IDENTITY_FIX_MIGRATION_READINESS=PASS mutations=${report.current_mutation_count} candidates=${report.migration_candidate_count} manual=${report.manual_review_candidates}`);
