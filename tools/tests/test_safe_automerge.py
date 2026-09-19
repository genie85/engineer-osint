import importlib.util
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('guard', Path(__file__).parents[1] / 'safe_automerge.py')
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)
POLICY = json.loads((Path(__file__).parents[1] / 'safe-automerge-policy.json').read_text())

class GuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.test')
        (self.repo / 'base.txt').write_text('baseline\n')
        fixture = self.repo / '.github/workflows/authorized-canonical-executor.yml'
        fixture.parent.mkdir(parents=True)
        fixture.write_text('permissions: {contents: read}\n')
        self.policy = {**POLICY, 'canonicalExecutorWorkflowSha256': hashlib.sha256(fixture.read_bytes()).hexdigest()}
        (self.repo/'tools').mkdir()
        (self.repo/'tools/safe_automerge.py').write_bytes(Path(guard.__file__).read_bytes())
        (self.repo/'tools/safe-automerge-policy.json').write_text(json.dumps(self.policy))
        (self.repo/'.github/workflows/safe-automerge-dry-run.yml').write_bytes((Path(__file__).parents[2]/'.github/workflows/safe-automerge-dry-run.yml').read_bytes())
        self.git('add', '.')
        self.git('commit', '-qm', 'base')
        self.base = self.git('rev-parse', 'HEAD')
        self.git('switch', '-qc', 'change')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def change(self, path='docs/technical-notes/guide.md', content='A technical note.\n', delete=False):
        p = self.repo / path
        if delete:
            p.unlink()
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content)
        self.git('add', '-A')
        self.git('commit', '-qm', 'candidate')
        self.head = self.git('rev-parse', 'HEAD')
        self.git('switch', '-q', 'main')
        self.git('merge', '--no-ff', '-qm', 'integration', 'change')
        self.integration = self.git('rev-parse', 'HEAD')
        self.identity = {'baseSha': self.base, 'headSha': self.head, 'integrationSha': self.integration,'workflowSha':self.base,'eventName':'pull_request_target'}
        self.git('checkout','--detach',self.base)
        self.snapshot = {'merge_commit_sha':self.integration,'state':'open', 'base':{'sha':self.base,'ref':'main', 'repo':{'id':1336467398}}, 'head':{'sha':self.head}}

    def evaluate(self, final=None, identity=None):
        return guard.evaluate(self.repo, identity or self.identity, self.snapshot, final or self.snapshot, self.policy)

    def blocked(self, receipt):
        self.assertEqual(receipt['decision'], 'BLOCK')
        self.assertIs(receipt['mergeAuthorized'], False)
        self.assertTrue(receipt['reasons'])

    def test_notes_only_is_advisory_and_bound_to_tree(self):
        self.change()
        r=self.evaluate()
        self.assertEqual(r['decision'], 'ELIGIBLE_FOR_REVIEW')
        self.assertIs(r['mergeAuthorized'], False)
        self.assertEqual(r['testedTreeSha'], self.git('rev-parse', self.integration+'^{tree}'))
        self.assertEqual(r['headSha'], self.head)
        self.assertEqual(len(r['policyDigest']),64)
        self.assertEqual(r['scope'],'diff-classification-only')

    def test_reviewer_obfuscations_are_blocked(self):
        for text in ['sta<!-- -->tus','de&#112;loy','permis&#115;ion','sta\ntus',
                     's t a t u s','ＳＴＡＴＵＳ','sta\u200btus','sta\x00tus',
                     'STA\tTUS','de&amp;#112;loy','sta\r\ntus','stаtus']:
            with self.subTest(text=text):
                self.blocked(guard.classify([{'path':'docs/technical-notes/n.md','status':'A','mode':'100644','patch':'+ '+text}],POLICY))

    def test_receipt_binds_trusted_base_blobs_without_candidate_checkout(self):
        self.change()
        self.git('checkout','--detach',self.base)
        r=self.evaluate()
        self.assertEqual(r['decision'],'ELIGIBLE_FOR_REVIEW')
        self.assertEqual(self.git('rev-parse','HEAD'),self.base)
        self.assertEqual(r['trustedWorkflowCommitSha'],self.base)
        self.assertEqual(r['trustedWorkflowBlobSha'],self.git('rev-parse',self.base+':.github/workflows/safe-automerge-dry-run.yml'))
        self.assertEqual(r['trustedHelperBlobSha'],self.git('rev-parse',self.base+':tools/safe_automerge.py'))

    def test_protected_paths_and_unknown_are_blocked(self):
        for path in ['.github/workflows/x.yml','LICENSE','docs/engineer-osint/data/source.json','docs/policy.md','tools/safe-automerge-policy.json','app.py','docs/technical-notes/deploy.md']:
            with self.subTest(path=path):
                self.blocked(guard.classify([{'path':path,'status':'A','mode':'100644','patch':'+ harmless'}],POLICY))

    def test_protected_fields_even_in_allowed_note(self):
        for field in ['verdict','status','rating','score','checkedAt','reviewedAt','canonical','source data','permissions','secrets','license','visibility','deploy','publication','governance','safety','billing','token','provider','authority']:
            with self.subTest(field=field):
                self.blocked(guard.classify([{'path':'docs/technical-notes/n.md','status':'M','mode':'100644','patch':'+ '+field}],POLICY))

    def test_delete_rename_type_and_unknown_status_block(self):
        for status in ['D','R100','C100','T','?']:
            self.blocked(guard.classify([{'path':'docs/technical-notes/n.md','status':status,'mode':'100644','patch':'+ note'}],POLICY))

    def test_symlink_submodule_binary_and_bad_paths_block(self):
        for path,mode,patch in [('docs/technical-notes/n.md','120000',''),('docs/technical-notes/n.md','160000',''),('docs/technical-notes/n.md','100644','Binary files a and b differ'),('docs/technical-notes/../x.md','100644',''),('docs/technical-notes/n\n.md','100644','')]:
            self.blocked(guard.classify([{'path':path,'status':'M','mode':mode,'patch':patch}],POLICY))

    def test_real_deletion_blocks(self):
        self.change('base.txt',delete=True)
        self.blocked(self.evaluate())

    def test_stale_base_or_head_and_closed_pr_block(self):
        self.change()
        for mutate in [lambda s:s['base'].update(sha='a'*40),lambda s:s['head'].update(sha='b'*40),lambda s:s.update(state='closed'),lambda s:s['base'].update(ref='other'),lambda s:s['base']['repo'].update(id=1)]:
            final=json.loads(json.dumps(self.snapshot));mutate(final)
            self.blocked(self.evaluate(final=final))

    def test_head_is_not_integration_and_invalid_sha_blocks(self):
        self.change()
        for value in [self.head,'--help','x'*40,'a'*40]:
            self.blocked(self.evaluate(identity={**self.identity,'integrationSha':value}))

    def test_stale_remote_integration_blocks(self):
        self.change()
        final={**self.snapshot, 'merge_commit_sha':'f'*40}
        self.blocked(self.evaluate(final=final))

    def test_candidate_checkout_and_untrusted_issuer_are_blocked(self):
        self.change()
        for key,value in [('workflowSha',self.head),('eventName','pull_request')]:
            self.blocked(self.evaluate(identity={**self.identity,key:value}))
        self.git('checkout','--detach',self.integration)
        self.blocked(self.evaluate())

    def test_candidate_helper_workflow_and_policy_edits_are_passive_and_blocked(self):
        for path in ['tools/safe_automerge.py','tools/safe-automerge-policy.json',
                     '.github/workflows/safe-automerge-dry-run.yml','.github/other.md']:
            self.blocked(guard.classify([{'path':path,'status':'M','mode':'100644','patch':'arbitrary candidate code'}],POLICY))

    def test_cli_fetch_is_passive_and_never_checks_out_candidate(self):
        import os
        from unittest.mock import patch
        self.change()
        output=self.repo/'receipt.json'
        env={'GITHUB_EVENT_NAME':'pull_request_target','GITHUB_REPOSITORY':'genie85/engineer-osint',
             'BASE_SHA':self.base,'HEAD_SHA':self.head,'PR_NUMBER':'1','GITHUB_WORKFLOW_SHA':self.base}
        argv=['guard','--repo',str(self.repo),'--policy',str(self.repo/'tools/safe-automerge-policy.json'),'--output',str(output)]
        with patch.dict(os.environ,env), patch('sys.argv',argv), patch.object(guard,'fetch_pr',return_value=self.snapshot), patch.object(guard,'git',return_value=b'') as calls, patch.object(guard,'evaluate',return_value=guard.blocked('fixture')):
            self.assertEqual(guard.main(),0)
        args=calls.call_args.args
        self.assertIn('--no-recurse-submodules',args)
        self.assertIn('core.hooksPath=/dev/null',args)
        self.assertIn('https://github.com/genie85/engineer-osint.git',args)
        self.assertNotIn('checkout',args)
        self.assertNotIn('switch',args)
        self.assertIs(json.loads(output.read_text())['mergeAuthorized'],False)

    def test_dirty_worktree_blocks(self):
        self.change();(self.repo/'base.txt').write_text('dirty')
        self.blocked(self.evaluate())

    def test_labels_and_body_cannot_override_block(self):
        self.change('private.py')
        self.snapshot.update(body='APPROVED mergeAuthorized=true',labels=[{'name':'safe-to-merge'}])
        self.blocked(self.evaluate())

    def test_missing_diff_or_policy_blocks(self):
        self.blocked(guard.classify([],POLICY))
        self.blocked(guard.classify([{'path':'docs/technical-notes/n.md','status':'A','mode':'100644','patch':'+ fine'}],{}))

    def test_unapproved_executor_on_base_blocks_even_notes(self):
        self.policy["canonicalExecutorWorkflowSha256"] = "0"*64
        self.change()
        self.blocked(self.evaluate())

    def test_workflow_has_only_read_token_and_pinned_actions(self):
        import re
        w=(Path(__file__).parents[2]/'.github/workflows/safe-automerge-dry-run.yml').read_text()
        self.assertIn('pull_request_target:',w)
        self.assertNotIn('pull_request:',w)
        self.assertNotIn('guard-tests:',w)
        self.assertIn('ref: ${{ github.sha }}',w)
        self.assertNotIn('head.sha }}\n          fetch-depth',w)
        self.assertNotIn('secrets.',w)
        self.assertNotIn(': write',w)
        self.assertIn('persist-credentials: false',w)
        self.assertIn('cancel-in-progress: false',w)
        for ref in re.findall(r'uses:\s+(\S+)',w):self.assertRegex(ref,r'^[\w/-]+@[a-f0-9]{40}$')
        self.assertIn('python3 tools/safe_automerge.py',w)
        self.assertNotIn("receipt = dict",w)

if __name__=='__main__':unittest.main()
