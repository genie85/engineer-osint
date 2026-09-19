#!/usr/bin/env python3
"""Read-only, advisory diff classification. Never grants merge authority."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import os

SHA = re.compile(r'^[a-f0-9]{40}$')
PROTECTED = re.compile(r'verdict|status|rating|score|checkedat|reviewedat|canonical|source[\s_-]*data|permission|secret|licen[sc]e|visibility|deploy|publication|publish|governance|safety|policy|billing|token|provider|authority', re.I)


def blocked(reason):
    return {'decision': 'BLOCK', 'mergeAuthorized': False, 'reasons': [reason]}


def valid_policy(policy):
    return (policy.get('schemaVersion') == 'engineer.dry-run-policy.v1'
            and policy.get('repositoryId') == 1336467398
            and policy.get('repository') == 'genie85/engineer-osint'
            and policy.get('baseRef') == 'main'
            and policy.get('allowedNotesPrefix') == 'docs/technical-notes/'
            and policy.get('mergeAuthorized') is False
            and policy.get('requiredIndependentReviews') == 2
            and re.fullmatch(r'[a-f0-9]{64}', policy.get('canonicalExecutorWorkflowSha256', '')))


def classify(changes, policy):
    if not valid_policy(policy):
        return blocked('INVALID_POLICY')
    if not changes:
        return blocked('EMPTY_OR_MISSING_DIFF')
    reasons = []
    for item in changes:
        path, status, patch = item['path'], item['status'], item['patch']
        if (not re.fullmatch(r'docs/technical-notes/[A-Za-z0-9_-]+\.md', path)
                or PROTECTED.search(path)):
            reasons.append('PROTECTED_OR_UNKNOWN_PATH:' + path)
        if status not in {'A', 'M'} or item['mode'] != '100644':
            reasons.append('DESTRUCTIVE_OR_NONREGULAR:' + path)
        # The narrow notes allowlist accepts plain ASCII only. Ambiguous encodings
        # and markup are BLOCK, not guessed. Scan joined letters across whitespace
        # and Markdown punctuation as well as the original text.
        joined = re.sub(r'[^a-z0-9]', '', patch.lower())
        ambiguous = any(ord(c) > 126 or (ord(c) < 32 and c not in '\n\r\t') for c in patch) or any(c in patch for c in '<>&')
        if ambiguous or PROTECTED.search(patch) or PROTECTED.search(joined) or 'Binary files ' in patch or 'GIT binary patch' in patch:
            reasons.append('PROTECTED_CONTENT_OR_BINARY:' + path)
    return {'decision': 'BLOCK' if reasons else 'ELIGIBLE_FOR_REVIEW',
            'mergeAuthorized': False, 'reasons': sorted(set(reasons))}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE, timeout=30)


def evaluate(repo, identity, initial, final, policy):
    receipt = {'schemaVersion': 'engineer.dry-run-receipt.v1',
               'scope': 'diff-classification-only', 'mergeAuthorized': False,
               'policyDigest': hashlib.sha256(json.dumps(policy, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
               'issuedAt': datetime.now(timezone.utc).isoformat()}
    try:
        if not valid_policy(policy):
            raise ValueError('INVALID_POLICY')
        b, h, i = [identity[k] for k in ('baseSha', 'headSha', 'integrationSha')]
        if not all(isinstance(s, str) and SHA.fullmatch(s) for s in (b, h, i)):
            raise ValueError('INVALID_SHA')
        receipt.update(baseSha=b, headSha=h, integrationSha=i)
        if identity.get('eventName') != 'pull_request_target' or identity.get('workflowSha') != b:
            raise ValueError('UNTRUSTED_WORKFLOW_IDENTITY')
        receipt['eventName'] = 'pull_request_target'
        receipt['trustedWorkflowCommitSha'] = b
        for key, path in [('trustedWorkflowBlobSha','.github/workflows/safe-automerge-dry-run.yml'),
                          ('trustedHelperBlobSha','tools/safe_automerge.py'),
                          ('trustedPolicyBlobSha','tools/safe-automerge-policy.json')]:
            receipt[key] = git(repo, 'rev-parse', b+':'+path).decode().strip()
        if git(repo, 'show', b+':tools/safe_automerge.py') != Path(__file__).read_bytes():
            raise ValueError('HELPER_NOT_FROM_BASE')
        if json.loads(git(repo, 'show', b+':tools/safe-automerge-policy.json')) != policy:
            raise ValueError('POLICY_NOT_FROM_BASE')
        for snapshot in (initial, final):
            if (snapshot['state'] != 'open' or snapshot.get('merge_commit_sha') != i or snapshot['base']['sha'] != b
                    or snapshot['head']['sha'] != h or snapshot['base']['ref'] != policy['baseRef']
                    or snapshot['base']['repo']['id'] != policy['repositoryId']):
                raise ValueError('STALE_OR_INVALID_PR_IDENTITY')
        if git(repo, 'status', '--porcelain', '--untracked-files=normal').strip():
            raise ValueError('DIRTY_WORKTREE')
        if git(repo, 'rev-parse', 'HEAD').decode().strip() != b:
            raise ValueError('CHECKOUT_MISMATCH')
        parents = git(repo, 'show', '-s', '--format=%P', i).decode().split()
        if parents != [b, h]:
            raise ValueError('INTEGRATION_PARENTS_MISMATCH')
        receipt['testedTreeSha'] = git(repo, 'rev-parse', i+'^{tree}').decode().strip()
        executor = git(repo, 'show', b+':.github/workflows/authorized-canonical-executor.yml')
        if hashlib.sha256(executor).hexdigest() != policy['canonicalExecutorWorkflowSha256']:
            raise ValueError('UNAPPROVED_CANONICAL_EXECUTOR_ON_BASE')
        raw = git(repo, 'diff', '--no-ext-diff', '--name-status', '-z', '--no-renames', b, i).decode('utf-8').split('\0')
        if raw[-1] != '' or len(raw) % 2 != 1:
            raise ValueError('MALFORMED_DIFF')
        changes = []
        for status, path in zip(raw[0:-1:2], raw[1:-1:2]):
            entry = git(repo, 'ls-tree', i, '--', path).decode()
            mode = entry.split()[0] if entry else 'missing'
            # Unknown paths are rejected without materializing their contents.
            content = ''
            if re.fullmatch(r'docs/technical-notes/[A-Za-z0-9_-]+\.md', path) and status in {'A','M'} and mode == '100644':
                for revision in ([b, i] if status == 'M' else [i]):
                    size = int(git(repo, 'cat-file', '-s', revision+':'+path))
                    if size > 262144:
                        raise ValueError('CONTENT_TOO_LARGE')
                    content += git(repo, 'show', revision+':'+path).decode('utf-8') + '\n'
            changes.append({'status': status, 'path': path, 'mode': mode, 'patch': content})
        receipt['changedPaths'] = [x['path'] for x in changes]
        receipt.update(classify(changes, policy))
    except (ValueError, KeyError, TypeError, UnicodeError, subprocess.SubprocessError) as exc:
        receipt.update(blocked(str(exc)))
    return receipt


def fetch_pr(number):
    if not number.isdecimal() or int(number) < 1:
        raise ValueError('INVALID_PR_NUMBER')
    req = urllib.request.Request('https://api.github.com/repos/genie85/engineer-osint/pulls/'+number,
        headers={'Authorization': 'Bearer '+os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True)
    ap.add_argument('--policy', required=True)
    ap.add_argument('--output', required=True)
    args = ap.parse_args()
    try:
        policy = json.loads(Path(args.policy).read_text())
        if os.environ.get('GITHUB_EVENT_NAME') != 'pull_request_target' or os.environ.get('GITHUB_REPOSITORY') != policy['repository']:
            raise ValueError('UNTRUSTED_EVENT')
        initial = fetch_pr(os.environ['PR_NUMBER'])
        identity = {'baseSha':os.environ['BASE_SHA'], 'headSha':os.environ['HEAD_SHA'],
                    'integrationSha':initial['merge_commit_sha'],
                    'workflowSha':os.environ['GITHUB_WORKFLOW_SHA'], 'eventName':'pull_request_target'}
        # Fetch passive objects from the fixed public origin. Never checkout, import
        # or execute candidate files. Ref names/remote URLs never come from PR text.
        for sha in (identity['headSha'], identity['integrationSha']):
            if not isinstance(sha, str) or not SHA.fullmatch(sha):
                raise ValueError('INVALID_OBJECT_SHA')
        git(args.repo, '-c', 'core.hooksPath=/dev/null', 'fetch', '--no-tags', '--no-recurse-submodules', '--no-write-fetch-head',
            'https://github.com/genie85/engineer-osint.git', identity['headSha'], identity['integrationSha'])
        receipt = evaluate(args.repo, identity, initial, initial, policy)
        final = fetch_pr(os.environ['PR_NUMBER'])
        receipt = evaluate(args.repo, identity, initial, final, policy)
    except Exception as exc:
        # Never print HTTP headers, token values or arbitrary remote exception bodies.
        receipt = blocked('READ_OR_VALIDATION_FAILURE:'+type(exc).__name__)
    receipt.update(runId=os.environ.get('GITHUB_RUN_ID'), runAttempt=os.environ.get('GITHUB_RUN_ATTEMPT'))
    Path(args.output).write_text(json.dumps(receipt, sort_keys=True, indent=2)+'\n')
    print(json.dumps({'decision': receipt['decision'], 'mergeAuthorized': False}))
    return 0  # BLOCK is a successful dry-run observation, never a required merge PASS.


if __name__ == '__main__':
    raise SystemExit(main())
