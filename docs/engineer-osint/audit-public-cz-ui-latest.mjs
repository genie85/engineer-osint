import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const canonical='docs/engineer-osint/audit-public-cz-ui.mjs';
const generated='docs/engineer-osint/.audit-public-cz-ui-latest.generated.mjs';
const src=readFileSync(canonical,'utf8');
const needle="'i18n-content-cs-public-cz-0633.js','i18n-content-cs-public-cz-backlog.js'";
const replacement="'i18n-content-cs-public-cz-0633.js','i18n-content-cs-public-cz-1746.js','i18n-content-cs-public-cz-1817.js','i18n-content-cs-public-cz-1834.js','i18n-content-cs-public-cz-backlog.js'";
if(!src.includes(needle))throw new Error('PUBLIC_CZ_UI_LATEST: canonical module-list anchor missing');
const patched=src.replace(needle,replacement);
writeFileSync(generated,patched,'utf8');
try{
  await import(pathToFileURL(generated).href+'?v='+Date.now());
}finally{
  try{unlinkSync(generated)}catch{}
}
