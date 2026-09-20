# B106 R2 successor-in-place — evidence only

Request `20260920T002323Z-90ad6d3255`, 2026-09-20. Exact merged R1 base
`950d96cfbe4be2979f1dc3a0f30051dd6ed68e6d`, tree
`4ca795c63134c4ee2875ecf921df6e70c9c93977`; original reviewed R1 head
`68a3dab4e97e38a664175d0fdbf6882b7f559703`.

Only the four existing readiness paths are modified: this MD, its JSON,
`audit-b106-readiness-20260919.mjs`, and `tests/b106-readiness-20260919.test.mjs`.
No new repository paths. The previous add-new-files attempt is rejected RED evidence,
not part of this successor's ancestry or implementation.

## Frozen evidence and unchanged facts

The JSON pins all four predecessor paths/modes/Git blobs/raw SHA256 values read
independently from `git show 950d96c:<path>` and checked against `git ls-tree` before
editing. It also pins the predecessor JSON's canonical digest. Generation evidence
and exact predecessor bytes are stored outside the repository; runtime/depth-one
validation uses embedded immutable digests and never loads historical objects.

All R1 factual pins for B105, candidate/result, counts/IDs, assets, lifecycle,
V4695/V4697 and protected helpers/workflows remain unchanged. Candidate raw SHA256:
`56b4896445fd48d201c38a6d807a6600f7fc407f5a1d880c969f579029b6fc76`;
independently recomputed resulting canonical SHA256:
`7dbaa365cadfd690278e5ce085092e99d53828175525ef8ee0779121b6836396`.
The earlier mistyped result hash remains explicitly marked as a discrepancy.

Two distinct completed automated R1 review transcript receipts (security and
independent shallow-CI integrity) retain their verified raw digests and scope.
Exact R1 PR #463 green run IDs, head identities and metadata were re-read:
35476668327, 35476669628, 35476669731, 35476669779, 35476669846.
These establish R1 readiness only. They do not approve this R2 successor or final
B106 execution/browser/publication QA. Fresh independent reviews remain for Hermes.

## Recovery and safety boundary

Distinct R2 schema, status exactly
`BLOCKED_PENDING_STRICT_EXECUTION_AUTHORIZATION_AND_FINAL_QA`.
Every grant and execution-state flag is false; no `authorization` or
`authorized_guard_successor_contract`. The superseded V4695 35-file grant remains
unusable. R1's shallow-CI blocker is closed by its merge; V4697 semantic/final-state
recovery is not declared complete. Execution requires a separately merged strict
dispatcher and exact authorization, plus final/post-append browser/publication QA
in the separately authorized execution slice. Nothing here performs or authorizes it.

Generic append rejects the exact R2 artifact at its blocked status. Negative
fixtures attempt `READY_FOR_APPEND` status/schema promotion; the absent guard
contract still prevents acceptance. Tests invoke the unchanged helper only in
isolated disposable copies and verify every copied byte and path unchanged.
The fixture copies only the real helper/imports, patch schema, unchanged manifest,
snapshot, every registered run, candidate and readiness artifact (52 files).
Copies use separate inodes, with source/copy hashes checked; the full source tree
is also hashed before and after. No mocks, symlinks or hardlinks are used.
This subprocess fixture runs before the parent caches the materialized store,
avoiding simultaneous retention of that store during the child replay.
The 90-second subprocess limit is unchanged; no production helper/data is modified.

Follow-up `20260920T013005Z-eb3ae896a6` supersedes the earlier timeout attribution:
minimal copying alone still timed out, as did an experimental child heap cap
(which was removed). Historical timeout logs are preserved. A complete focused
PASS is required, rather than treating a timeout or a single-case retry as PASS.
Evidence: `/home/nina/reports/engineer-b106-r2-timeout-fix-20260920/`.

The current HEAD inventory still excludes exactly the same four ALLOWED paths.
Its digest remains `f0e2ce66b95b2b9781da1cfe024f7df85e3431ad530400e4b00dc1cb7862f57e`,
binding all other 559 paths, modes and blobs. Dirty/untracked unrelated paths reject.
No branch-name, remote-ref, ancestor or local-only-commit dependency. This is content
identity, not remote freshness or cryptographic attestation of historical receipts.

## Validation evidence

RED first for successor fields, then focused/adversarial schema and type mutations,
duplicate/escaped duplicate keys, non-finite values, stale/replayed evidence, exact
inventory, separate execution rejection and generic append rejection without mutation.
Detached depth-one checkout and selected non-browser suite verify the exact final
commit. Three historical append-simulation cases and three browser files retain the
explicit earlier exclusions; no unqualified full/browser or remote CI PASS is claimed.
Commands, counts, exact pins/diff and before/after inventory are recorded in
`/home/nina/reports/engineer-b106-r2-in-place-20260920/`.

**B106_EXECUTION_PERFORMED=false.** Local commit only; no real append, browser,
push, PR, merge, publication, deploy, config/service/cron or dependency changes.
