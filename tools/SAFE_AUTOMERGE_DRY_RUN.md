# Trusted-base advisory classifier

Every receipt is advisory and sets `mergeAuthorized=false`. This is not full QA,
a review approval, an activated auto-merger or a signed permanent audit ledger.

The issuer workflow is `pull_request_target` from the base/default branch. It has
only contents/read and pull-requests/read. It checks out **only github.sha (base)**
and runs only the base helper/policy. There is no candidate-controlled shell or
candidate unit-test job. No secrets or write permissions are supplied. Referenced
Actions are pinned and checkout credentials are not persisted.

The helper reads fresh PR metadata, fetches passive head/integration Git objects
from a fixed public repository, and never checks out/imports/executes those
objects. Git diff disables external diff/textconv. The checked-out HEAD must stay
on base. Both API reads must match base/head/integration; ordered integration
parents, base helper bytes/policy and workflow commit identity are checked.
Receipts carry trusted workflow/helper/policy Git blob identities, exact SHAs,
policy digest, tree SHA, event, run/attempt and `mergeAuthorized=false`.

Consumers must verify those identities against GitHub run provenance, not trust
JSON content or artifact names. A candidate can make a lookalike artifact from
another workflow; it is not an issuer. `pull_request` artifacts must be rejected.
Repository-wide concurrency is advisory only: cancelled/missing/stale receipts
are BLOCK and cannot inherit a prior head's result. Owner writes are not locked.

**Bootstrap is BLOCK.** Until this workflow/helper exist on the trusted base,
there is no trusted target run and no authority to issue an eligible receipt.
Do not manufacture a bootstrap receipt with candidate code. Local evaluation or
absence of a trusted receipt must be recorded as BOOTSTRAP_TRUSTED_GUARD_MISSING.
After a separately reviewed merge, a subsequent docs-only PR can exercise the
base issuer; this task performs no push, PR, merge or activation.

Only plain ASCII Markdown notes at `docs/technical-notes/<name>.md` are initially
eligible for review. Unknown paths and any .github/helper/policy change BLOCK.
Canonical/source data, political fields, governance, secrets/permissions,
license/visibility, deployment/publication, billing and destructive changes BLOCK.
Full before/after note blobs are scanned, not just changed fragments. HTML/entity
syntax, non-ASCII Unicode, control characters and ambiguous encodings BLOCK;
joined alphanumeric scanning detects whitespace/Markdown splitting. This purposely
rejects some harmless notes (including accented text) rather than interpreting
obfuscated content. Expanding the accepted language needs separate review.

The base canonical executor must also match the exact read-only stop-gate hash
pinned by policy. There is no automatic canonical execution or publication.
Successor governance alignment and live GitHub validation remain prerequisites.

Local tests, no install:

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/tests -p test_safe_automerge.py -v

Local tests must be preceded by the task's disk gate. No candidate tests run in
the issuer workflow. A BLOCK classification can finish successfully to preserve
the artifact, so workflow success is never sufficient to allow merge.
