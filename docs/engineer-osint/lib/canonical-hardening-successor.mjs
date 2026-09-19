// Exact current hardening state, with a historical projection for old contracts.
// This grants no execution, merge or deployment authority.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,resolve} from 'node:path';

const recordPath='docs/engineer-osint/CANONICAL_EXECUTOR_HARDENING_20260919.json';
const workflowPath='.github/workflows/authorized-canonical-executor.yml';
const blob=raw=>createHash('sha1').update(`blob ${Buffer.byteLength(raw)}\0`).update(raw).digest('hex');

export function assertHardeningState(read=readFileSync){
  const record=JSON.parse(read(recordPath));
  if(record.schemaVersion!=='engineer.canonical-hardening.v1' ||
     record.authorization.canonicalExecution!==false || record.authorization.merge!==false ||
     record.authorization.deploy!==false || record.authorization.wildcardSuccessors!==false ||
     record.historicalAuthorityDisposition!=='historical-only-superseded-for-current-execution')throw Error('hardening authorization drift');
  const paths=record.exactSuccessors.map(x=>x.path);
  if(new Set(paths).size!==paths.length || !paths.includes(workflowPath))throw Error('hardening inventory drift');
  for(const item of record.exactSuccessors){
    if(blob(read(item.path))!==item.successorGitBlob)throw Error(`hardening successor drift: ${item.path}`);
  }
  for(const item of record.historicalAuthorizations){
    if(blob(read(item.path))!==item.gitBlob)throw Error(`historical authorization drift: ${item.path}`);
  }
  if(blob(record.historicalWorkflow)!==record.exactSuccessors.find(x=>x.path===workflowPath).sourceGitBlob)throw Error('historical workflow drift');
  return record;
}

export function historicalBlob(path){
  const record=assertHardeningState();
  const normalized=relative(process.cwd(),resolve(path)).split('\\').join('/');
  const item=record.exactSuccessors.find(x=>x.path===normalized);
  // Projection is allowed only after every successor and historical record matched.
  // Unknown or partially applied successors never reach this branch.
  return item?.sourceGitBlob ?? blob(readFileSync(path));
}

export function historicalWorkflow(){
  return assertHardeningState().historicalWorkflow;
}
