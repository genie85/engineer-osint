// Read-only historical evidence for one externally bound descendant vector.
// This proposal never grants implementation, canonical writes or execution.
import assert from 'node:assert/strict';
import {readFileSync as nativeRead,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,resolve} from 'node:path';
import {b106GitInventory} from './canonical-hardening-successor.mjs';
import {parseJsonStrict} from './integrity.mjs';
const path='docs/engineer-osint/B106_DESCENDANT_PROPOSAL_20260920.json';
const expectedRecordSha='2f3dcf87e478579efa211762d6f1eec6c80e023f752cf39c29fd5dbf00801d64';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
function parse(raw){
 assert.equal(typeof raw,'string');assert.equal(sha(raw),expectedRecordSha,'unreviewed descendant record');
 const a=parseJsonStrict(raw,{maxBytes:4194304,maxDepth:30});
 assert.equal(raw,JSON.stringify(a,null,2)+'\n');assert.equal(a.approved,false);
 assert.ok(Object.values(a.grants).every(v=>v===false));return a;
}
export function validateDescendantVector(files,raw){
 const a=parse(raw);assert.ok(files instanceof Map);assert.equal(files.size,a.vector.length,'descendant vector size');
 let source=true,successor=true;
 for(const x of a.vector){const f=files.get(x.path);assert.ok(f,'missing descendant '+x.path);assert.equal(f.mode,x.mode);assert.equal(f.type,x.type);assert.ok(Buffer.isBuffer(f.raw));const b=blob(f.raw),h=sha(f.raw);source&&=b===x.sourceBlob&&h===x.sourceSha256;successor&&=b===x.targetBlob&&h===x.targetSha256;}
 assert.ok(source!==successor,'mixed/third descendant vector');return {stage:source?'SOURCE':'SUCCESSOR',execution_allowed:false,fixture_only:true};
}
let verifiedVectorSignature=null;
export function readDescendantEvidence(p,...args){
 // Complete root proof precedes the compatibility view. Without an external fixture,
 // only a clean exact SOURCE inventory is admissible; the inert proposal is insufficient.
 assert.equal(typeof p,'string');p=relative(process.cwd(),resolve(p));assert.ok(!p.startsWith('/')&&!p.split('/').some(x=>x==='..'||x==='.'),'unsafe evidence path');
 const raw=nativeRead(path,'utf8'),a=parse(raw),i=b106GitInventory();
 assert.deepEqual(i.changed,[],'descendant requires complete external root proof');
 assert.equal(sha(i.tree),a.sourceInventorySha256,'descendant stale root inventory');
 const stats=a.vector.map(x=>{const s=lstatSync(x.path,{bigint:true});assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n,'aliased descendant');return s;});
 const signature=stats.map(s=>[s.dev,s.ino,s.mode,s.size,s.mtimeNs,s.ctimeNs].join(':')).join('|');
 if(signature!==verifiedVectorSignature){
  const files=new Map(a.vector.map((x,j)=>[x.path,{mode:(stats[j].mode&0o111n)?'100755':'100644',type:'blob',raw:nativeRead(x.path)}]));
  validateDescendantVector(files,raw);verifiedVectorSignature=signature;
 }
 const x=a.vector.find(x=>x.path===p),live=nativeRead(p,...args);
 if(!x)return live;
 const bytes=Buffer.isBuffer(live)?live:Buffer.from(live);
 // b106GitInventory's installed root fixture has already verified every live mode,
 // type, path and byte, including this module, the proposal and all dynamic consumers.
 assert.ok([x.sourceSha256,x.targetSha256].includes(sha(bytes)),'third evidence bytes');
 let original=bytes;
 if(x.recipe&&sha(bytes)===x.targetSha256){const s=bytes.toString('utf8');assert.equal(s.split(x.recipe.new).length-1,x.recipe.count,'ambiguous reverse recipe');original=Buffer.from(s.split(x.recipe.new).join(x.recipe.old));}
 assert.equal(sha(original),x.sourceSha256,'reverse proof');assert.equal(blob(original),x.sourceBlob,'reverse blob proof');
 return typeof live==='string'?original.toString('utf8'):original;
}
