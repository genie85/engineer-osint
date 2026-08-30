import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const b98='engineer-osint-20260830-B98',b97='engineer-osint-20260830-B97';
const exactFileSha='ac2ae06bf3e3914b857cd0fddf2aa895aa9dd11f9289c379eba2b6cc9a038a79';
const exactCanonicalSha='4ebc674ce036e3aa8cc77b52ae22f893b38ce345fe37ee0a8700585b34b30201';
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const sha256=text=>createHash('sha256').update(text).digest('hex');
const requireFile=name=>{
  const path=join(dist,name);
  if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)throw new Error(`PAGES_VERIFY: missing/empty ${name}`);
  return path;
};
const requireHealth=(health,marker)=>{if(!health.includes(marker))throw new Error(`PAGES_VERIFY: missing health marker ${marker}`);};
const requireIndex=(index,marker)=>{if(!index.includes(marker))throw new Error(`PAGES_VERIFY: missing index marker ${marker}`);};

const manifest=readJson(join(src,'data/run-store-manifest.json'));
const currentRun=manifest.runs.at(-1)?.run_id||manifest.snapshot.run_id;
if(currentRun!==b98){
  execFileSync(process.execPath,[join(src,'verify-pages-artifact-pre-b98.mjs')],{stdio:'inherit'});
  process.exit(0);
}

[
  'index.html','health.txt','media-history-audit.json','media-history-audit.md','media-coverage-qa.json','media-coverage-qa.md',
  'public-cz-ui-audit.json','public-cz-ui-audit.md','overlay-retirement-audit.json','overlay-retirement-audit.md',
  'persistent-b98-audit.json','persistent-b98-audit.md'
].forEach(requireFile);

const health=readFileSync(join(dist,'health.txt'),'utf8'),index=readFileSync(join(dist,'index.html'),'utf8');
[
  'status=SUCCESS','run_store=append-only-v1','patch_history_materialization=snapshot-chain','patch_continuity=SNAPSHOT_CHAIN_COMPLETE',
  'legacy_history_status=DEGRADED_LEGACY_ACKNOWLEDGED','legacy_malformed_revisions=3','legacy_duplicate_runs=5','legacy_parent_gaps=3',
  'legacy_factual_overlays=pinned-migration-debt','overlay_retirement_audit=pass','overlay_retirement_policy=zero-current-mutations',
  'localization_mutation_violations=0','canonical_export_snapshot=legacy-overlay-resolved','runtime_audit=pass',
  `run=${b98}`,'persistent_b98_audit=pass','persistent_b98_mode=persistent',`persistent_b98_candidate_run=${b98}`,
  `persistent_b98_parent_run=${b97}`,`persistent_b98_candidate_sha=${exactFileSha}`,`persistent_b98_result_sha=${exactCanonicalSha}`,
  'persistent_b98_native_gaps=15','persistent_b98_native_evidence=2','persistent_b98_native_assessments=4',
  'persistent_b98_residual_signatures=61','persistent_b98_residual_factual_leafs=81','persistent_b98_unexpected_residual_modules=0',
  'persistent_b98_guard_short_circuits=3','persistent_b98_guarded_factual_mutations=0',
  'persistent_b98_media_status=MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION',
  'persistent_b98_overlays_must_remain_active=1','persistent_b98_overlay_retirement_authorized=0',
  'persistent_b98_identity_fix_migration_authorized=0','persistent_b98_pages_validation_ready=1','persistent_b98_canonical_writes=0'
].forEach(marker=>requireHealth(health,marker));

[
  'engineer-ui-phase8-navigation-module','engineer-ui-phase9-intelligence-module','engineer-media-source-materialization',
  'engineer-i18n-content-cs-public-cz-backlog-module','engineer-i18n-content-cs-public-cz-2110-module','engineer-i18n-content-cs-public-cz-0633-module',
  'engineer-public-cz-ui-canary','engineer-i18n-runtime-switch-fix','CZ_EN_CZ_DYNAMIC_CONTENT','CANONICAL_SNAPSHOT_PLUS_APPEND_ONLY_RUNS',"default_language:'cs'"
].forEach(marker=>requireIndex(index,marker));

const media=readJson(join(dist,'media-coverage-qa.json'));
if(media.publish_gate?.pass!==true)throw new Error('PAGES_VERIFY: current-run media publish gate failed');
const retirement=readJson(join(dist,'overlay-retirement-audit.json'));
if(retirement.status!=='PASS'||retirement.policy!=='ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT'||retirement.module_count!==retirement.ready_count+retirement.blocked_count)throw new Error('PAGES_VERIFY: overlay retirement audit invalid');
if(retirement.current_run_id!==b98)throw new Error('PAGES_VERIFY: overlay retirement audit is stale for B98');

