import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const base='fe77207a555152e11830fd119ac1717de5eb8448';
const path='docs/engineer-osint/audit-public-cz-ui.mjs';
let src=execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8',maxBuffer:4*1024*1024});
const old="'i18n-content-cs-public-cz-0633.js','i18n-content-cs-public-cz-backlog.js'";
const replacement="'i18n-content-cs-public-cz-0633.js','i18n-content-cs-public-cz-1746.js','i18n-content-cs-public-cz-backlog.js'";
if(!src.includes(old))throw new Error('PUBLIC-CZ diagnostic audit: module anchor missing');
src=src.replace(old,replacement);
const tmp='/tmp/audit-public-cz-ui-1746.mjs';
writeFileSync(tmp,src,'utf8');
await import(pathToFileURL(tmp).href+`?v=${Date.now()}`);
