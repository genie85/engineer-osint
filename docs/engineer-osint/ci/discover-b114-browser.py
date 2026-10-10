"""Review-only CI discovery. Import is inert. CLI requires explicit --execute.
No expected B114 digest is accepted; successful measurement grants no authority.
"""
import argparse,hashlib,html,json,os,pathlib,re,shutil,stat,subprocess,tempfile
BASE='f69f42dc562fea05bce5e3085ff347a6ac4407b9'
CANDIDATE='6ff3aaf5c36085d3a21662421508a1a6f2da82a38ad849805e3a53e61f4b6ca4'
PARENT_MANIFEST='d3480581360f8ffc120d951c74a8fd597c19d03cc7e0e2f1e64ed25f492a76c3'
SUCCESSOR_MANIFEST='cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928'
B113_DOM='103ec5f6a6a502cf5b412b1626b74b9c1c523df0078535d36c1ead301b3c7966'
SCRIPTS=['validate-patch.mjs','build-pages.mjs','materialize-canonical-media-history.mjs','INJECT','audit-media-history.mjs','validate-media-coverage.mjs','validate-runtime.mjs','audit-overlay-retirement.mjs','audit-persistent-b99-identity.mjs','audit-identity-fix-retirement.mjs','audit-post-b98-steady-state.mjs','verify-post-b98-pages-readiness.mjs','audit-public-cz-ui-latest.mjs','validate-public-cz-regression.mjs','verify-pages-artifact.mjs']
def require(condition,message):
 if not condition:raise ValueError(message)
def sha(b):return hashlib.sha256(b).hexdigest()
def raw(path):
 p=pathlib.Path(path);s=p.lstat();require(stat.S_ISREG(s.st_mode) and s.st_nlink==1,'nonregular/aliased input');b=p.read_bytes();a=p.lstat();require((s.st_ino,s.st_dev,s.st_size,s.st_mtime_ns)==(a.st_ino,a.st_dev,a.st_size,a.st_mtime_ns),'unstable input');return b

def snapshot(root):
 root=pathlib.Path(root);result={}
 for p in sorted(root.rglob('*')):
  require(not p.is_symlink(),'symlink input')
  if p.is_file():result[p.relative_to(root).as_posix()]=sha(raw(p))
 return result

def disjoint(a,b):
 a=pathlib.Path(a).resolve();b=pathlib.Path(b).resolve();require(a!=b and a not in b.parents and b not in a.parents,'overlapping paths')

def normalize(dom):
 pattern=re.compile(r'(?P<open><(?P<tag>[A-Za-z][A-Za-z0-9:-]*)\b(?=[^>]*\bdata-label-cs="(?P<cs>[^"]*)")(?=[^>]*\bdata-label-en="(?P<en>[^"]*)")[^>]*>)(?P<text>[^<>]*)(?P<close></(?P=tag)>)',re.I)
 def canon(m):
  text=html.unescape(m.group('text')).strip();cs=html.unescape(m.group('cs')).strip();en=html.unescape(m.group('en')).strip()
  return m.group('open')+m.group('cs')+m.group('close') if text.casefold() in {cs.casefold(),en.casefold()} else m.group(0)
 s=re.sub(r'<script\b[^>]*>[\s\S]*?</script>','',dom,flags=re.I);return re.sub(r'\s+',' ',pattern.sub(canon,s)).strip()

def baseline_digest(dom):
 digest=sha(normalize(dom).encode());require(digest==B113_DOM,'B113 exact DOM mismatch');return digest

def sandbox_evidence(dom):
 # Chromium internal diagnostic table; unsupported formats fail closed.
 rows=re.findall(r'<tr\b[^>]*>(.*?)</tr>',dom,re.I|re.S);values={}
 for row in rows:
  cells=re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',row,re.I|re.S)
  if len(cells)==2:values[re.sub('<[^>]+>','',html.unescape(cells[0])).strip()]=re.sub('<[^>]+>','',html.unescape(cells[1])).strip()
 require(values.get('Seccomp-BPF sandbox')=='Yes','Seccomp sandbox not evidenced')
 require(values.get('Namespace sandbox')=='Yes' or values.get('SUID sandbox')=='Yes','sandbox isolation not evidenced')
 return values

