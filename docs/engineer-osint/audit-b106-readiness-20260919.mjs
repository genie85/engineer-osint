// Read-only readiness evidence. Never an append authorization or execution entrypoint.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {canonicalDigest,parseJsonStrict} from './lib/integrity.mjs';
import {applyStrictPatchToCanonicalData,loadCanonicalRunStore} from './lib/run-store.mjs';
export const BASE='b7d0ff9ecfde01eade12f2c362a3d330a277d7db';
export const REVIEW_PATH='docs/engineer-osint/B106_APPEND_READINESS_REVIEW_20260919.json';
const ROOT='docs/engineer-osint';
const CANDIDATE=ROOT+'/osint-publication-candidates/v4653-b106-wave3-v4588-local-images-public-cz.json';
const CONTRACT_DIGEST='f84d4de36edef51a5077f6dc7fb794b83ef8436dfd1f5e0a995ebb934557c731';
const ALLOWED=[REVIEW_PATH,ROOT+'/audit-b106-readiness-20260919.mjs',ROOT+'/tests/b106-readiness-20260919.test.mjs',ROOT+'/B106_READINESS_REVIEW_20260919.md'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:4*1024*1024}).trim();
function finiteJson(value,depth=0){
 assert.ok(depth<=40,'JSON depth bound');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){assert.ok(Number.isFinite(value),'nonfinite JSON number');return;}
 assert.ok(value&&typeof value==='object','non-JSON value');
 assert.ok(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype,'non-plain JSON object');
 for(const v of Object.values(value))finiteJson(v,depth+1);
}
function exactPayload(a){
 finiteJson(a);
 // All approved values and every nested key are fixed. Extra/missing/unknown
 // grants, type substitutions and wildcard/current-state values change this pin.
 assert.equal(canonicalDigest(a),CONTRACT_DIGEST,'unreviewed exact readiness payload');
}
// Git's NUL-delimited inventory binds every base path, mode, object type and blob.
// The immutable digest is computed from exact base bytes during review, not fetched
// from a remote or historical commit during validation. This proves content identity,
// not branch ancestry, current remote-main freshness or permission to execute.
export function baseInventoryDigest(raw){
 assert.ok(Buffer.isBuffer(raw)&&raw.at(-1)===0,'invalid Git tree inventory');
 const entries=raw.toString('utf8').slice(0,-1).split('\0');
 const baseEntries=entries.filter(entry=>{
  const match=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(entry);
  assert.ok(match,'invalid Git tree entry');
  return !ALLOWED.includes(match[4]);
 });
 return sha(Buffer.from(baseEntries.join('\0')+'\0'));
}
export function loadEvidence(){
 assert.equal(existsSync(ROOT+'/B106_APPEND_AUTHORIZATION_20260919.json'),false,'blocked predecessor artifact must not exist');
 const a=parseJsonStrict(readFileSync(REVIEW_PATH,'utf8'));exactPayload(a);
 const store=loadCanonicalRunStore({root:ROOT});
 const candidate_raw=readFileSync(CANDIDATE,'utf8');const candidate=parseJsonStrict(candidate_raw);
 const pinned_raw=Object.fromEntries([...a.protected_files,...a.local_files].map(x=>[x.path,readFileSync(x.path)]));
 // Only current HEAD objects are required: works in detached fetch-depth:1 CI.
 // Excluding exactly the four review paths must reproduce the pinned base inventory.
 const tree=execFileSync('git',['ls-tree','-r','-z','HEAD']);
 const base_inventory_sha256=baseInventoryDigest(tree);
 const tracked=git('diff','--no-ext-diff','--name-only','HEAD').split('\n').filter(Boolean);
 const untracked=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
 assert.equal(existsSync(ROOT+'/data/runs/'+a.candidate_run_id+'.json'),false,'B106 already exists');
 return {base_inventory_sha256,parent_run_id:store.report.current_run_id,parent_canonical_sha256:store.report.canonical_sha256,candidate_raw,pinned_raw,changed_paths:[...new Set([...tracked,...untracked])],store,resulting_canonical:canonicalDigest(applyStrictPatchToCanonicalData(store.data,candidate))};
}
export function validateReadiness(a,e){
 exactPayload(a);
 assert.equal(e.base_inventory_sha256,a.reviewed_git_inventory_sha256,'stale/unreviewed base inventory');
 assert.equal(e.parent_run_id,a.expected_parent_run_id,'stale parent');
 assert.equal(e.parent_canonical_sha256,a.expected_parent_canonical_sha256,'stale parent hash');
 assert.ok(Array.isArray(e.changed_paths)&&e.changed_paths.every(p=>ALLOWED.includes(p)),'unrelated change');
 assert.equal(sha(e.candidate_raw),a.exact_candidate_file_sha256,'candidate byte drift');
 const candidate=parseJsonStrict(e.candidate_raw);finiteJson(candidate);
 assert.equal(gitBlob(Buffer.from(e.candidate_raw)),a.candidate_git_blob_sha);
 assert.equal(sha(JSON.stringify(candidate,null,2)+'\n'),a.exact_candidate_file_sha256,'normalized append hash drift');
 for(const k of ['canonical_write_authorized','canonical_write_performed','photo_review_status_successor_applied'])assert.equal(candidate.continuity[k],false,'candidate self-authorization');
 const counts=Object.fromEntries(Object.entries(candidate).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]));
 assert.deepEqual(counts,a.expected_counts);assert.deepEqual(candidate.state.counts,a.expected_state_counts);
 assert.deepEqual(candidate.updated_records.map(x=>x.id),a.expected_card_ids);assert.deepEqual(candidate.visuals.map(x=>x.id),a.expected_visual_ids);
 for(const p of [...a.protected_files,...a.local_files]){
  const raw=e.pinned_raw[p.path];assert.ok(Buffer.isBuffer(raw),'missing pinned bytes');
  assert.equal(sha(raw),p.sha256,p.path+' byte drift');assert.equal(gitBlob(raw),p.git_blob_sha,p.path+' blob drift');
 }
 const successor=parseJsonStrict(e.pinned_raw[a.photo_review_status_successor.successor_path].toString());
 for(const id of a.expected_card_ids)assert.equal(successor.entries.find(x=>x.card_id===id)?.status,'LOCAL_IMAGE');
 assert.equal(candidate.state.run_id,a.candidate_run_id,'candidate run mismatch');
 assert.equal(candidate.state.parent_run_id,a.expected_parent_run_id,'candidate parent mismatch');
 assert.equal(e.store.report.current_run_id,a.expected_parent_run_id,'store parent mismatch');
 assert.equal(e.store.report.canonical_sha256,a.expected_parent_canonical_sha256,'store parent hash mismatch');
 const resultingCanonical=canonicalDigest(applyStrictPatchToCanonicalData(e.store.data,candidate));
 assert.equal(resultingCanonical,a.expected_resulting_canonical_sha256);assert.equal(e.resulting_canonical,resultingCanonical);
 return {readiness_payload_valid:true,resulting_canonical:resultingCanonical,execution_allowed:false,B106_EXECUTION_PERFORMED:false,blocker:'SEPARATE_STRICT_EXECUTION_AUTHORIZATION_AND_V4697_RECOVERY_REQUIRED'};
}
export function assertExecutionClosed(a,context){
 exactPayload(a);
 assert.ok(!['authorization','readiness'].includes(context.slice),'same-slice execution forbidden');
 throw new Error('V4697 recovery/final-state QA receipt absent; readiness evidence grants zero execution authority');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,2,'read-only audit accepts no execution arguments');
 const a=parseJsonStrict(readFileSync(REVIEW_PATH,'utf8'));
 console.log(JSON.stringify(validateReadiness(a,loadEvidence()),null,2));
}