const entry=manifest.runs.at(-1);
if(entry?.run_id!==b98||entry?.parent_run_id!==b97)throw new Error('PAGES_VERIFY: B98 manifest lineage mismatch');
if(entry.file_sha256!==exactFileSha||entry.canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: B98 manifest hash mismatch');
if(entry.path!=='data/runs/engineer-osint-20260830-B98.json')throw new Error('PAGES_VERIFY: B98 manifest path mismatch');

const runPath=join(src,entry.path);
const runRaw=readFileSync(runPath,'utf8'),run=JSON.parse(runRaw);
if(sha256(runRaw)!==exactFileSha)throw new Error('PAGES_VERIFY: persistent B98 file SHA mismatch');
if(run.state?.run_id!==b98||run.state?.parent_run_id!==b97||run.state?.status!=='SUCCESS')throw new Error('PAGES_VERIFY: persistent B98 state identity mismatch');
if((run.evidence||[]).length!==2)throw new Error('PAGES_VERIFY: persistent B98 evidence count mismatch');
const intel=run.extensions?.intelligence_v1;
if(!intel||intel.assessments?.length!==4||intel.gaps?.length!==0||intel.contradictions?.length!==0)throw new Error('PAGES_VERIFY: persistent B98 Intelligence scope mismatch');
if(run.extensions?.operations_v1!==undefined)throw new Error('PAGES_VERIFY: factual operations leaked into B98');
if(run.continuity?.overlay_retirement_authorized!==false)throw new Error('PAGES_VERIFY: B98 run authorizes overlay retirement');

const audit=readJson(join(dist,'persistent-b98-audit.json'));
if(audit.status!=='PASS'||audit.mode!=='PERSISTENT_POST_APPEND'||audit.persistent_tip!==b98)throw new Error('PAGES_VERIFY: persistent B98 audit mode mismatch');
if(audit.candidate_file_sha256!==exactFileSha||audit.resulting_canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: persistent B98 audit hash mismatch');
if(audit.persistent_gap_count!==15||audit.native_evidence_count!==2||audit.native_assessment_count!==4)throw new Error('PAGES_VERIFY: persistent B98 audit Intelligence scope mismatch');
if(audit.residual_signature_count!==61||audit.residual_factual_leaf_mutations!==81||audit.unexpected_residual_modules?.length!==0)throw new Error('PAGES_VERIFY: persistent B98 residual baseline mismatch');
if(audit.guard_short_circuit_count!==3||audit.guarded_factual_mutation_count!==0)throw new Error('PAGES_VERIFY: persistent B98 runtime guard transition failed');
if(audit.multimedia_status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_ASSESSMENT_MIGRATION_NO_MEDIA_ADDITION')throw new Error('PAGES_VERIFY: persistent B98 media status mismatch');
if(audit.overlays_must_remain_active!==true||audit.overlay_retirement_authorized!==false||audit.identity_fix_migration_authorized!==false||audit.post_b98_pages_validation_ready!==true||audit.canonical_write_performed!==false)throw new Error('PAGES_VERIFY: persistent B98 safety boundary broadened');

const auth=readJson(join(src,'V4526_B98_APPEND_AUTHORIZATION.json'));
if(auth.schema_version!=='engineer-osint-b98-append-authorization-v1'||auth.status!=='READY_FOR_APPEND')throw new Error('PAGES_VERIFY: B98 authorization inactive');
if(auth.candidate_run_id!==b98||auth.expected_parent_run_id!==b97||auth.exact_candidate_file_sha256!==exactFileSha||auth.expected_resulting_canonical_sha256!==exactCanonicalSha)throw new Error('PAGES_VERIFY: B98 authorization identity/hash drift');
if(auth.authorization?.append_exact_candidate_only!==true||auth.authorization?.standard_append_run_write_required!==true||auth.authorization?.one_run_only!==true)throw new Error('PAGES_VERIFY: B98 authorization incomplete');
if(auth.authorization?.allow_manual_manifest_or_hash_edit!==false||auth.authorization?.allow_future_run_same_slice!==false||auth.authorization?.allow_overlay_retirement!==false||auth.authorization?.allow_identity_fix_migration!==false)throw new Error('PAGES_VERIFY: B98 authorization safety scope broadened');

console.log(`PAGES_VERIFY PASS: phase=POST_B98; run=${b98}; persistent-b98=pass; overlays=active`);