def browser_args(browser,profile,url):
 require(url.startswith('file:///') or url=='chrome://sandbox','unsupported navigation')
 return [str(browser),'--user-data-dir='+str(profile),'--headless=new','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=5000','--dump-dom',url]

def run(argv,cwd,env):
 return subprocess.run(argv,cwd=cwd,env=env,check=True,capture_output=True,text=True,timeout=180)

def simulate(checkout,candidate,work,execute=run):
 """Writes only a new disjoint synthetic copy, using strict repo materialization."""
 checkout=pathlib.Path(checkout).resolve();candidate=pathlib.Path(candidate);work=pathlib.Path(work).resolve();disjoint(checkout,work)
 require(not work.exists(),'simulation destination must be new')
 src=checkout/'docs/engineer-osint';before=snapshot(src);candidate_bytes=raw(candidate);require(sha(candidate_bytes)==CANDIDATE,'candidate pin mismatch')
 require(sha(raw(src/'data/run-store-manifest.json'))==PARENT_MANIFEST,'parent manifest mismatch')
 shutil.copytree(src,work/'docs/engineer-osint',symlinks=False)
 require(snapshot(work/'docs/engineer-osint')==before,'copy input mismatch')
 (work/'candidate.json').write_bytes(candidate_bytes)
 helper=pathlib.Path(__file__).with_name('simulate-b114.mjs')
 execute(['node',str(helper),str(work)],work,clean_env(work))
 require(sha(raw(work/'docs/engineer-osint/data/run-store-manifest.json'))==SUCCESSOR_MANIFEST,'successor manifest mismatch')
 require(before==snapshot(src),'source mutation');require(raw(candidate)==candidate_bytes,'candidate mutation')
 return before

