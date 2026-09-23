// Local transport/inspection PoC. No execution, network, config or Git-ref writes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Reuse the unchanged strict fixture validator through a portable relative import.
import {createRootInspection,rootGitTree} from '../lib/canonical-hardening-successor.mjs';
const oid=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x)&&x!=='0'.repeat(40);
const object=(type,b)=>createHash('sha1').update(`${type} ${b.length}\0`).update(b).digest('hex');
const sha=b=>createHash('sha256').update(b).digest('hex');
function notes({approvedNotesCommit,fetchedNotesCommit,checkedTree,noteInventory}){
 assert.ok(oid(approvedNotesCommit),'independently approved notes commit required');
 assert.ok(oid(fetchedNotesCommit)&&fetchedNotesCommit===approvedNotesCommit,'mutable/replaced notes ref');
 assert.ok(oid(checkedTree),'exact checked-out tree required');
 assert.ok(Buffer.isBuffer(noteInventory)&&noteInventory.length>0&&noteInventory.length<=1048576&&noteInventory.at(-1)===0,'invalid notes tree');
 const seen=new Set(),rows=[];let target;
 for(const row of noteInventory.toString('utf8').slice(0,-1).split('\0')){
  const match=/^100644 blob ([a-f0-9]{40})\t((?:[a-f0-9]{2}\/)*[a-f0-9]{2,40})$/.exec(row);
  assert.ok(match,'invalid note path/mode/type');
  const annotated=match[2].replaceAll('/','');assert.ok(oid(annotated)&&!seen.has(annotated),'ambiguous note object');seen.add(annotated);
  rows.push({path:match[2],mode:'100644',type:'blob',blob:match[1],sha256:'0'.repeat(64)});
  if(annotated===checkedTree)target=match[1];
 }
 assert.ok(target,'no note for exact checked-out tree');
 return {target,rows:rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)};
}
// Legacy narrow helper: validates an inventory/blob supplied by the caller.
// Only verifyInspectionCarrier below authenticates that inventory to commit bytes.
export function verifyCarrier(input){
 const {target}=notes(input),raw=input.readBlob(target);
 assert.ok(Buffer.isBuffer(raw)&&raw.length>0&&raw.length<=4194304,'bounded raw fixture blob required');
 assert.equal(object('blob',raw),target,'modified fixture blob');
 return Buffer.from(raw);
}
export function verifyInspectionCarrier(input){
 assert.equal(input.mode,'inspection','inspection only; never execution authority');
 const {rows}=notes(input),commit=input.notesCommitRaw;
 assert.ok(Buffer.isBuffer(commit)&&commit.length>0&&commit.length<=65536,'bounded notes commit object required');
 assert.equal(object('commit',commit),input.approvedNotesCommit,'notes commit object mismatch');
 const tree=/^tree ([a-f0-9]{40})\n/.exec(commit.toString('utf8'));
 assert.ok(tree&&commit.includes(Buffer.from('\n\n')),'invalid notes commit object');
 assert.equal(rootGitTree(rows),tree[1],'notes tree object mismatch');
 const raw=verifyCarrier(input);
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw Error('invalid UTF-8 fixture');}
 assert.ok(Buffer.from(text,'utf8').equals(raw),'noncanonical UTF-8 fixture');
 assert.ok(input.sourceCheckout&&input.sourceCheckout.files instanceof Map,'source checkout required');
 // This SHA is a digest of already authenticated bytes, NOT a new approval:
 // independent pin -> actual commit -> actual notes tree -> raw fixture blob.
 const ctx=createRootInspection(text,sha(raw),input.sourceCheckout.files);
 const grant=JSON.parse(text); // strict duplicate-aware/canonical parser already ran above
 assert.equal(input.sourceCheckout.commit,grant.sourceCommit,'source checkout commit mismatch');
 assert.equal(input.sourceCheckout.tree,grant.sourceTree,'source checkout tree mismatch');
 const target=grant.targets.find(t=>t.tree===input.checkedTree);
 assert.ok(target,'exact target tree required; no SOURCE fallback');
 const inspected=ctx.verify(input.checkedFiles);
 assert.equal(inspected.stage,target.name,'checkout stage/tree mismatch');
 assert.equal(inspected.execution_allowed,false);
 // Do not install the context or expose its projection methods to the caller.
 return Object.freeze({stage:inspected.stage,checked_tree:input.checkedTree,
  notes_commit:input.approvedNotesCommit,fixture_sha256:sha(raw),fixture_only:true,
  execution_allowed:false,grants:Object.freeze({...grant.grants})});
}
