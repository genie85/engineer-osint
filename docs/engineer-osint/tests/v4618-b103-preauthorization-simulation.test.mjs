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
const b104RunId='engineer-osint-20260903-B104';
const b104CanonicalSha='0a71da742be00282d4f286bff689c8662fa5e36aca2a68c3e07180a92ae67bca';
const b104CandidateSha='0ee11a836cd5b60bd969caf0a2591d94be66eaf24bbc9de25993f0490850e4e9';
const b105RunId='engineer-osint-20260904-B105';
const b105CanonicalSha='a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9';
const b105CandidateSha='94fcedd0590f75428b7c85e3056c52e7624afab4f920ff4053f39929b3afab0f';
const expectedVisualIds=['ENG-VIS-LOCAL-0003','ENG-VIS-LOCAL-0004','ENG-VIS-LOCAL-0005','ENG-VIS-LOCAL-0006','ENG-VIS-LOCAL-0016','ENG-VIS-LOCAL-0017','ENG-VIS-LOCAL-0022','ENG-VIS-LOCAL-0028','ENG-VIS-LOCAL-0029'];
const sha256=text=>createHash('sha256').update(text).digest('hex');
const run=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});

const reconstructB102=(temp)=>{
  const tempRoot=join(temp,root);
  const manifestPath=join(tempRoot,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(manifest.runs.at(-1)?.run_id===b105RunId){
    const entry=manifest.runs.pop();
    assert.equal(entry.parent_run_id,b104RunId);
    assert.equal(entry.parent_canonical_sha256,b104CanonicalSha);
    assert.equal(entry.file_sha256,b105CandidateSha);
    assert.equal(entry.canonical_sha256,b105CanonicalSha);
    rmSync(join(tempRoot,'data/runs',`${b105RunId}.json`),{force:true});
  }
  if(manifest.runs.at(-1)?.run_id===b104RunId){
    const entry=manifest.runs.pop();
    assert.equal(entry.run_id,b104RunId);
    assert.equal(entry.parent_run_id,runId);
    assert.equal(entry.parent_canonical_sha256,expectedCanonicalSha);
    assert.equal(entry.file_sha256,b104CandidateSha);
    assert.equal(entry.canonical_sha256,b104CanonicalSha);
    rmSync(join(tempRoot,'data/runs',`${b104RunId}.json`),{force:true});
  }
  if(manifest.runs.at(-1)?.run_id===runId){
    const entry=manifest.runs.pop();
    assert.equal(entry.run_id,runId);
    assert.equal(entry.parent_run_id,parentRunId);
    assert.equal(entry.canonical_sha256,expectedCanonicalSha);
    assert.equal(entry.file_sha256,expectedCandidateSha);
    rmSync(join(tempRoot,'data/runs',`${runId}.json`),{force:true});
  }
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const restored=loadCanonicalRunStore({root:tempRoot});
  assert.equal(restored.report.current_run_id,parentRunId);
  assert.equal(restored.report.canonical_sha256,parentCanonicalSha);
};

// Historical discovery must not weaken the production write dispatcher. Validate the exact
// candidate through append-run dry-run, then materialize only inside the disposable fixture.
const materializeHistoricalDryRun=(temp)=>{
  const tempRoot=join(temp,root);
  const plan=JSON.parse(run(temp,`${root}/append-run.mjs`,candidatePath));
  assert.equal(plan.status,'VALIDATED_DRY_RUN');
  assert.equal(plan.entry.run_id,runId);
  assert.equal(plan.entry.parent_run_id,parentRunId);
  assert.equal(plan.entry.parent_canonical_sha256,parentCanonicalSha);
  assert.equal(plan.entry.file_sha256,expectedCandidateSha);
  assert.equal(plan.entry.canonical_sha256,expectedCanonicalSha);
  const manifestPath=join(tempRoot,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  assert.equal(manifest.runs.at(-1)?.run_id,parentRunId);
  const candidate=JSON.parse(readFileSync(join(temp,candidatePath),'utf8'));
  const normalized=JSON.stringify(candidate,null,2)+'\n';
  assert.equal(sha256(normalized),plan.entry.file_sha256);
  writeFileSync(join(tempRoot,plan.entry.path),normalized);
  manifest.runs.push(plan.entry);
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const verified=loadCanonicalRunStore({root:tempRoot});
  assert.equal(verified.report.current_run_id,runId);
  assert.equal(verified.report.canonical_sha256,expectedCanonicalSha);
  return plan;
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
  } else if(live.report.current_run_id===runId){
    assert.equal(live.report.canonical_sha256,expectedCanonicalSha);
  } else if(live.report.current_run_id===b105RunId){
    assert.equal(live.report.canonical_sha256,b105CanonicalSha);
    const b104Entry=live.manifest.runs.find(item=>item.run_id===b104RunId);
    assert.ok(b104Entry,'exact B104 ancestor missing beneath B105');
    assert.equal(b104Entry.canonical_sha256,b104CanonicalSha);
  } else {
    assert.equal(live.report.current_run_id,b104RunId,'canonical head is outside exact B102→B103→B104→B105 lifecycle');
    assert.equal(live.report.canonical_sha256,b104CanonicalSha);
    const b103Entry=live.manifest.runs.find(item=>item.run_id===runId);
    assert.ok(b103Entry,'exact B103 ancestor missing beneath B104');
    assert.equal(b103Entry.file_sha256,expectedCandidateSha);
    assert.equal(b103Entry.canonical_sha256,expectedCanonicalSha);
  }

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4618-preauth-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    reconstructB102(temp);
    const appendPlan=materializeHistoricalDryRun(temp);
    assert.equal(appendPlan.status,'VALIDATED_DRY_RUN');

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