def clean_env(work):
 env={k:v for k,v in os.environ.items() if k in ['PATH','LANG','LC_ALL','TZ']}
 for key,name in [('HOME','home'),('TMPDIR','tmp'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache'),('XDG_DATA_HOME','data'),('XDG_RUNTIME_DIR','runtime')]:
  p=pathlib.Path(work)/name;p.mkdir(mode=0o700,parents=True,exist_ok=True);env[key]=str(p)
 return env

def inject(work):
 root=work/'docs/engineer-osint';p=work/'docs/engineer-osint-dist/index.html';h=p.read_text();js=(root/'media-source-materialization.js').read_text();require('</script' not in js.lower(),'unsafe inline script')
 if 'engineer-media-source-materialization' not in h:
  anchor='<script id="engineer-ui-phase7-media-module">';script='<script id="engineer-media-source-materialization">'+js+'</script>';h=h.replace(anchor,script+anchor) if anchor in h else h.replace('</body>',script+'</body>');p.write_text(h)

def discovered(baseline,observed,bindings):
 require(baseline==B113_DOM,'unmatched baseline');require(bool(re.fullmatch('[a-f0-9]{64}',observed)),'invalid observed digest')
 return dict(status='DISCOVERED_NOT_AUTHORIZED',authority_granted=False,canonical_write=False,baseline_observed=baseline,successor_observed=observed,**bindings)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--execute',action='store_true');ap.add_argument('--checkout',required=True);ap.add_argument('--expected-head',required=True);ap.add_argument('--candidate',required=True);ap.add_argument('--browser',required=True);ap.add_argument('--baseline-dom',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
 require(a.execute,'explicit execution opt-in required');require(os.geteuid()!=0,'non-root browser required')
 root=pathlib.Path(a.checkout).resolve();out=pathlib.Path(a.output).resolve();disjoint(root,out);require(not out.exists(),'fresh output required')
 require(bool(re.fullmatch('[a-f0-9]{40}',a.expected_head)),'exact reviewed head required')
 env={**{k:v for k,v in os.environ.items() if not k.startswith('GIT_') and k!='NODE_OPTIONS'},'GIT_NO_REPLACE_OBJECTS':'1','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_SYSTEM':'/dev/null'}
 head=run(['git','rev-parse','HEAD'],root,env).stdout.strip();require(head==a.expected_head,'reviewed head mismatch')
 run(['git','diff','--exit-code','HEAD','--'],root,env)
 browser=pathlib.Path(a.browser).resolve();require(raw(browser)[:4]==b'\x7fELF','native executable required; wrappers refused');browser_hash=sha(raw(browser))
 baseline=baseline_digest(raw(a.baseline_dom).decode());pins=json.loads(pathlib.Path(__file__).with_name('b113-source-pins.json').read_text());src=root/'docs/engineer-osint'
 for name,digest in pins.items():require(sha(raw(src/name))==digest,'baseline source drift: '+name)
 before=snapshot(src)
 allowed={'ci/discover-b114-browser.py','ci/simulate-b114.mjs','ci/b113-source-pins.json','candidates/B114_WASHINGTON_20261010.json'}
 require(set(before)==set(pins)|allowed,'unexpected source file set')
 out.mkdir(parents=True);(out/'status.json').write_text(json.dumps({'status':'RUNNING_NOT_AUTHORIZED'}))
 try:
  work=out/'simulation';simulate(root,a.candidate,work);env=clean_env(work)
  version=run([str(browser),'--version'],work,env).stdout.strip()
  with tempfile.TemporaryDirectory(dir=work,prefix='sandbox-profile-') as profile:
   proof=run(browser_args(browser,profile,'chrome://sandbox'),work,env)
  (out/'sandbox-dom.html').write_text(proof.stdout);sandbox=sandbox_evidence(proof.stdout)
  for script in SCRIPTS:
   if script=='INJECT':inject(work);continue
   result=run(['node','docs/engineer-osint/'+script],work,env);(out/(script+'.log')).write_text(result.stdout+result.stderr)
  require(sha(raw(work/'docs/engineer-osint/data/run-store-manifest.json'))==SUCCESSOR_MANIFEST,'post-build manifest drift')
  htmlpath=work/'docs/engineer-osint-dist/index.html'
  with tempfile.TemporaryDirectory(dir=work,prefix='render-profile-') as profile:
   args=browser_args(browser,profile,htmlpath.as_uri());result=run(args,work,env)
  (out/'B114.stderr').write_text(result.stderr);dom=result.stdout
  require('<html' in dom.lower() and 'ENGINEER OSINT' in dom,'invalid DOM');require('engineer-data-integrity-identity-fixes-module' not in dom and 'engineer-overlay-transition-runtime-guard-module' in dom,'retirement mismatch')
  normalized=normalize(dom);(out/'B114-normalized-dom.html').write_text(normalized)
  require(snapshot(src)==before,'checkout inputs changed');require(sha(raw(browser))==browser_hash,'browser changed')
  receipt=discovered(baseline,sha(normalized.encode()),{'tested_head':head,'candidate_sha256':CANDIDATE,'parent_manifest_sha256':PARENT_MANIFEST,'successor_manifest_sha256':SUCCESSOR_MANIFEST,'baseline_dom_raw_sha256':sha(raw(a.baseline_dom)),'source_pins_sha256':sha(raw(pathlib.Path(__file__).with_name('b113-source-pins.json'))),'run_id':os.environ.get('GITHUB_RUN_ID'),'run_attempt':os.environ.get('GITHUB_RUN_ATTEMPT'),'browser_sha256':browser_hash,'browser_version':version,'browser_args':args,'sandbox':sandbox,'artifacts':snapshot(work/'docs/engineer-osint-dist')})
  (out/'result.json').write_text(json.dumps(receipt,indent=2)+'\n');(out/'status.json').write_text(json.dumps({'status':receipt['status']}))
 except Exception as exc:
  if isinstance(exc,subprocess.CalledProcessError):
   (out/'failure.stdout').write_text(exc.stdout or '');(out/'failure.stderr').write_text(exc.stderr or '')
  (out/'status.json').write_text(json.dumps({'status':'BLOCKED','error':str(exc),'authority_granted':False}));raise
if __name__=='__main__':main()
