import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const sourceRoot='docs/engineer-osint';
const sourcePersisted=`${sourceRoot}/data/runs/engineer-osint-20260902-B102.json`;
const sha256=text=>createHash('sha256').update(text).digest('hex');
const b64=text=>Buffer.from(text,'utf8').toString('base64');

function injectSourceMedia(cwd){
  const p=join(cwd,'docs/engineer-osint-dist/index.html');
  const js=readFileSync(join(cwd,'docs/engineer-osint/media-source-materialization.js'),'utf8');
  if(/<\/script/i.test(js))throw new Error('unsafe literal </script in media source module');
  let h=readFileSync(p,'utf8');
  const anchor='<script id="engineer-ui-phase7-media-module">';
  if(!h.includes('engineer-media-source-materialization')){
    const script=`<script id="engineer-media-source-materialization">${js}</script>`;
    h=h.includes(anchor)?h.replace(anchor,script+anchor):h.replace('</body>',script+'</body>');
  }
  writeFileSync(p,h);
}

function browserDigest(cwd){
  const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(name=>{
    try{return execFileSync('bash',['-lc',`command -v ${name} || true`],{encoding:'utf8'}).trim()}catch{return ''}
  }).find(Boolean);
  if(!browser)return null;
  const htmlPath=join(cwd,'docs/engineer-osint-dist/index.html');
  const dom=execFileSync(browser,[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=5000','--dump-dom',`file://${htmlPath}`
  ],{encoding:'utf8',maxBuffer:64*1024*1024});
  assert.match(dom,/<html/i);
  assert.match(dom,/ENGINEER OSINT/);
  assert.doesNotMatch(dom,/engineer-data-integrity-identity-fixes-module/);
  assert.match(dom,/engineer-overlay-transition-runtime-guard-module/);
  const bilingual=/(?<open><(?<tag>[A-Za-z][A-Za-z0-9:-]*)\b(?=[^>]*\bdata-label-cs="(?<cs>[^"]*)")(?=[^>]*\bdata-label-en="(?<en>[^"]*)")[^>]*>)(?<text>[^<>]*)(?<close><\/(?<closetag>[A-Za-z][A-Za-z0-9:-]*)>)/gi;
  let normalized=dom.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  normalized=normalized.replace(bilingual,(whole,...args)=>{
    const groups=args.at(-1);
    if(!groups||String(groups.tag).toLowerCase()!==String(groups.closetag).toLowerCase())return whole;
    const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
    const text=decode(groups.text),cs=decode(groups.cs),en=decode(groups.en);
    return [cs.toLowerCase(),en.toLowerCase()].includes(text.toLowerCase())?groups.open+groups.cs+groups.close:whole;
  });
  normalized=normalized.replace(/\s+/g,' ').trim();
  return sha256(normalized);
}

test('v4.6.00 precomputes B102 standard-append bytes and browser successor without mutating source canonical state',()=>{
  assert.equal(existsSync(sourcePersisted),false,'B102 must not already be canonical during precompute stage');
  const temp=mkdtempSync(join(tmpdir(),'engineer-osint-b102-'));
  try{
    cpSync('docs',join(temp,'docs'),{recursive:true});
    const candidate='docs/engineer-osint/osint-publication-candidates/v4598-b102.json';
    const plan=JSON.parse(execFileSync(process.execPath,['docs/engineer-osint/append-run.mjs',candidate,'--write'],{cwd:temp,encoding:'utf8',maxBuffer:16*1024*1024}));
    assert.equal(plan.status,'APPENDED');
    assert.deepEqual(plan.entry,{
      run_id:'engineer-osint-20260902-B102',
      parent_run_id:'engineer-osint-20260902-B101',
      parent_canonical_sha256:'146e5039705147f481499487a399f33fc537ecfca01f845b82f8e44306231b6b',
      path:'data/runs/engineer-osint-20260902-B102.json',
      file_sha256:'5a24a0cf6fece6dbf61d9224dddefb6d711b5ab9cbd9690f1c13c963c413781a',
      canonical_sha256:'5621cee336a11959903cca3d0ad40fe54d6eac52482ff0f4db373e3d95fb7f91'
    });
    const runPath=join(temp,'docs/engineer-osint/data/runs/engineer-osint-20260902-B102.json');
    const manifestPath=join(temp,'docs/engineer-osint/data/run-store-manifest.json');
    const runRaw=readFileSync(runPath,'utf8');
    const manifestRaw=readFileSync(manifestPath,'utf8');
    assert.equal(sha256(runRaw),plan.entry.file_sha256);
    const manifest=JSON.parse(manifestRaw);
    assert.deepEqual(manifest.runs.at(-1),plan.entry);

    execFileSync(process.execPath,['docs/engineer-osint/build-pages.mjs'],{cwd:temp,encoding:'utf8',maxBuffer:64*1024*1024});
    execFileSync(process.execPath,['docs/engineer-osint/materialize-canonical-media-history.mjs'],{cwd:temp,encoding:'utf8',maxBuffer:64*1024*1024});
    injectSourceMedia(temp);
    execFileSync(process.execPath,['docs/engineer-osint/audit-persistent-b99-identity.mjs'],{cwd:temp,encoding:'utf8',maxBuffer:64*1024*1024});
    execFileSync(process.execPath,['docs/engineer-osint/audit-identity-fix-retirement.mjs'],{cwd:temp,encoding:'utf8',maxBuffer:64*1024*1024});
    const identity=JSON.parse(readFileSync(join(temp,'docs/engineer-osint-dist/persistent-b99-identity-audit.json'),'utf8'));
    assert.equal(identity.current_run_id,'engineer-osint-20260902-B102');
    assert.equal(identity.status,'PASS');
    const digest=browserDigest(temp);
    if(digest)console.log(`B102_PRECOMPUTED_BROWSER_SHA256=${digest}`);
    else console.log('B102_PRECOMPUTED_BROWSER_SHA256=UNAVAILABLE_LOCAL_BROWSER');
    console.log(`B102_PRECOMPUTED_RUN_B64=${b64(runRaw)}`);
    console.log(`B102_PRECOMPUTED_MANIFEST_B64=${b64(manifestRaw)}`);
    console.log(`B102_PRECOMPUTED_MANIFEST_SHA256=${sha256(manifestRaw)}`);
    console.log(`B102_PRECOMPUTED_IDENTITY_AUDIT_B64=${b64(JSON.stringify(identity,null,2)+'\n')}`);
    assert.equal(existsSync(sourcePersisted),false,'precompute leaked B102 into source canonical state');
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});
