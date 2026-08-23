import {join} from 'node:path';
import {loadValidatedPatchHistory} from './lib/integrity.mjs';

const source='docs/engineer-osint';
const {report}=loadValidatedPatchHistory({
  patchPath:join(source,'b11-patch.json'),
  manifestPath:join(source,'history-integrity-baseline.json')
});
console.log(JSON.stringify(report,null,2));
