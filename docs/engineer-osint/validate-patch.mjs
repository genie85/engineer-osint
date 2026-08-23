import {loadCanonicalRunStore} from './lib/run-store.mjs';

const {report}=loadCanonicalRunStore({root:'docs/engineer-osint'});
console.log(JSON.stringify(report,null,2));
