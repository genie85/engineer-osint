# ENGINEER OSINT v4.5.12 — post-B96 CI readiness

Status: **IMPLEMENTED FOR REVIEW / AUTHORIZATION REMAINS BLOCKED UNTIL FULL PR PAGES PASS**

## Purpose

The exact Stage A B96 candidate is already reviewed and byte-stable, but the pre-v4.5.12 Pages migration-preview chain assumes persistent B95. Persisting B96 before fixing that lifecycle coupling would turn a correct append into a deployment failure.

v4.5.12 makes Pages validation explicit about canonical migration phase without weakening any pre-B96 proof.

## Migration phases

### PRE_B96

When the persistent run-store tip is `engineer-osint-20260826-B95`:

- all existing v4.5.0–v4.5.10 migration, provenance, Stage A/B/C and compatibility-transition gates still run unchanged;
- the exact B96 candidate is still validated only by `append-run.mjs` dry-run;
- a new post-B96 audit applies that exact candidate only in memory and proves the future B96 state is acceptable for Pages validation;
- no canonical write occurs.

### POST_B96

When the persistent tip is `engineer-osint-20260829-B96`:

- stale pre-B96 candidate-generation and B95-only Stage B/C preview steps are not run as current-state gates;
- the current canonical chain, build, media, runtime, overlay-retirement, PUBLIC-CZ and i18n gates still run;
- `audit-persistent-b96.mjs` verifies the actual immutable B96 manifest entry and run file against the exact reviewed authorization;
- the first three legacy overlays are re-executed and must match the reviewed post-Stage-A residual baseline exactly;
- the runtime transition guard must still short-circuit 0/3 overlays because B97/B98 do not yet exist.

Any other persistent migration tip is fail-closed until a later lifecycle slice explicitly supports it.

## Reviewed residual baseline

The successful v4.5.11 Stage A impact audit is pinned as `V4512_POST_B96_RESIDUAL_BASELINE.json`:

- 61 residual signatures;
- 81 factual leaf mutations;
- 17 / 35 / 9 signatures across the three reviewed rich factual overlays;
- 0 unexpected signatures.

This is transition debt, not a waiver. It exists to prove that a real B96 append produces exactly the reviewed Stage A state and nothing else.

## Pages workflow

The Pages workflow now runs its full build on pull requests as validation-only and deploys only for non-PR events. PRE_B96 and POST_B96 paths are selected from the immutable run-store tip. The final freshness gate is implemented in `verify-pages-artifact.mjs` and preserves the former pre-B96 checks while adding a separate post-B96 contract.

## Authorization lifecycle

During initial review, `V4511_B96_APPEND_AUTHORIZATION.json` remains `BLOCKED_PENDING_POST_B96_CI_READINESS` and `post_b96_ci_pipeline_ready=false`.

Only after the v4.5.12 PR passes both the existing runtime audit and the new full Pages PR workflow may a final commit in this same slice set:

- `status=READY_FOR_APPEND`;
- `post_b96_ci_pipeline_ready=true`.

That activation does not append B96. The real B96 append remains a separate one-run-only publication slice using the standard guarded `append-run.mjs --write` path.
