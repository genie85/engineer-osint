from pathlib import Path
from hashlib import sha1, sha256
import json
import re

wf_path=Path('.github/workflows/identity-fix-retirement-regression.yml')
helper_path=Path('docs/engineer-osint/tests/v4556-workflow-lifecycle-helper.mjs')
wf=wf_path.read_text()
helper=helper_path.read_text()

def blob_sha(text):
    payload=text.encode()
    return sha1(f'blob {len(payload)}\0'.encode()+payload).hexdigest()

def file_sha(text):
    return sha256(text.encode()).hexdigest()

def replace_once(text,old,new,label):
    n=text.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected one anchor, got {n}')
    return text.replace(old,new,1)

def line_replace_once(text,old,new,label):
    pattern=re.compile(r'^'+re.escape(old)+r'$',re.M)
    text2,n=pattern.subn(lambda _m:new,text,count=1)
    if n != 1:
        raise SystemExit(f'{label}: expected one exact line, got {n}')
    return text2

assert blob_sha(wf)=='cb7e4d186ff3a79675ace8c48754317ffdede233'
assert blob_sha(helper)=='7e9480f421cdd811c2660033e4539f926ce5ad7b'

b104_run='engineer-osint-20260903-B104'
b104_digest='5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'
b105_run='engineer-osint-20260904-B105'
b105_digest='25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'

wide_before=f"              '{b104_run}':'{b104_digest}'"
wide_after=wide_before+f",\n              '{b105_run}':'{b105_digest}'"
narrow_before=f"            '{b104_run}':'{b104_digest}'"
narrow_after=narrow_before+f",\n            '{b105_run}':'{b105_digest}'"
wf2=line_replace_once(wf,wide_before,wide_after,'python digest map')
wf2=line_replace_once(wf2,narrow_before,narrow_after,'node digest map')
if wf2.count(b105_run)!=2 or wf2.count(b105_digest)!=2:
    raise SystemExit('B105 pair cardinality mismatch')
wf_successor_blob=blob_sha(wf2)
wf_successor_sha=file_sha(wf2)
reverted=line_replace_once(wf2,wide_after,wide_before,'reverse python map')
reverted=line_replace_once(reverted,narrow_after,narrow_before,'reverse node map')
if reverted!=wf or blob_sha(reverted)!='cb7e4d186ff3a79675ace8c48754317ffdede233':
    raise SystemExit('workflow reverse proof failed')

helper2=replace_once(helper,
    "const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';",
    "const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';\nconst b105IdentityWorkflowSha='"+wf_successor_blob+"';",'helper B105 blob constant')
helper2=replace_once(helper2,
    'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha];',
    'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha];','published descendants')
helper2=replace_once(helper2,
    'if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))',
    'if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','B101 chain')
helper2=replace_once(helper2,
    'if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))',
    'if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','B102 chain')
helper2=replace_once(helper2,
    'if([b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))',
    'if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','B103 chain')
old_b104="if(current===b104IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260903-B104':'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'/,'B104 exact digest anchor missing');"
new_b104="if([b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))assert.match(text,/'engineer-osint-20260903-B104':'5c931288915f7621771bbaa904814b63d8ab7b18461900c077ad85fc6279798c'/,'B104 exact digest anchor missing');\n    if(current===b105IdentityWorkflowSha)assert.match(text,/'engineer-osint-20260904-B105':'25157418735741c5deec91f8ced48a920fd2086bf20d38df95277e03568f13c7'/,'B105 exact digest anchor missing');"
helper2=replace_once(helper2,old_b104,new_b104,'B104/B105 exact anchors')
helper_successor_blob=blob_sha(helper2)
helper_successor_sha=file_sha(helper2)

reverse=helper2
reverse=replace_once(reverse,new_b104,old_b104,'reverse anchors')
reverse=replace_once(reverse,'if([b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))','reverse B103')
reverse=replace_once(reverse,'if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))','reverse B102')
reverse=replace_once(reverse,'if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha].includes(current))','if([b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha].includes(current))','reverse B101')
reverse=replace_once(reverse,'const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha,b105IdentityWorkflowSha];','const published=[b100IdentityWorkflowSha,b101IdentityWorkflowSha,b102IdentityWorkflowSha,b103IdentityWorkflowSha,b104IdentityWorkflowSha];','reverse published')
reverse=replace_once(reverse,"const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';\nconst b105IdentityWorkflowSha='"+wf_successor_blob+"';","const b104IdentityWorkflowSha='cb7e4d186ff3a79675ace8c48754317ffdede233';",'reverse constant')
if reverse!=helper or blob_sha(reverse)!='7e9480f421cdd811c2660033e4539f926ce5ad7b':
    raise SystemExit('helper reverse proof failed')

out={
  'schema_version':'engineer-osint-v4658-b105-browser-successor-derivation-v1',
  'status':'PASS_READ_ONLY',
  'b105':{'run_id':b105_run,'normalized_dom_sha256':b105_digest},
  'workflow':{
    'path':str(wf_path),'predecessor_git_blob_sha':'cb7e4d186ff3a79675ace8c48754317ffdede233',
    'successor_git_blob_sha':wf_successor_blob,'successor_sha256':wf_successor_sha,
    'b105_pair_occurrences':2,'reverse_proof':True},
  'helper':{
    'path':str(helper_path),'predecessor_git_blob_sha':'7e9480f421cdd811c2660033e4539f926ce5ad7b',
    'successor_git_blob_sha':helper_successor_blob,'successor_sha256':helper_successor_sha,
    'reverse_proof':True}
}
Path('/tmp/v4658-successor-hashes.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
