import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {deepDiff,parseJsonStrict,safeInlineJson} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData} from './lib/run-store.mjs';
import {PUBLIC_RUNTIME_MODULES} from './runtime-modules.mjs';

const src='docs/engineer-osint',dist='docs/engineer-osint-dist';
const policy=JSON.parse(readFileSync(join(src,'V4534_IDENTITY_MIRROR_PARITY_READINESS.json'),'utf8'));
const fail=message=>{throw new Error(`IDENTITY_MIRROR_PARITY: ${message}`)};

execFileSync(process.execPath,[join(src,'build-identity-fix-b99-candidate.mjs')],{stdio:'inherit'});
const candidatePath=join(dist,'identity-fix-b99-candidate.json');
const candidateRaw=readFileSync(candidatePath,'utf8');
const candidate=JSON.parse(candidateRaw);
const crypto=await import('node:crypto');
const candidateSha=crypto.createHash('sha256').update(candidateRaw).digest('hex');
if(candidate.state?.run_id!==policy.candidate_run_id||candidateSha!==policy.exact_candidate_file_sha256)fail('exact B99 candidate identity/hash drift');

const runtimeReaders=[];
for(const [,file] of PUBLIC_RUNTIME_MODULES){
  const code=readFileSync(join(src,file),'utf8');
  if(/\bupdated_records\b/.test(code))runtimeReaders.push(file);
}
const nonOverlayReaders=runtimeReaders.filter(file=>file!==policy.identity_overlay_file);
if(nonOverlayReaders.length!==policy.expected_non_overlay_public_runtime_updated_records_readers)fail(`unexpected public runtime updated_records readers: ${nonOverlayReaders.join(',')}`);
if(!runtimeReaders.includes(policy.identity_overlay_file))fail('identity overlay no longer owns the expected legacy mirror reference');

const htmlPath=join(dist,'index.html'),html=readFileSync(htmlPath,'utf8');
const marker='window.__ENGINEER_DATA__=',start=html.indexOf(marker),end=html.indexOf(';</script>',start);
if(start<0||end<0)fail('ENGINEER_DATA marker missing from built artifact');
const built=parseJsonStrict(html.slice(start+marker.length,end),{source:'v4.5.34 built ENGINEER_DATA'});
const b99=applyStrictPatchToCanonicalData(built,candidate);
const overlayCode=readFileSync(join(src,policy.identity_overlay_file),'utf8');
const overlayApplied=structuredClone(b99);
vm.runInNewContext(overlayCode,{window:{__ENGINEER_DATA__:overlayApplied},console},{filename:policy.identity_overlay_file,timeout:3000});
const residual=deepDiff(b99,overlayApplied);
const prefix=`${policy.legacy_mirror_path}.`;
const authoritativeResidual=residual.filter(change=>!change.path.startsWith(prefix));
const mirrorResidual=residual.filter(change=>change.path.startsWith(prefix));
if(residual.length!==policy.expected_overlay_residual_count_after_b99)fail(`total residual ${residual.length}`);
if(authoritativeResidual.length!==policy.expected_authoritative_residual_count_after_b99)fail(`authoritative residual ${authoritativeResidual.length}`);
if(mirrorResidual.length!==policy.expected_overlay_residual_count_after_b99)fail(`mirror residual ${mirrorResidual.length}`);

const mirror=b99.dashboard_patch_extras?.updated_records?.[70];
const fixedMirror=overlayApplied.dashboard_patch_extras?.updated_records?.[70];
if((mirror?.id||mirror?.record_id)!==policy.legacy_mirror_target_id)fail(`legacy mirror target mismatch: ${mirror?.id||mirror?.record_id}`);
if((fixedMirror?.id||fixedMirror?.record_id)!==policy.legacy_mirror_target_id)fail('fixed mirror target mismatch');
const mirrorSynced=structuredClone(b99);
mirrorSynced.dashboard_patch_extras.updated_records[70]=structuredClone(fixedMirror);
const parityDiff=deepDiff(overlayApplied,mirrorSynced);
if(parityDiff.length!==policy.expected_data_diff_after_exact_mirror_sync)fail(`mirror sync data parity diff ${parityDiff.length}`);

const replaceData=(base,data)=>base.slice(0,start+marker.length)+safeInlineJson(data)+base.slice(end);
const activeHtml=replaceData(html,b99);
const identityScript=new RegExp(`<script id=["']engineer-data-integrity-identity-fixes-module["'][^>]*>[\\s\\S]*?<\\/script>`,'i');
if(!identityScript.test(activeHtml))fail('identity overlay script tag missing from built artifact');
const cleanedHtml=replaceData(html,mirrorSynced).replace(identityScript,'');
if(identityScript.test(cleanedHtml))fail('identity overlay script tag remained in cleaned variant');
writeFileSync(join(dist,'v4534-b99-identity-active.html'),activeHtml,'utf8');
writeFileSync(join(dist,'v4534-b99-mirror-synced-no-identity.html'),cleanedHtml,'utf8');

const report={
  generated_at:new Date().toISOString(),status:'PASS',schema_version:'engineer-osint-identity-mirror-parity-audit-v1',
  candidate_run_id:policy.candidate_run_id,candidate_file_sha256:candidateSha,
  public_runtime_updated_records_readers:runtimeReaders,non_overlay_public_runtime_updated_records_readers:nonOverlayReaders,
  overlay_residual_count_after_b99:residual.length,authoritative_residual_count_after_b99:authoritativeResidual.length,
  legacy_mirror_residual_count_after_b99:mirrorResidual.length,legacy_mirror_target_id:policy.legacy_mirror_target_id,
  legacy_mirror_residual_paths:mirrorResidual.map(change=>change.path),data_diff_after_exact_mirror_sync:parityDiff.length,
  browser_parity_required:policy.browser_parity_required,browser_parity_passed:false,
  canonical_write_performed:false,b99_append_authorized:false,legacy_mirror_cleanup_persisted:false,identity_fix_runtime_removal_authorized:false,
  ready_for_browser_parity_review:true
};
writeFileSync(join(dist,'identity-mirror-parity-audit.json'),JSON.stringify(report,null,2)+'\n','utf8');
writeFileSync(join(dist,'identity-mirror-parity-audit.md'),`# ENGINEER OSINT v4.5.34 — identity mirror parity readiness\n\nStatus: **PASS — browser parity still required**\n\n- exact B99 candidate: \`${candidateSha}\`\n- public runtime readers of \`updated_records\`: **${runtimeReaders.length}** (${runtimeReaders.join(', ')})\n- non-identity-overlay public runtime readers: **${nonOverlayReaders.length}**\n- authoritative residuals after B99: **${authoritativeResidual.length}**\n- legacy mirror-only residuals: **${mirrorResidual.length}**\n- data diff after exact mirror synchronization: **${parityDiff.length}**\n- B99 append authorized: **no**\n- identity overlay retirement authorized: **no**\n`,'utf8');
console.log(`IDENTITY_MIRROR_PARITY_READINESS=PASS readers=${runtimeReaders.join(',')} canonical_residual=${authoritativeResidual.length} mirror_residual=${mirrorResidual.length} data_diff=${parityDiff.length}`);
