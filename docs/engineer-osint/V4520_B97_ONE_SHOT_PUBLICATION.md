# ENGINEER OSINT v4.5.20 — one-shot B97 publication contract

## Purpose

This slice installs a one-shot GitHub Actions publication mechanism for the already reviewed and activated `engineer-osint-20260830-B97` Intelligence v1 gap migration.

It does **not** append B97 as part of this review PR. The workflow is triggered only when its workflow file is first merged to `main`.

## Exact publication contract

- Parent run: `engineer-osint-20260829-B96`
- Candidate run: `engineer-osint-20260830-B97`
- Candidate file SHA-256: `b6a9a123dbeb9e3eab88f4a746198226b741281744305d66141c8ab5e93150ad`
- Resulting canonical SHA-256: `9c3e7a53379aa252adfafb0adac98e6a898402daee91663d427fc75331b377d4`
- Native Intelligence v1 gaps: 15
- Assessments: 0
- Contradictions: 0
- Factual correction operations: absent
- New sources/media/visuals/factual delta: 0

## Fail-closed sequence

1. Require persistent B96 and an absent B97 run file.
2. Require the active v4.5.19 `READY_FOR_APPEND` authorization and exact hashes/scope.
3. Refuse a second attempt if the isolated result branch already exists.
4. Re-run P0/P1 and append-only canonical validation.
5. Rebuild/audit persistent B96 and B97 readiness.
6. Dry-run the exact stored B97 candidate through the standard `append-run.mjs` helper and prove no persistent mutation.
7. Re-run simulated POST_B97 validation.
8. Execute the guarded standard `append-run.mjs --write` only in the ephemeral Actions workspace.
9. Validate the resulting persistent B97 locally and re-run the persistent B97 audit.
10. Require the working tree to contain exactly two changed paths: the run-store manifest and the new B97 run file.
11. Commit/push those two generated changes only to `automation/b97-append-result`.
12. Require a separate review PR and the normal POST_B97 CI path before any merge to `main`.

## Explicit exclusions

The workflow must not:

- push the append result directly to `main`;
- persist B98 in the same slice;
- materialize any B98 assessment;
- retire or short-circuit the three legacy factual overlays;
- migrate the identity-fix overlay;
- manually edit canonical/file hashes;
- add unrelated factual, source, media, visual, UI, localization or architecture changes to the result branch.

A successful one-shot run therefore means **review branch generated**, not publication success. B97 becomes published only after the generated two-file PR passes POST_B97 CI, is merged, and the production Pages deploy succeeds.
