import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertHardeningState, historicalBlob, historicalWorkflow} from '../lib/canonical-hardening-successor.mjs';

const recordPath='docs/engineer-osint/CANONICAL_EXECUTOR_HARDENING_20260919.json';
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const blob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');

test('hardening successor is exact, nonexecuting and preserves historical authority bytes',()=>{
  const record=assertHardeningState();
  assert.equal(createHash('sha256').update(readFileSync(recordPath)).digest('hex'),'cefcb81bc4d436be23e4be54ea24e5ee24acbb9f220320794d4cf036eb640601');
  assert.equal(record.schemaVersion,'engineer.canonical-hardening.v1');
  assert.equal(record.authorization.canonicalExecution,false);
  assert.equal(record.authorization.merge,false);
  assert.equal(record.authorization.deploy,false);
  assert.equal(record.historicalAuthorityDisposition,'historical-only-superseded-for-current-execution');
  assert.equal(historicalBlob(workflowPath),'a0c390755bbd38bfbe5d1329155606bb84dc4a93');
  assert.equal(blob(historicalWorkflow()),'a0c390755bbd38bfbe5d1329155606bb84dc4a93');
  const current=readFileSync(workflowPath,'utf8');
  assert.match(current,/contents: read/);
  assert.doesNotMatch(current,/contents: write|uses:|--execute|\bnode\b/);
});

test('hardening rejects one changed successor byte or mixed historical/current state',()=>{
  const record=assertHardeningState();
  for(const item of record.exactSuccessors){
    assert.throws(()=>assertHardeningState(path=>path===item.path?Buffer.from('tampered'):readFileSync(path)),/drift/);
  }
  for(const item of record.historicalAuthorizations){
    assert.throws(()=>assertHardeningState(path=>path===item.path?Buffer.from('{}'):readFileSync(path)),/drift/);
  }
  assert.throws(()=>assertHardeningState(path=>path===workflowPath?Buffer.from(historicalWorkflow()):readFileSync(path)),/drift/);
});
