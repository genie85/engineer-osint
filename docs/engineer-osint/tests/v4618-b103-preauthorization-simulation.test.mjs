import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from '../lib/run-store.mjs';
import {canonicalDigest} from '../lib/integrity.mjs';

const root='docs/engineer-osint';
const candidatePath=`${root}/osint-publication-candidates/v4616-b103-local-images-public-cz.json`;
const successorPath=`${root}/photo-review-candidates/v4603-b103-local-image-status.json`;
const photoStatusPath=`${root}/photo-review-status.json`;
const runId='engineer-osint-20260902-B103';
const parentRunId='engineer-osint-20260902-B102';
const parentCanonicalSha='5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91';
const expectedCandidateSha='d2888d1023502d4a4be3ae014810e3ea63877a392a35860e858831c827744a8b';
const expectedCanonicalSha='d0cb1692bc105feacb75563dc6c5426e1a7238b3ddff76da5740ba90226d423c';
const expectedVisualIds=['ENG-VIS-LOCAL-0003','ENG-VIS-LOCAL-0004','ENG-VIS-LOCAL-0005','ENG-VIS-LOCAL-0006','ENG-VIS-LOCAL-0016','ENG-VIS-LOCAL-0017','ENG-VIS-LOCAL-0022','ENG-VIS-LOCAL-0028','ENG-VIS-LOCAL-0029'];
const sha256=text=>createHash('sha256').update(text).digest('hex');
const run=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});

