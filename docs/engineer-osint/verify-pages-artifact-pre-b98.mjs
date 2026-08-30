import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const requireFile=name=>{
  const path=join(dist,name);
  if(!existsSync(path)||!statSync(path).isFile()||statSync(path).size===0)throw new Error(`PAGES_VERIFY: missing/empty ${name}`);
  return path;
};
const requireHealth=(health,marker)=>{if(!health.includes(marker))throw new Error(`PAGES_VERIFY: missing health marker ${marker}`);};
const requireIndex=(index,marker)=>{if(!index.includes(marker))throw new Error(`PAGES_VERIFY: missing index marker ${marker}`);};

const commonFiles=[
  'index.html','health.txt','media-history-audit.json','media-history-audit.md','media-coverage-qa.json','media-coverage-qa.md',
  'public-cz-ui-audit.json','public-cz-ui-audit.md','overlay-retirement-audit.json','overlay-retirement-audit.md'
];
commonFiles.forEach(requireFile);
const health=readFileSync(join(dist,'health.txt'),'utf8'),index=readFileSync(join(dist,'index.html'),'utf8');
const manifest=readJson(join(src,'data/run-store-manifest.json'));
const currentRun=manifest.runs.at(-1)?.run_id||manifest.snapshot.run_id;
const b95='engineer-osint-20260826-B95',b96='engineer-osint-20260829-B96',b97='engineer-osint-20260830-B97';
const phase=currentRun===b95?'PRE_B96':currentRun===b96?'POST_B96':currentRun===b97?'POST_B97':null;
if(!phase)throw new Error(`PAGES_VERIFY: unsupported canonical migration phase at ${currentRun}`);

[
  'status=SUCCESS','run_store=append-only-v1','patch_history_materialization=snapshot-chain','patch_continuity=SNAPSHOT_CHAIN_COMPLETE',
  'legacy_history_status=DEGRADED_LEGACY_ACKNOWLEDGED','legacy_malformed_revisions=3','legacy_duplicate_runs=5','legacy_parent_gaps=3',
  'legacy_factual_overlays=pinned-migration-debt','overlay_retirement_audit=pass','overlay_retirement_policy=zero-current-mutations',
  'localization_mutation_violations=0','canonical_export_snapshot=legacy-overlay-resolved','runtime_audit=pass'
].forEach(marker=>requireHealth(health,marker));
[
  'engineer-ui-phase8-navigation-module','engineer-ui-phase9-intelligence-module','engineer-media-source-materialization',
  'engineer-i18n-content-cs-public-cz-backlog-module','engineer-i18n-content-cs-public-cz-2110-module','engineer-i18n-content-cs-public-cz-0633-module',
  'engineer-public-cz-ui-canary','engineer-i18n-runtime-switch-fix','CZ_EN_CZ_DYNAMIC_CONTENT','CANONICAL_SNAPSHOT_PLUS_APPEND_ONLY_RUNS',"default_language:'cs'"
].forEach(marker=>requireIndex(index,marker));
if(!health.includes(`run=${currentRun}`))throw new Error(`PAGES_VERIFY: health RUN_ID mismatch for ${currentRun}`);

const media=readJson(join(dist,'media-coverage-qa.json'));
if(media.publish_gate?.pass!==true)throw new Error('PAGES_VERIFY: current-run media publish gate failed');
const retirement=readJson(join(dist,'overlay-retirement-audit.json'));
if(retirement.status!=='PASS'||retirement.policy!=='ZERO_CURRENT_MUTATIONS_REQUIRED_BEFORE_RUNTIME_RETIREMENT'||retirement.module_count!==retirement.ready_count+retirement.blocked_count)throw new Error('PAGES_VERIFY: overlay retirement audit invalid');
if(retirement.current_run_id!==currentRun)throw new Error('PAGES_VERIFY: overlay retirement audit is stale');

