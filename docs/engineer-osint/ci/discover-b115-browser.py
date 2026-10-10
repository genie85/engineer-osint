"""Review-only CI discovery. Import is inert. CLI requires explicit --execute.
No expected B115 digest is accepted; successful measurement grants no authority.
"""
import argparse,hashlib,html,json,os,pathlib,re,shutil,stat,subprocess,tempfile,platform,selectors,signal,time
from html.parser import HTMLParser
BASE='719edcc148c61f4f9cf1ddffbdd099b353765eeb'
CANDIDATE='af62329bc1f7a6c0cc27011300031e2891a2d871bf6ce4ffc0b5e293fbda7b44'
PARENT_MANIFEST='cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928'
SUCCESSOR_MANIFEST='b2aaea408de90d214b1519748c288e0dbd16a2d647d2f4eb549237be7dc16f7b'
B114_DOM='b529dbb03b27671b717ea9580a7330e836b5808c47af174e9e58b67584ef4f05'
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
 digest=sha(normalize(dom).encode());require(digest==B114_DOM,'B114 exact DOM mismatch');return digest

SANDBOX_SCHEMA='chromium-linux-layer1-v1'
SANDBOX_SOURCE_VERSION='154.0.8037.97'
SANDBOX_FIELDS={
 'Layer 1 Sandbox':{'Namespace','SUID','None'},
 'PID namespaces':{'Yes','No'},
 'Network namespaces':{'Yes','No'},
 'Seccomp-BPF sandbox':{'Yes','No'},
 'Seccomp-BPF sandbox supports TSYNC':{'Yes','No'},
 'Ptrace Protection with Yama LSM (Broker)':{'Yes','No'},
 'Ptrace Protection with Yama LSM (Non-broker)':{'Yes','No'},
}