const reconstructB102=(temp)=>{
  const tempRoot=join(temp,root);
  const manifestPath=join(tempRoot,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(manifest.runs.at(-1)?.run_id!==runId)return;
  const entry=manifest.runs.pop();
  assert.equal(entry.run_id,runId);
  assert.equal(entry.parent_run_id,parentRunId);
  assert.equal(entry.canonical_sha256,expectedCanonicalSha);
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  rmSync(join(tempRoot,'data/runs',`${runId}.json`),{force:true});
  const restored=loadCanonicalRunStore({root:tempRoot});
  assert.equal(restored.report.current_run_id,parentRunId);
  assert.equal(restored.report.canonical_sha256,parentCanonicalSha);
};

test('v4.6.18 pre-authorization simulation materializes exact V4616 B103 and passes the real PUBLIC-CZ ratchet',()=>{
  const raw=readFileSync(candidatePath,'utf8');
  const candidate=JSON.parse(raw);
  assert.equal(sha256(raw),expectedCandidateSha);
  assert.equal(candidate.state.run_id,runId);
  assert.equal(candidate.state.parent_run_id,parentRunId);
  assert.equal(candidate.visuals.length,9);
  assert.deepEqual(candidate.visuals.map(item=>item.id),expectedVisualIds);
  assert.ok(candidate.visuals.every(item=>typeof item.title_cs==='string'&&item.title_cs.trim()));

  const live=loadCanonicalRunStore({root});
  if(live.report.current_run_id===parentRunId){
    assert.equal(live.report.canonical_sha256,parentCanonicalSha);
    assert.equal(canonicalDigest(applyStrictPatchToCanonicalData(live.data,candidate)),expectedCanonicalSha);
  } else {
    assert.equal(live.report.current_run_id,runId,'canonical head is outside exact B102→B103 lifecycle');
    assert.equal(live.report.canonical_sha256,expectedCanonicalSha);
  }

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4618-preauth-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    reconstructB102(temp);
    const authRel=`${root}/.v4618-b103-preauth-simulation-authorization.json`;
    const auth={
      schema_version:'engineer-osint-b103-preauthorization-simulation-v1',
      status:'READY_FOR_APPEND',
      candidate_path:candidatePath,
      candidate_run_id:runId,
      expected_parent_run_id:parentRunId,
      expected_parent_canonical_sha256:parentCanonicalSha,
      exact_candidate_file_sha256:expectedCandidateSha,
      expected_resulting_canonical_sha256:expectedCanonicalSha,
      authorized_guard_successor_contract:{
        guarded_run_id:runId,
        authorization_path:authRel,
        schema_version:'engineer-osint-b103-preauthorization-simulation-v1',
        required_status:'READY_FOR_APPEND',
        require_exact_candidate_hashes:true,
        allow_wildcard_or_current_state_acceptance:false
      },
      authorization:{
        append_exact_candidate_only:true,
        standard_append_run_write_required:true,
        one_run_only:true,
        isolated_review_branch_required:true,
        execution_requires_separate_slice:true,
        allow_manual_manifest_or_hash_edit:false,
        allow_future_run_same_slice:false,
        allow_canonical_history_rewrite:false
      }
    };
    writeFileSync(join(temp,authRel),JSON.stringify(auth,null,2)+'\n');

    const appendOutput=run(temp,`${root}/append-run.mjs`,candidatePath,'--write','--authorization',authRel);
    const appendPlan=JSON.parse(appendOutput);
    assert.equal(appendPlan.status,'APPENDED');
    assert.equal(appendPlan.entry.run_id,runId);
    assert.equal(appendPlan.entry.parent_run_id,parentRunId);
    assert.equal(appendPlan.entry.parent_canonical_sha256,parentCanonicalSha);
    assert.equal(appendPlan.entry.file_sha256,expectedCandidateSha);
    assert.equal(appendPlan.entry.canonical_sha256,expectedCanonicalSha);

    cpSync(join(temp,successorPath),join(temp,photoStatusPath));
    const simulated=loadCanonicalRunStore({root:join(temp,root)});
    assert.equal(simulated.report.current_run_id,runId);
    assert.equal(simulated.report.canonical_sha256,expectedCanonicalSha);

    run(temp,`${root}/build-pages.mjs`);
    run(temp,`${root}/materialize-canonical-media-history.mjs`);
    run(temp,`${root}/audit-public-cz-ui-latest.mjs`);
    const ratchetOutput=run(temp,`${root}/validate-public-cz-regression.mjs`);
    const ratchet=JSON.parse(ratchetOutput);
    assert.equal(ratchet.pass,true);
    assert.equal(ratchet.status,'PUBLIC_CZ_RATCHET_PASS');
    assert.deepEqual(ratchet.new_missing_fields,[]);

    const report=JSON.parse(readFileSync(join(temp,'docs/engineer-osint-dist/public-cz-ui-audit.json'),'utf8'));
    assert.equal(report.current_run_id,runId);
    assert.equal(report.I18N_RENDERING_FAILURE,0);
    assert.equal(report.CS_CONTENT_QUALITY_REVIEW_FIELDS,0);
    for(const id of expectedVisualIds){
      const item=(report.items||[]).find(entry=>entry.id===id);
      assert.ok(item,`PUBLIC-CZ report missing ${id}`);
      assert.ok(!(item.missing_fields||[]).includes('title'),`${id} introduced missing Czech visual title`);
    }

    const photoStatus=JSON.parse(readFileSync(join(temp,photoStatusPath),'utf8'));
    const local=photoStatus.entries.filter(item=>item.status==='LOCAL_IMAGE');
    assert.equal(local.length,9);
    assert.deepEqual(local.map(item=>item.card_id).sort(),['ENG-TECH-0003','ENG-TECH-0004','ENG-TECH-0005','ENG-TECH-0006','ENG-TECH-0016','ENG-TECH-0017','ENG-TECH-0022','ENG-TECH-0028','ENG-TECH-0029']);

    console.log('V4618_B103_PREAUTH_SIMULATION',JSON.stringify({candidate_sha256:expectedCandidateSha,expected_resulting_canonical_sha256:expectedCanonicalSha,public_cz_ratchet:ratchet.status,new_missing_fields:ratchet.new_missing_fields.length,local_image_cards:local.length}));
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});
