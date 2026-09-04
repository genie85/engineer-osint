import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadCanonicalRunStore} from '../lib/run-store.mjs';

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
const sha256=text=>createHash('sha256').update(text).digest('hex');
const runNode=(cwd,script,...args)=>execFileSync(process.execPath,[script,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const findBrowser=()=>{
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    try{return execFileSync('which',[name],{encoding:'utf8'}).trim();}catch{}
  }
  return '';
};

const normalizeDom=source=>{
  const bilingual=/(?<open><(?<tag>[A-Za-z][A-Za-z0-9:-]*)\b(?=[^>]*\bdata-label-cs="(?<cs>[^"]*)")(?=[^>]*\bdata-label-en="(?<en>[^"]*)")[^>]*>)(?<text>[^<>]*)(?<close><\/\k<tag>>)/gi;
  const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,'\u00a0');
  let s=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  s=s.replace(bilingual,(whole,...args)=>{
    const groups=args.at(-1);
    const text=decode(groups.text).trim();
    const cs=decode(groups.cs).trim();
    const en=decode(groups.en).trim();
    return [cs.toLocaleLowerCase(),en.toLocaleLowerCase()].includes(text.toLocaleLowerCase())
      ? groups.open+groups.cs+groups.close
      : whole;
  });
  return s.replace(/\s+/g,' ').trim();
};

const reconstructB102=(temp)=>{
  const tempRoot=join(temp,root);
  const manifestPath=join(tempRoot,'data/run-store-manifest.json');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
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
    assert.equal(entry.file_sha256,expectedCandidateSha);
    assert.equal(entry.canonical_sha256,expectedCanonicalSha);
    rmSync(join(tempRoot,'data/runs',`${runId}.json`),{force:true});
  }
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  const restored=loadCanonicalRunStore({root:tempRoot});
  assert.equal(restored.report.current_run_id,parentRunId);
  assert.equal(restored.report.canonical_sha256,parentCanonicalSha);
};

test('v4.6.20 discovers the exact normalized browser DOM digest for simulated PUBLIC-CZ-safe B103 without authoritative writes',()=>{
  const browser=findBrowser();
  assert.ok(browser,'B103 browser-digest discovery requires Chrome/Chromium');
  const candidateRaw=readFileSync(candidatePath,'utf8');
  assert.equal(sha256(candidateRaw),expectedCandidateSha);

  const live=loadCanonicalRunStore({root});
  if(live.report.current_run_id===b104RunId)assert.equal(live.report.canonical_sha256,b104CanonicalSha);
  else assert.ok([parentRunId,runId].includes(live.report.current_run_id),`unexpected live run ${live.report.current_run_id}`);

  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4620-browser-'));
  try{
    cpSync(root,join(temp,root),{recursive:true});
    reconstructB102(temp);
    const authRel=`${root}/.v4620-b103-browser-discovery-authorization.json`;
    const auth={
      schema_version:'engineer-osint-b103-browser-digest-discovery-v1',
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
        schema_version:'engineer-osint-b103-browser-digest-discovery-v1',
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
    const appendPlan=JSON.parse(runNode(temp,`${root}/append-run.mjs`,candidatePath,'--write','--authorization',authRel));
    assert.equal(appendPlan.status,'APPENDED');
    assert.equal(appendPlan.entry.run_id,runId);
    assert.equal(appendPlan.entry.canonical_sha256,expectedCanonicalSha);
    cpSync(join(temp,successorPath),join(temp,photoStatusPath));

    runNode(temp,`${root}/build-pages.mjs`);
    runNode(temp,`${root}/materialize-canonical-media-history.mjs`);
    const distPath=join(temp,'docs/engineer-osint-dist/index.html');
    const mediaJs=readFileSync(join(temp,root,'media-source-materialization.js'),'utf8');
    assert.ok(!/<\/script/i.test(mediaJs),'unsafe literal </script in media source module');
    let html=readFileSync(distPath,'utf8');
    const anchor='<script id="engineer-ui-phase7-media-module">';
    if(!html.includes('engineer-media-source-materialization')){
      const script=`<script id="engineer-media-source-materialization">${mediaJs}</script>`;
      html=html.includes(anchor)?html.replace(anchor,script+anchor):html.replace('</body>',script+'</body>');
      writeFileSync(distPath,html);
    }

    const dom=execFileSync(browser,[
      '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=5000','--dump-dom',`file://${distPath}`
    ],{encoding:'utf8',maxBuffer:32*1024*1024});
    assert.ok(dom.includes('<html'));
    assert.ok(dom.includes('ENGINEER OSINT'));
    assert.ok(!dom.includes('engineer-data-integrity-identity-fixes-module'));
    assert.ok(dom.includes('engineer-overlay-transition-runtime-guard-module'));
    const normalized=normalizeDom(dom);
    const digest=sha256(normalized);
    assert.equal(digest,'68892883c8acc3dbdd7d9acc2e2d48682ac61008ad8b8a49f55c01fbef71e87a');
    console.log('V4620_B103_BROWSER_DIGEST_DISCOVERY',JSON.stringify({run_id:runId,normalized_dom_sha256:digest,candidate_sha256:expectedCandidateSha,canonical_sha256:expectedCanonicalSha}));
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});
