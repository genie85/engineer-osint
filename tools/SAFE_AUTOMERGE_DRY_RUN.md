# Advisory safe-automerge dry-run

This is a deterministic diff classifier, not an auto-merger or a full QA receipt.
Every result sets `mergeAuthorized=false`. `ELIGIBLE_FOR_REVIEW` only means the
small allowlist matched. Two independent reviews and all relevant QA are still
required. Labels, PR text and agent claims are not inputs.

The initial allowlist is deliberately limited to single Markdown files under
`docs/technical-notes/`. All other paths are BLOCK, including application code,
tests, workflows, canonical/source data, permissions, credentials, license,
visibility, publication, deletion and governance. Protected terms in changed
content also BLOCK. Expansion of this allowlist requires a separately reviewed
policy change; this bootstrap PR itself must BLOCK.

The classifier checks the checkout, ordered integration parents, integration tree,
policy digest, and fresh GitHub base/head/integration identities before and after
classification. It requires the exact reviewed read-only canonical-execution
stop-gate workflow on the base. Until that separate prerequisite lands, it BLOCKs.
No classifier result authorizes the old privileged canonical executor.

The pull_request workflow runs unit tests in a read-only job. Classification is
in another read-only job; its Python helper and policy are extracted from the
exact PR base, never the candidate head. On the bootstrap PR the base has no
trusted guard: the expected receipt is `BLOCK / BOOTSTRAP_TRUSTED_GUARD_MISSING`.
The workflow itself is still PR-supplied during bootstrap, so its artifact is
advisory and must never be accepted as an independent approval or merge authority.
All referenced Actions are pinned to full commit SHAs. Checkout credentials are
not persisted. There is no third-party secret, private token, write permission,
merge command, deployment, or pull_request_target trigger.

Repository-wide workflow concurrency prevents running these classification jobs
simultaneously and does not cancel an active run. GitHub may supersede pending
runs; a missing/cancelled receipt is BLOCK, never inherited from another head.
This concurrency does not serialize unrelated workflows or owner writes. Fresh
API reads do not provide an atomic base precondition for a future merge. That
server-side enforcement and trusted independent review infrastructure are outside
this draft and remain activation blockers.

A completed dry-run workflow means an observation completed, not that the PR may
merge. BLOCK returns zero only to preserve the advisory artifact; consumers must
validate `decision`, `scope`, exact identity, provenance and `mergeAuthorized`.
Retention is seven days. Artifacts can disappear and are not signed permanent
audit records; this workflow must not be configured as a sufficient required
merge check. API failure, dirty checkout, stale SHA, unknown/missing diff and
unapproved base executor all produce BLOCK or an absent receipt.

Local regression command (no installs):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/tests -p test_safe_automerge.py -v

Rollback after any future separately approved merge: stop consuming advisory
receipts; revert the draft workflow through normal reviewed Git. Never reactivate
the privileged canonical executor as a rollback shortcut. This change does not
alter Pages, repository settings, credentials or any live service.
