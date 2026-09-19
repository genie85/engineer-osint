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
        if PROTECTED.search(patch) or 'Binary files ' in patch or 'GIT binary patch' in patch:
            reasons.append('PROTECTED_CONTENT_OR_BINARY:' + path)
    return {'decision': 'BLOCK' if reasons else 'ELIGIBLE_FOR_REVIEW',
            'mergeAuthorized': False, 'reasons': sorted(set(reasons))}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE)


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
        for snapshot in (initial, final):
            if (snapshot['state'] != 'open' or snapshot.get('merge_commit_sha') != i or snapshot['base']['sha'] != b
                    or snapshot['head']['sha'] != h or snapshot['base']['ref'] != policy['baseRef']
                    or snapshot['base']['repo']['id'] != policy['repositoryId']):
                raise ValueError('STALE_OR_INVALID_PR_IDENTITY')
        if git(repo, 'status', '--porcelain', '--untracked-files=normal').strip():
            raise ValueError('DIRTY_WORKTREE')
        if git(repo, 'rev-parse', 'HEAD').decode().strip() != i:
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
            patch = git(repo, 'diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=0', b, i, '--', path)
            if len(patch) > 262144:
                raise ValueError('DIFF_TOO_LARGE')
            changes.append({'status': status, 'path': path, 'mode': mode, 'patch': patch.decode('utf-8')})
        receipt['changedPaths'] = [x['path'] for x in changes]
        receipt.update(classify(changes, policy))
    except (ValueError, KeyError, TypeError, UnicodeError, subprocess.CalledProcessError) as exc:
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
        identity = dict(zip(('baseSha', 'headSha', 'integrationSha'),
                            [os.environ[k] for k in ('BASE_SHA', 'HEAD_SHA', 'INTEGRATION_SHA')]))
        initial = fetch_pr(os.environ['PR_NUMBER'])
        receipt = evaluate(args.repo, identity, initial, initial, policy)
        # Re-evaluate after classification with a fresh API read; no cached PR text/labels.
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