class SandboxTableParser(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.stack=[];self.tables=0;self.values={};self.cells=None;self.cell=None
  self.evaluation=None;self.evaluations=0;self.evaluation_open=False
 def handle_starttag(self,tag,attrs):
  ids=[v for k,v in attrs if k=='id']
  require(len(ids)<=1,'duplicate id attribute')
  if self.evaluation_open:raise ValueError('nested evaluation markup')
  if self.stack:
   parent=self.stack[-1]
   require((parent=='table' and tag in {'tbody','tr'}) or (parent=='tbody' and tag=='tr') or (parent=='tr' and tag=='td'),'unsupported sandbox table structure')
   self.stack.append(tag)
   if tag=='tr':self.cells=[]
   if tag=='td':self.cell=''
  elif tag=='table':
   require(ids==['sandbox-status'],'unknown sandbox table')
   self.tables+=1;require(self.tables==1,'duplicate sandbox table');self.stack=['table']
  elif ids==['evaluation']:
   require(tag=='p','invalid evaluation element');self.evaluations+=1
   require(self.evaluations==1,'duplicate evaluation');self.evaluation='';self.evaluation_open=True
  elif tag in {'tr','td','th','tbody'}:raise ValueError('sandbox row outside table')
 def handle_endtag(self,tag):
  if self.stack:
   require(tag==self.stack[-1],'mismatched sandbox table tag');self.stack.pop()
   if tag=='td':self.cells.append(self.cell.strip());self.cell=None
   if tag=='tr':
    require(len(self.cells)==2,'sandbox row must have exactly two cells')
    key,value=self.cells;require(key in SANDBOX_FIELDS,'unknown sandbox field: '+key)
    require(key not in self.values,'duplicate sandbox field: '+key)
    require(value in SANDBOX_FIELDS[key],'unknown sandbox value: '+key)
    self.values[key]=value;self.cells=None
  elif self.evaluation_open:
   require(tag=='p','mismatched evaluation tag');self.evaluation_open=False
  elif tag in {'table','tbody','tr','td','th'}:raise ValueError('unmatched sandbox table tag')
 def handle_data(self,data):
  if self.cell is not None:self.cell+=data
  elif self.stack:require(not data.strip(),'unexpected table text')
  elif self.evaluation_open:self.evaluation+=data
 def handle_startendtag(self,tag,attrs):
  require(not self.stack and not self.evaluation_open,'self-closing diagnostic markup')
  require(tag not in {'table','tbody','tr','td','th'} and not any(k=='id' and v in {'sandbox-status','evaluation'} for k,v in attrs),'self-closing diagnostic element')

def sandbox_evidence(dom,*,schema=SANDBOX_SCHEMA):
 # Source-derived format contract, not a claim about the measured browser version.
 require(schema==SANDBOX_SCHEMA,'unsupported sandbox schema')
 if re.search(r'<ntp-app\b|new_tab_page\.js|<title\b[^>]*>\s*New Tab\s*</title>',dom,re.I):
  raise ValueError('SANDBOX_DIAGNOSTIC_WRONG_PAGE: New Tab; sandbox remains unproven')
 parser=SandboxTableParser();parser.feed(dom);parser.close()
 require(not parser.stack and not parser.evaluation_open,'incomplete sandbox markup')
 require(parser.tables==1 and parser.evaluations==1,'sandbox diagnostic identity missing')
 values=parser.values
 require(set(values)==set(SANDBOX_FIELDS),'missing sandbox fields')
 require(values['Layer 1 Sandbox'] in {'Namespace','SUID'},'sandbox isolation not evidenced')
 for key in ['PID namespaces','Network namespaces','Seccomp-BPF sandbox']:
  require(values[key]=='Yes',key+' not evidenced')
 if values['Layer 1 Sandbox']=='Namespace' or values['Ptrace Protection with Yama LSM (Broker)']=='No':
  require(values['Ptrace Protection with Yama LSM (Non-broker)']=='No','contradictory Yama status')
 require(parser.evaluation.strip()=='You are adequately sandboxed.','sandbox evaluation missing or contradictory')
 return {'schema':SANDBOX_SCHEMA,'source_version':SANDBOX_SOURCE_VERSION,'values':values}

def browser_args(browser,profile,url):
 # Render-only invocation: never opt into privileged chrome:// navigation.
 require(url.startswith('file:///'),'unsupported render navigation')
 return [str(browser),'--user-data-dir='+str(profile),'--headless=new','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=5000','--dump-dom',url]

def sandbox_probe_args(browser,profile,url='chrome://sandbox'):
 require(url=='chrome://sandbox','unsupported diagnostic navigation')
 return [str(browser),'--user-data-dir='+str(profile),'--headless=new','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=5000','--dump-dom','--allow-chrome-scheme-url',url]


STDOUT_LIMIT=32*1024*1024
STDERR_LIMIT=1024*1024
PROCESS_TIMEOUT=180
class OutputLimitExceeded(subprocess.SubprocessError):
 def __init__(self,stream,limit,stdout,stderr):
  super().__init__(f'OUTPUT_LIMIT_EXCEEDED: {stream} > {limit} bytes')
  self.stdout=stdout;self.stderr=stderr;self.stream=stream;self.limit=limit

def bounded_run(argv,cwd,env,*,stdout_limit=STDOUT_LIMIT,stderr_limit=STDERR_LIMIT,timeout=PROCESS_TIMEOUT):
 require(stdout_limit>=0 and stderr_limit>=0 and timeout>0,'invalid process budget')
 deadline=time.monotonic()+timeout
 buffers={'stdout':bytearray(),'stderr':bytearray()};limits={'stdout':stdout_limit,'stderr':stderr_limit}
 process=None;selector=selectors.DefaultSelector()
 try:
  process=subprocess.Popen(argv,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
  for name,pipe in [('stdout',process.stdout),('stderr',process.stderr)]:
   os.set_blocking(pipe.fileno(),False);selector.register(pipe,selectors.EVENT_READ,name)
  while selector.get_map():
   remaining_time=deadline-time.monotonic()
   if remaining_time<=0:raise subprocess.TimeoutExpired(argv,timeout,output=bytes(buffers['stdout']),stderr=bytes(buffers['stderr']))
   for key,_ in selector.select(remaining_time):
    name=key.data;remaining_bytes=limits[name]-len(buffers[name])
    # Read no more than budget plus one detection byte; never buffer unbounded output.
    chunk=os.read(key.fd,min(65536,remaining_bytes+1))
    if not chunk:selector.unregister(key.fileobj);continue
    if len(chunk)>remaining_bytes:
     buffers[name].extend(chunk[:remaining_bytes])
     raise OutputLimitExceeded(name,limits[name],bytes(buffers['stdout']),bytes(buffers['stderr']))
    buffers[name].extend(chunk)
  remaining_time=deadline-time.monotonic()
  if remaining_time<=0:raise subprocess.TimeoutExpired(argv,timeout,output=bytes(buffers['stdout']),stderr=bytes(buffers['stderr']))
  try:code=process.wait(timeout=remaining_time)
  except subprocess.TimeoutExpired:raise subprocess.TimeoutExpired(argv,timeout,output=bytes(buffers['stdout']),stderr=bytes(buffers['stderr']))
  stdout=bytes(buffers['stdout']);stderr=bytes(buffers['stderr'])
  if code:raise subprocess.CalledProcessError(code,argv,output=stdout,stderr=stderr)
  return subprocess.CompletedProcess(argv,code,stdout.decode('utf-8'),stderr.decode('utf-8'))
 finally:
  selector.close()
  # Kill the session's process group, including descendants retaining a pipe.
  if process is not None:
   try:
    try:os.killpg(process.pid,signal.SIGKILL)
    except ProcessLookupError:pass
   finally:
    try:process.wait(timeout=5)
    finally:
     process.stdout.close();process.stderr.close()

def run(argv,cwd,env):
 return bounded_run(argv,cwd,env)

def save_stream(out,name,value):
 # Error buffers are raw bounded bytes; do not expand invalid UTF-8 with replacement.
 (out/name).write_bytes(value if isinstance(value,bytes) else (value or '').encode('utf-8'))

def save_runtime(out,metadata):
 temporary=out/'runtime-metadata.json.tmp'
 temporary.write_text(json.dumps(metadata,indent=2)+'\n');temporary.replace(out/'runtime-metadata.json')

def recorded_browser_run(argv,cwd,env,out,metadata,phase,execute=None):
 # Submitted argv are evidence of our invocation, not introspected child argv.
 item={'phase':phase,'submitted_argv':list(argv),'cwd':str(cwd),'state':'STARTING','returncode':None}
 metadata['browser_invocations'].append(item);save_runtime(out,metadata)
 try:
  result=(execute or run)(argv,cwd,env)
 except (subprocess.CalledProcessError,subprocess.TimeoutExpired,OutputLimitExceeded) as exc:
  item.update(state='FAILED',returncode=getattr(exc,'returncode',None),error_type=type(exc).__name__)
  if phase!='B115-render':save_stream(out,phase+'.stdout',exc.stdout)
  save_stream(out,phase+'.stderr',exc.stderr)
  save_runtime(out,metadata);raise
 except Exception as exc:
  item.update(state='FAILED',error_type=type(exc).__name__);save_runtime(out,metadata);raise
 if phase!='B115-render':save_stream(out,phase+'.stdout',result.stdout)
 save_stream(out,phase+'.stderr',result.stderr)
 item.update(state='COMPLETED',returncode=result.returncode,stdout_sha256=sha(result.stdout.encode()),stderr_sha256=sha(result.stderr.encode()))
 if phase=='browser-version':metadata['browser_version']=result.stdout.strip()
 save_runtime(out,metadata);return result

def simulate(checkout,candidate,work,execute=run):
 """Writes only a new disjoint synthetic copy, using strict repo materialization."""
 checkout=pathlib.Path(checkout).resolve();candidate=pathlib.Path(candidate);work=pathlib.Path(work).resolve();disjoint(checkout,work)
 require(not work.exists(),'simulation destination must be new')
 src=checkout/'docs/engineer-osint';before=snapshot(src);candidate_bytes=raw(candidate);require(sha(candidate_bytes)==CANDIDATE,'candidate pin mismatch')
 require(sha(raw(src/'data/run-store-manifest.json'))==PARENT_MANIFEST,'parent manifest mismatch')
 shutil.copytree(src,work/'docs/engineer-osint',symlinks=False)
 require(snapshot(work/'docs/engineer-osint')==before,'copy input mismatch')
 (work/'candidate.json').write_bytes(candidate_bytes)
 helper=pathlib.Path(__file__).with_name('simulate-b115.mjs')
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
 require(baseline==B114_DOM,'unmatched baseline');require(bool(re.fullmatch('[a-f0-9]{64}',observed)),'invalid observed digest')
 require(not ({'status','authority_granted','canonical_write','baseline_observed','successor_observed'} & set(bindings)),'reserved receipt field')
 return dict(status='DISCOVERED_NOT_AUTHORIZED',authority_granted=False,canonical_write=False,baseline_observed=baseline,successor_observed=observed,**bindings)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--execute',action='store_true');ap.add_argument('--checkout',required=True);ap.add_argument('--expected-head',required=True);ap.add_argument('--candidate',required=True);ap.add_argument('--browser',required=True);ap.add_argument('--baseline-dom',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
 require(a.execute,'explicit execution opt-in required');require(os.geteuid()!=0,'non-root browser required')
 root=pathlib.Path(a.checkout).resolve();out=pathlib.Path(a.output).resolve();disjoint(root,out);require(not out.exists(),'fresh output required')
 require(bool(re.fullmatch('[a-f0-9]{40}',a.expected_head)),'exact reviewed head required')
 env={**{k:v for k,v in os.environ.items() if not k.startswith('GIT_') and k!='NODE_OPTIONS'},'GIT_NO_REPLACE_OBJECTS':'1','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_SYSTEM':'/dev/null'}
 require(pathlib.Path(__file__).resolve()==root/'docs/engineer-osint/ci/discover-b115-browser.py','helper checkout mismatch')
 head=run(['git','rev-parse','HEAD'],root,env).stdout.strip();require(head==a.expected_head,'reviewed head mismatch')
 run(['git','diff','--exit-code','HEAD','--'],root,env)
 browser=pathlib.Path(a.browser).resolve();require(raw(browser)[:4]==b'\x7fELF','native executable required; wrappers refused');browser_hash=sha(raw(browser))
 baseline=baseline_digest(raw(a.baseline_dom).decode());pins=json.loads(pathlib.Path(__file__).with_name('b114-dmz-source-pins.json').read_text());src=root/'docs/engineer-osint'
 for name,digest in pins.items():require(sha(raw(src/name))==digest,'baseline source drift: '+name)
 before=snapshot(src)
 allowed={'ci/discover-b115-browser.py','ci/simulate-b115.mjs','ci/b114-dmz-source-pins.json','ci/test-b115-discovery.py'}
 require(set(before)==set(pins)|allowed,'unexpected source file set')
 run(['git','ls-files','--error-unmatch','--',*[str(pathlib.Path('docs/engineer-osint')/name) for name in sorted(allowed)]],root,env)
 out.mkdir(parents=True);(out/'status.json').write_text(json.dumps({'status':'RUNNING_NOT_AUTHORIZED'}))
 metadata={'schema':'dmz-runtime-diagnostic-v1','authority_granted':False,'tested_head':head,'reviewed_head':a.expected_head,'browser_executable':str(browser),'browser_sha256':browser_hash,'browser_version':None,'kernel':platform.release(),'machine':platform.machine(),'baseline_observed':baseline,'candidate_sha256':CANDIDATE,'run_id':os.environ.get('GITHUB_RUN_ID'),'run_attempt':os.environ.get('GITHUB_RUN_ATTEMPT'),'requested_diagnostic_url':'chrome://sandbox','actual_diagnostic_url':None,'browser_invocations':[],'process_limits':{'stdout_bytes':STDOUT_LIMIT,'stderr_bytes':STDERR_LIMIT,'shared_timeout_seconds':PROCESS_TIMEOUT,'kill_reap_timeout_seconds':5},'raw_B115_stdout_persisted':False}
 save_runtime(out,metadata)
 try:
  work=out/'simulation';simulate(root,a.candidate,work);env=clean_env(work)
  version=recorded_browser_run([str(browser),'--version'],work,env,out,metadata,'browser-version').stdout.strip()
  with tempfile.TemporaryDirectory(dir=work,prefix='sandbox-profile-') as profile:
   proof=recorded_browser_run(sandbox_probe_args(browser,profile),work,env,out,metadata,'sandbox-probe')
  (out/'sandbox-dom.html').write_text(proof.stdout);sandbox=sandbox_evidence(proof.stdout)
  for script in SCRIPTS:
   if script=='INJECT':inject(work);continue
   result=run(['node','docs/engineer-osint/'+script],work,env);(out/(script+'.log')).write_text(result.stdout+result.stderr)
  require(sha(raw(work/'docs/engineer-osint/data/run-store-manifest.json'))==SUCCESSOR_MANIFEST,'post-build manifest drift')
  htmlpath=work/'docs/engineer-osint-dist/index.html'
  with tempfile.TemporaryDirectory(dir=work,prefix='render-profile-') as profile:
   args=browser_args(browser,profile,htmlpath.as_uri());result=recorded_browser_run(args,work,env,out,metadata,'B115-render')
  (out/'B115.stderr').write_text(result.stderr);dom=result.stdout
  require('<html' in dom.lower() and 'ENGINEER OSINT' in dom,'invalid DOM');require('engineer-data-integrity-identity-fixes-module' not in dom and 'engineer-overlay-transition-runtime-guard-module' in dom,'retirement mismatch')
  normalized=normalize(dom);(out/'B115-normalized-dom.html').write_text(normalized)
  require(snapshot(src)==before,'checkout inputs changed');require(sha(raw(browser))==browser_hash,'browser changed')
  receipt=discovered(baseline,sha(normalized.encode()),{'tested_head':head,'candidate_sha256':CANDIDATE,'parent_manifest_sha256':PARENT_MANIFEST,'successor_manifest_sha256':SUCCESSOR_MANIFEST,'baseline_dom_raw_sha256':sha(raw(a.baseline_dom)),'source_pins_sha256':sha(raw(pathlib.Path(__file__).with_name('b114-dmz-source-pins.json'))),'run_id':os.environ.get('GITHUB_RUN_ID'),'run_attempt':os.environ.get('GITHUB_RUN_ATTEMPT'),'browser_sha256':browser_hash,'browser_version':version,'browser_args':args,'sandbox':sandbox,'artifacts':snapshot(work/'docs/engineer-osint-dist')})
  (out/'result.json').write_text(json.dumps(receipt,indent=2)+'\n');(out/'status.json').write_text(json.dumps({'status':receipt['status']}))
 except Exception as exc:
  if isinstance(exc,(subprocess.CalledProcessError,subprocess.TimeoutExpired,OutputLimitExceeded)):
   save_stream(out,'failure.stderr',exc.stderr)
  (out/'status.json').write_text(json.dumps({'status':'BLOCKED','error':str(exc),'authority_granted':False}));raise
if __name__=='__main__':main()