if(phase==='PRE_B96'){
  const migrationFiles=[
    'overlay-migration-map.json','overlay-migration-map.md','overlay-migration-dry-run.json','overlay-migration-dry-run.md',
    'overlay-provenance-audit.json','overlay-provenance-audit.md','overlay-production-migration-preview.json','overlay-production-migration-preview.md',
    'overlay-stage-a-patch-candidate.json','overlay-stage-a-patch-candidate-meta.json','overlay-stage-a-append-plan.json',
    'overlay-stage-a-impact-preview.json','overlay-stage-a-impact-preview.md','overlay-stage-b-intelligence-audit.json','overlay-stage-b-intelligence-audit.md',
    'overlay-stage-b-gap-patch-candidate.json','overlay-assessment-evidence-audit.json','overlay-assessment-evidence-audit.md',
    'overlay-stage-c-assessment-evidence-candidate.json','overlay-compat-transition-preview.json','overlay-compat-transition-preview.md',
    'overlay-compat-transition-guard-spec.json','persistent-b96-audit.json','persistent-b96-audit.md'
  ];
  migrationFiles.forEach(requireFile);
  [
    'overlay_migration_map=pass','overlay_migration_dry_run=pass','overlay_migration_dry_run_canonical_writes=0','overlay_migration_dry_run_safe_to_retire=0',
    'overlay_provenance_audit=pass','overlay_provenance_unclassified=0','overlay_provenance_integrity_errors=0','overlay_provenance_safe_to_append=0','overlay_provenance_canonical_writes=0',
    'overlay_production_preview=pass','overlay_production_preview_stage_a_strict=pass','overlay_production_preview_stage_a_ops=104','overlay_production_preview_stage_a_sources=15',
    'overlay_production_preview_stage_b_intelligence=19','overlay_production_preview_no_write=18','overlay_production_preview_unresolved_errors=0','overlay_production_preview_safe_to_append=0',
    'overlay_production_preview_safe_to_retire=0','overlay_production_preview_canonical_writes=0','overlay_stage_a_candidate=pass',
    'overlay_stage_a_candidate_run=engineer-osint-20260829-B96','overlay_stage_a_candidate_parent=engineer-osint-20260826-B95','overlay_stage_a_candidate_ops=104',
    'overlay_stage_a_candidate_sources=15','overlay_stage_a_candidate_safe_to_append=0','overlay_stage_a_candidate_canonical_writes=0','overlay_stage_a_append_plan=pass',
    'overlay_stage_a_append_plan_status=validated-dry-run','overlay_stage_a_append_plan_persistent_writes=0','overlay_stage_a_impact=pass','overlay_stage_a_impact_unexpected=0',
    'overlay_stage_a_impact_stage_b_pending=19','overlay_stage_a_impact_retirement_ready=0','overlay_stage_a_impact_canonical_writes=0','overlay_stage_b_intelligence=pass',
    'overlay_stage_b_gap_candidates=15','overlay_stage_b_assessment_candidates=4','overlay_stage_b_assessments_materialized=0','overlay_stage_b_assessment_binding_blockers=4',
    'overlay_stage_b_explicit_evidence_matches=0','overlay_stage_b_unexpected_residuals=0','overlay_stage_b_safe_to_append=0','overlay_stage_b_safe_to_retire=0','overlay_stage_b_canonical_writes=0',
    'overlay_assessment_evidence=pass','overlay_assessment_evidence_candidates=2','overlay_assessment_native_assessments=4','overlay_assessment_native_analytical_preserved=19',
    'overlay_assessment_unsupported_legacy_implications=0','overlay_assessment_unexpected_residuals=0','overlay_assessment_safe_to_append=0','overlay_assessment_safe_to_retire=0',
    'overlay_assessment_canonical_writes=0','overlay_stage_bc_pages_gate=pass','overlay_stage_bc_pages_gate_artifacts=6','overlay_stage_bc_pages_gate_native_analytical=19',
    'overlay_stage_bc_pages_gate_unexpected_residuals=0','overlay_stage_bc_pages_gate_canonical_writes=0','overlay_compat_transition=pass','overlay_compat_transition_guard=pass',
    'overlay_compat_transition_negative_cases=6','overlay_compat_transition_persistent_guard=blocked','overlay_compat_transition_first3_zero_mutations=1','overlay_compat_transition_zero_mutation_modules=3',
    'overlay_compat_transition_native_gaps=15','overlay_compat_transition_native_assessments=4','overlay_compat_transition_native_evidence=2','overlay_compat_transition_native_analytical=19',
    'overlay_compat_transition_no_write_preserved=18','overlay_compat_transition_ui_native=pass','overlay_compat_transition_production_short_circuit=0','overlay_compat_transition_safe_to_append=0',
    'overlay_compat_transition_safe_to_retire=0','overlay_compat_transition_canonical_writes=0','persistent_b96_audit=pass','persistent_b96_mode=simulated-pre-append',
    'persistent_b96_candidate_run=engineer-osint-20260829-B96','persistent_b96_ops=104','persistent_b96_sources=15','persistent_b96_residual_signatures=61',
    'persistent_b96_residual_factual_leafs=81','persistent_b96_unexpected_residual_modules=0','persistent_b96_guard_short_circuits=0','persistent_b96_b97_b98_materialized=0',
    'persistent_b96_overlays_must_remain_active=1','persistent_b96_pages_validation_ready=1','persistent_b96_canonical_writes=0'
  ].forEach(marker=>requireHealth(health,marker));

  const map=readJson(join(dist,'overlay-migration-map.json'));
  if(map.status!=='PASS'||map.schema_version!=='engineer-osint-overlay-migration-map-v1'||map.total_overlay_leaf_mutations!==retirement.total_current_mutations||map.canonical_leaf_mutations+map.overlay_meta_mutations!==map.total_overlay_leaf_mutations)throw new Error('PAGES_VERIFY: overlay migration map invalid');
  const dry=readJson(join(dist,'overlay-migration-dry-run.json'));
  if(dry.status!=='PASS'||dry.schema_version!=='engineer-osint-overlay-migration-dry-run-v1'||dry.canonical_write_performed!==false||dry.append_run_invoked!==false||dry.safe_to_append!==false||dry.safe_to_retire_overlays!==false||dry.unexpected_residual_signatures!==0)throw new Error('PAGES_VERIFY: overlay migration dry-run invalid');
  const provenance=readJson(join(dist,'overlay-provenance-audit.json'));
  if(provenance.status!=='PASS'||provenance.schema_version!=='engineer-osint-overlay-provenance-audit-v1'||provenance.canonical_write_performed!==false||provenance.append_run_invoked!==false||provenance.safe_to_append!==false||provenance.safe_to_retire_overlays!==false||provenance.unclassified_candidates!==0||provenance.source_scope_mismatches!==0||provenance.source_locator_review_required!==0||provenance.integrity_error_count!==0)throw new Error('PAGES_VERIFY: overlay provenance audit invalid');
  const preview=readJson(join(dist,'overlay-production-migration-preview.json'));
  if(preview.status!=='PASS'||preview.schema_version!=='engineer-osint-overlay-production-preview-v1'||preview.canonical_write_performed!==false||preview.append_run_invoked!==false||preview.production_operation_ids_generated!==false||preview.production_run_id_generated!==false||preview.safe_to_append!==false||preview.safe_to_retire_overlays!==false||preview.stage_a?.strict_preview_status!=='PASS'||preview.unresolved_error_count!==0)throw new Error('PAGES_VERIFY: production preview invalid');
  const meta=readJson(join(dist,'overlay-stage-a-patch-candidate-meta.json')),plan=readJson(join(dist,'overlay-stage-a-append-plan.json'));
  if(meta.status!=='PASS'||meta.schema_version!=='engineer-osint-stage-a-patch-candidate-meta-v1'||plan.status!=='VALIDATED_DRY_RUN'||plan.entry.file_sha256!==meta.candidate_file_sha256||plan.entry.parent_canonical_sha256!==meta.parent_canonical_sha256||meta.safe_to_append!==false||meta.safe_to_retire_overlays!==false||meta.canonical_write_performed!==false)throw new Error('PAGES_VERIFY: Stage A candidate plan invalid');
  const impact=readJson(join(dist,'overlay-stage-a-impact-preview.json'));
  if(impact.status!=='PASS'||impact.schema_version!=='engineer-osint-stage-a-impact-audit-v1'||impact.unexpected_signature_count!==0||impact.retirement_ready_after_stage_a!==false||impact.safe_to_append!==false||impact.safe_to_retire_overlays!==false)throw new Error('PAGES_VERIFY: Stage A impact invalid');
  const stageB=readJson(join(dist,'overlay-stage-b-intelligence-audit.json')),stageC=readJson(join(dist,'overlay-assessment-evidence-audit.json'));
  if(stageB.status!=='PASS'||stageB.schema_version!=='engineer-osint-stage-b-intelligence-audit-v1'||stageB.native_gap_candidate_count!==15||stageB.assessment_candidate_count!==4||stageB.unexpected_residual_signatures?.length!==0)throw new Error('PAGES_VERIFY: Stage B artifact invalid');
  if(stageC.status!=='PASS'||stageC.schema_version!=='engineer-osint-assessment-evidence-audit-v1'||stageC.evidence_candidate_count!==2||stageC.assessment_candidate_count!==4||stageC.native_analytical_candidates_preserved!==19||stageC.unexpected_residual_signatures?.length!==0)throw new Error('PAGES_VERIFY: Stage C artifact invalid');
  const transition=readJson(join(dist,'overlay-compat-transition-preview.json'));
  if(transition.status!=='PASS'||transition.schema_version!=='engineer-osint-compat-transition-preview-v1'||transition.exact_guard?.short_circuit_allowed!==true||transition.persistent_guard?.short_circuit_allowed!==false||transition.negative_guard_cases_passed!==6||transition.guarded_transition?.total_mutations!==0||transition.guarded_transition?.zero_mutation_modules!==3||transition.native_semantics?.analytical_total!==19||transition.native_semantics?.gap_exact_mappings!==15||transition.native_semantics?.assessment_reviewed_replacements!==4||transition.native_semantics?.evidence_count!==2||transition.native_semantics?.no_write_semantics_preserved!==18||transition.canonical_write_performed!==false||transition.append_run_invoked!==false||transition.runtime_overlay_changed!==false||transition.short_circuit_enabled_in_production!==false||transition.safe_to_append!==false||transition.safe_to_retire_overlays!==false)throw new Error('PAGES_VERIFY: compatibility transition artifact invalid');
  const post=readJson(join(dist,'persistent-b96-audit.json'));
  if(post.status!=='PASS'||post.schema_version!=='engineer-osint-persistent-b96-audit-v1'||post.mode!=='SIMULATED_PRE_APPEND_READINESS'||post.residual_signature_count!==61||post.residual_factual_leaf_mutations!==81||post.guard_short_circuit_count!==0||post.post_b96_pages_validation_ready!==true)throw new Error('PAGES_VERIFY: simulated post-B96 readiness invalid');
}else if(phase==='POST_B96'){
  ['persistent-b96-audit.json','persistent-b96-audit.md','persistent-b97-audit.json','persistent-b97-audit.md'].forEach(requireFile);
  [
    'persistent_b96_audit=pass','persistent_b96_mode=persistent','persistent_b96_candidate_run=engineer-osint-20260829-B96',
    'persistent_b96_ops=104','persistent_b96_sources=15','persistent_b96_residual_signatures=61','persistent_b96_residual_factual_leafs=81',
    'persistent_b96_unexpected_residual_modules=0','persistent_b96_guard_short_circuits=0','persistent_b96_b97_b98_materialized=0',
    'persistent_b96_overlays_must_remain_active=1','persistent_b96_pages_validation_ready=1','persistent_b96_canonical_writes=0',
    'persistent_b97_audit=pass','persistent_b97_mode=simulated-pre-append','persistent_b97_candidate_run=engineer-osint-20260830-B97',
    'persistent_b97_parent_run=engineer-osint-20260829-B96','persistent_b97_native_gaps=15','persistent_b97_b98_assessments=0',
    'persistent_b97_residual_signatures=61','persistent_b97_residual_factual_leafs=81','persistent_b97_unexpected_residual_modules=0',
    'persistent_b97_guard_short_circuits=0','persistent_b97_media_status=MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION',
    'persistent_b97_b98_materialized=0','persistent_b97_overlays_must_remain_active=1','persistent_b97_pages_validation_ready=1','persistent_b97_canonical_writes=0'
  ].forEach(marker=>requireHealth(health,marker));
  const post=readJson(join(dist,'persistent-b96-audit.json'));
  if(post.status!=='PASS'||post.schema_version!=='engineer-osint-persistent-b96-audit-v1'||post.mode!=='PERSISTENT_POST_APPEND'||post.persistent_tip!==b96||post.candidate_file_sha256!=='3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1'||post.resulting_canonical_sha256!=='4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5'||post.residual_signature_count!==61||post.residual_factual_leaf_mutations!==81||post.unexpected_residual_modules?.length!==0||post.guard_short_circuit_count!==0||post.b97_b98_materialized!==false||post.overlays_must_remain_active!==true||post.post_b96_pages_validation_ready!==true)throw new Error('PAGES_VERIFY: persistent B96 audit invalid');
  const b97Preview=readJson(join(dist,'persistent-b97-audit.json'));
  if(b97Preview.status!=='PASS'||b97Preview.schema_version!=='engineer-osint-persistent-b97-audit-v1'||b97Preview.mode!=='SIMULATED_PRE_APPEND_READINESS'||b97Preview.candidate_run_id!==b97||b97Preview.parent_run_id!==b96||b97Preview.candidate_file_sha256!=='b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad'||b97Preview.resulting_canonical_sha256!=='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4'||b97Preview.native_gap_count!==15||b97Preview.b98_assessment_count!==0||b97Preview.residual_signature_count!==61||b97Preview.residual_factual_leaf_mutations!==81||b97Preview.unexpected_residual_modules?.length!==0||b97Preview.guard_short_circuit_count!==0||b97Preview.multimedia_status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION'||b97Preview.b98_materialized!==false||b97Preview.overlays_must_remain_active!==true||b97Preview.post_b97_pages_validation_ready!==true||b97Preview.canonical_write_performed!==false)throw new Error('PAGES_VERIFY: simulated post-B97 readiness invalid');
  const authorization=readJson(join(src,'V4518_B97_APPEND_AUTHORIZATION.json'));
  if(authorization.status!=='READY_FOR_APPEND'||authorization.required_preconditions?.post_b97_ci_pipeline_ready!==true||authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.allow_b98_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('PAGES_VERIFY: B97 pre-write authorization is not active and exact-only');
}else{
  ['persistent-b97-audit.json','persistent-b97-audit.md'].forEach(requireFile);
  [
    'persistent_b97_audit=pass','persistent_b97_mode=persistent','persistent_b97_candidate_run=engineer-osint-20260830-B97',
    'persistent_b97_parent_run=engineer-osint-20260829-B96','persistent_b97_native_gaps=15','persistent_b97_b98_assessments=0',
    'persistent_b97_residual_signatures=61','persistent_b97_residual_factual_leafs=81','persistent_b97_unexpected_residual_modules=0',
    'persistent_b97_guard_short_circuits=0','persistent_b97_media_status=MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION',
    'persistent_b97_b98_materialized=0','persistent_b97_overlays_must_remain_active=1','persistent_b97_pages_validation_ready=1','persistent_b97_canonical_writes=0'
  ].forEach(marker=>requireHealth(health,marker));
  const post=readJson(join(dist,'persistent-b97-audit.json'));
  if(post.status!=='PASS'||post.schema_version!=='engineer-osint-persistent-b97-audit-v1'||post.mode!=='PERSISTENT_POST_APPEND'||post.persistent_tip!==b97||post.candidate_run_id!==b97||post.parent_run_id!==b96||post.candidate_file_sha256!=='b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad'||post.resulting_canonical_sha256!=='9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4'||post.native_gap_count!==15||post.b98_assessment_count!==0||post.residual_signature_count!==61||post.residual_factual_leaf_mutations!==81||post.unexpected_residual_modules?.length!==0||post.guard_short_circuit_count!==0||post.multimedia_status!=='MISSING_WAIVED_PINNED_INTELLIGENCE_MIGRATION_NO_MEDIA_ADDITION'||post.b98_materialized!==false||post.overlays_must_remain_active!==true||post.post_b97_pages_validation_ready!==true||post.canonical_write_performed!==false)throw new Error('PAGES_VERIFY: persistent B97 audit invalid');
  const authorization=readJson(join(src,'V4518_B97_APPEND_AUTHORIZATION.json'));
  if(authorization.status!=='READY_FOR_APPEND'||authorization.required_preconditions?.post_b97_ci_pipeline_ready!==true||authorization.authorization?.append_exact_candidate_only!==true||authorization.authorization?.standard_append_run_write_required!==true||authorization.authorization?.one_run_only!==true||authorization.authorization?.allow_b98_same_slice!==false||authorization.authorization?.allow_overlay_retirement!==false||authorization.authorization?.allow_identity_fix_migration!==false)throw new Error('PAGES_VERIFY: persisted B97 lacks reviewed active authorization');
}

console.log(`Pages artifact verification PASS: phase=${phase}; run=${currentRun}; overlay-ready=${retirement.ready_count}; overlay-blocked=${retirement.blocked_count}`);
