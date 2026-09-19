# B106 blocked readiness review — 2026-09-19

Mailbox `20260919T231103Z-887cdb0595`. Clean local commit directly above exact base
`b7d0ff9ecfde01eade12f2c362a3d330a277d7db`, on new branch
`agent/codex/b106-readiness-ci-20260919`, new isolated worktree
`/home/nina/worktrees/engineer-b106-readiness-ci-20260919`.
Reviewed readiness file bytes were sourced from `d53163ad1823504fba7d7cae5232df0be2c90d34`.
The old worktree/commits remain unchanged audit evidence; neither is a runtime dependency.

## Security correction

An earlier local authorization artifact was unsafe: the generic explicit append accepted its authorization
shape despite the separate blocked execution gate. A standalone audit could not
protect a direct call to the unchanged helper. The predecessor must not be pushed,
merged or used for execution.

The final tree removes `B106_APPEND_AUTHORIZATION_20260919.json`. Its replacement,
`B106_APPEND_READINESS_REVIEW_20260919.json`, is evidence only:
- distinct schema `engineer-osint-b106-append-readiness-review-20260919-v1`;
- status `BLOCKED_PENDING_SEPARATE_EXECUTION_AUTHORIZATION`;
- no `authorization` or `authorized_guard_successor_contract` fields;
- every entry in `grants` is false: zero append, canonical, manifest, lifecycle,
  history, candidate, asset, workflow, runtime, executor, push, PR, merge, publish
  or deploy authority.

The generic helper rejects the exact artifact at its existing status check. Even
promoting only the status (or status plus schema) fails its guard-contract check.
The strict standalone readiness auditor rejects all changed, unknown, missing or
mistyped payload fields, including promotion attempts. It does not manufacture an
execution authorization or invoke an executor. No helper/workflow was modified.
This protects this exact readiness artifact; it does not claim that an actor able
to author an entirely different authorization is prevented by the generic helper.

Actual append requires a later separately reviewed strict execution-authorization
successor and V4697 recovery/final-state evidence. Readiness validation always
reports `execution_allowed=false`. Same-slice and separate-slice execution attempts
through this artifact are rejected. No recovery or postmerge receipt is invented.

## Exact evidence and hash discrepancy

Candidate:
`osint-publication-candidates/v4653-b106-wave3-v4588-local-images-public-cz.json`.
Run `engineer-osint-20260904-B106`, parent `engineer-osint-20260904-B105`.
Candidate raw SHA256:
`56b4896445fd48d201c38a6d807a6600f7fc407f5a1d880c969f579029b6fc76`.
Parent canonical SHA256:
`a54077cf8765b5a1e53bea3680305e0c92ee51494a092ae09820e15db6a604b9`.
Independently recomputed in-memory resulting canonical SHA256:
`7dbaa365cadfd690278e5ce085092e99d53828175525ef8ee0779121b6836396`.

The new mailbox instead supplied
`7dbaa3654c8e08aca298c755a99a165f26a033d84af34a3902fa4842b6836396`.
That value does not match the unchanged repository candidate applied to actual B105.
The readiness artifact pins the verified result, records both values and explicitly
reports the discrepancy; it does not alter source data to fit the request's value.

Exactly two updated cards `ENG-TECH-0038`, `ENG-TECH-0041` and two visuals
`ENG-VIS-LOCAL-0038`, `ENG-VIS-LOCAL-0041`; other collection additions zero.
Candidate counts, IDs, no-write flags, raw/normalized bytes, B105 state, resulting
state, exact assets, acquisition, lifecycle source/successor, V4695/V4697, manifest,
helper, executor and workflow identities remain pinned. The superseded V4695
35-file grant is not reused. No Drive/Task lineage acceptance is implied.

## Shallow-checkout validation boundary

The prior readiness implementation failed because `git show`/`merge-base` required
an unavailable local predecessor. It also assumed an authoring branch, `origin/main`
and base history. The failure was reproduced first in a fresh detached disposable
checkout containing exactly base plus a fixture head made from the reviewed bytes,
without either intermediate local commit object: four RED failures.

Runtime validation now reads only current HEAD's recursive NUL-delimited Git inventory,
removes exactly the four readiness paths and SHA256-checks the remaining inventory
against the embedded reviewed base digest:
`f0e2ce66b95b2b9781da1cfe024f7df85e3431ad530400e4b00dc1cb7862f57e`.
This binds all 559 base file paths, modes, object types and blob IDs. Missing, added,
renamed, mode-changed or content-changed base entries cannot silently pass. Current
worktree changes and untracked files remain restricted to the four readiness paths.
No `git show` of a predecessor, historical diff, merge-base, remote tracking ref,
branch-name check, fetching, or workflow change is needed. Detached `fetch-depth: 1`
is supported. The immutable JSON digest still closes the full readiness schema.

This checks exact base content identity, not Git ancestry or live remote-main
freshness. Those are recorded separately by the authoring handoff. The readiness
artifact grants zero execution authority on any branch or checkout depth. A later
execution-authorization review must establish its own exact fresh base and recovery.
Authorization-shaped replay is tested with an embedded adversarial object; no old
commit object is loaded. The source readiness and rejected authorization raw hashes
are provenance only. Exact candidate/result/asset/lifecycle checks remain in force.

The generic append regression copies data/code into a newly created disposable
directory with no symlinks. Only there it invokes the unchanged helper with
`--write --authorization`, expecting rejection for the exact artifact and two
status/schema promotion mutations. Complete before/after file sets and raw hashes
must match: no run, manifest or staging temp mutation. No append command is run
in the working repository. Scratch is removed after verification; no browser runs.
Disk gates precede QA and temporary copying.

Final verification includes focused tests, a fresh clone containing only exact
base plus final head, and detached depth-one checkout without base or intermediate
commit objects. The selected non-browser suite retains three historical append
simulation exclusions (v4606, v4618, v4642) and excludes three browser files
(v4620 browser discovery, v4642 browser discovery, v4645 CC0 rediscovery).
No unqualified full-suite/browser or remote GitHub CI PASS is claimed.
Exact commands, counts, clone topology, negative mutation checks and immutable
source inventories are in `/home/nina/reports/engineer-b106-readiness-ci-20260919/`.

Base-to-head scope is exactly four new readiness-review files. All 559 preexisting
base files remain byte-identical. A single local commit has the exact base as parent;
no unsafe predecessor is in the submitted commit chain. No push, PR edit, merge,
publish, deploy, configuration, service, cron or activation.
**B106_EXECUTION_PERFORMED=false**.
