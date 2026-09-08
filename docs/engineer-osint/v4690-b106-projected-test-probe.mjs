import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,mkdirSync,mkdtempSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repoRoot=resolve(here,'../..');
const root='docs/engineer-osint';
const candidatePath=`${root}/osint-publication-candidates/v4690-b106-wave3-v4588-local-images-public-cz.json`;
const lifecycleSourcePath=`${root}/photo-review-batches/v4588.json`;
const lifecycleSuccessorPath=`${root}/photo-review-candidates/v4690-b106-v4588-local-image-status.json`;
const runId='engineer-osint-20260904-B106';
const parentRun='engineer-osint-20260904-B105';
const parentCanonical='a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9';
const resultingCanonical='9d7b818412b0d94724dc24a8212180b95046d290c872f349a61cc9681e835bcd';
const expectedCandidateSha256='09aeb6938aaa73955d07152152f2b304f8d7676384fa5ff1c9da242b40054db0';
const expectedSuccessorGitBlob='87205d41d6169d9ef646fd7dcbc6c912366ca36c';
const sha256=v=>createHash('sha256').update(v).digest('hex');
const gitBlob=v=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${v.length}\0`),v])).digest('hex');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const jsonRaw=value=>JSON.stringify(value,null,2)+'\n';

const discovery=execFileSync(process.execPath,[`${root}/v4690-b106-readonly-discovery.mjs`],{
  cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:128*1024*1024
});
const candidateMatch=discovery.match(/^V4690_B106_CANDIDATE_BASE64 (.+)$/m);
const successorMatch=discovery.match(/^V4690_B106_SUCCESSOR_BASE64 (.+)$/m);
const summaryMatch=discovery.match(/^V4690_B106_DISCOVERY (.+)$/m);
assert(candidateMatch&&successorMatch&&summaryMatch,'unable to parse authoritative V4690 discovery output');
const summary=JSON.parse(summaryMatch[1]);
assert(summary.status==='PASS','authoritative discovery did not PASS');
assert(summary.resulting_canonical_sha256===resultingCanonical,'resulting canonical digest drift');
const candidateRaw=Buffer.from(candidateMatch[1],'base64');
const successorRaw=Buffer.from(successorMatch[1],'base64');
assert(sha256(candidateRaw)===expectedCandidateSha256,'candidate SHA-256 drift');
assert(gitBlob(candidateRaw)==='84869ea44a95b6bf41ac15714c075f06ae211365','candidate Git blob drift');
assert(gitBlob(successorRaw)===expectedSuccessorGitBlob,'lifecycle successor Git blob drift');

const temp=mkdtempSync(join(tmpdir(),'engineer-osint-v4690-probe-'));
try{
  cpSync(resolve(repoRoot,root),resolve(temp,root),{recursive:true});
  const candidateFull=resolve(temp,candidatePath);
  const successorFull=resolve(temp,lifecycleSuccessorPath);
  mkdirSync(dirname(candidateFull),{recursive:true});
  mkdirSync(dirname(successorFull),{recursive:true});
  writeFileSync(candidateFull,candidateRaw);
  writeFileSync(successorFull,successorRaw);

  const authPath=`${root}/.v4690-b106-probe-authorization.json`;
  const schema='engineer-osint-v4690-b106-probe-v1';
  const auth={
    schema_version:schema,
    status:'READY_FOR_APPEND',
    candidate_path:candidatePath,
    candidate_run_id:runId,
    expected_parent_run_id:parentRun,
    expected_parent_canonical_sha256:parentCanonical,
    exact_candidate_file_sha256:expectedCandidateSha256,
    expected_resulting_canonical_sha256:resultingCanonical,
    authorized_guard_successor_contract:{
      guarded_run_id:runId,
      authorization_path:authPath,
      schema_version:schema,
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
  const authFull=resolve(temp,authPath);mkdirSync(dirname(authFull),{recursive:true});writeFileSync(authFull,jsonRaw(auth));
  const appended=JSON.parse(execFileSync(process.execPath,[`${root}/append-run.mjs`,candidatePath,'--write','--authorization',authPath],{
    cwd:temp,encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:64*1024*1024
  }));
  assert(appended.status==='APPENDED','projected B106 append failed');
  cpSync(successorFull,resolve(temp,lifecycleSourcePath));

  const testDir=resolve(temp,root,'tests');
  const tests=readdirSync(testDir).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`${root}/tests/${name}`);
  assert(tests.length>0,'no P0/P1 tests discovered');
  const result=spawnSync(process.execPath,['--test',...tests],{
    cwd:temp,encoding:'utf8',maxBuffer:256*1024*1024,env:{...process.env,GITHUB_SHA:''}
  });
  process.stdout.write(`V4690_B106_PROJECTED_TEST_COUNT ${tests.length}\n`);
  process.stdout.write(`V4690_B106_PROJECTED_TEST_EXIT ${result.status}\n`);
  if(result.stdout)process.stdout.write(result.stdout);
  if(result.stderr)process.stderr.write(result.stderr);
  if(result.error)throw result.error;
  if(result.status===0){
    process.stdout.write('V4690_B106_PROJECTED_P0P1 PASS\n');
  }else{
    process.stdout.write('V4690_B106_PROJECTED_P0P1 EXPECTED_COMPATIBILITY_FAILURES_DETECTED\n');
  }
} finally {
  rmSync(temp,{recursive:true,force:true});
}
