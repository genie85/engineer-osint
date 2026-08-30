# ENGINEER OSINT v4.5.11 — exact B96 production append authorization

Status: **PROPOSED ON BRANCH / EFFECTIVE ONLY AFTER MERGE TO MAIN AND SUCCESSFUL CURRENT-MAIN VALIDATION**

## Purpose

v4.5.10 installed the fail-safe runtime transition guard and passed production Pages validation while the persistent canonical tip remained `engineer-osint-20260826-B95`. The next roadmap step is the separately reviewed real Stage A append.

This slice does **not** append a run. It creates the explicit authorization contract required before a later dedicated append-only publication slice may persist B96.

## Exact reviewed candidate

Only the following candidate may be authorized:

- run: `engineer-osint-20260829-B96`;
- parent: `engineer-osint-20260826-B95`;
- parent canonical SHA-256: `dc0dae682004554a8f9a0dafbbd31187b9baebd2c325e9e37e503d6aa8bcabae`;
- 104 reviewed `REPLACE_FIELD` operations;
- 15 reviewed primary-source appends;
- candidate file SHA-256: `3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1`;
- expected resulting canonical SHA-256: `4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5`.

These values were produced by the standard `append-run.mjs` dry-run in the successful v4.5.10 Pages build from baseline main `c941446e7e358ed1c0e3ccc9e355413c9658701f`.

## Why the v4.5.5 `safe_to_append=false` flag remains unchanged

`V455_STAGE_A_CANDIDATE.json` is intentionally an immutable no-write review policy. Rewriting that historical review artifact to `safe_to_append=true` would weaken provenance and blur the distinction between a preview and a production authorization.

Therefore v4.5.11 authorizes persistence externally and narrowly. The later production slice must regenerate the candidate from current `main` and prove it is byte-identical to the reviewed candidate before invoking the standard append helper with `--write`.

## Mandatory preconditions for the later append slice

All conditions must hold immediately before any write:

1. persistent run-store tip is still B95;
2. parent canonical SHA is still the reviewed B95 SHA;
3. regenerated B96 candidate SHA equals the exact reviewed candidate SHA;
4. append-run dry-run reproduces the exact expected resulting canonical SHA;
5. no competing PR or commit changes the run-store, candidate inputs, schema, strict materializer, overlay migration inputs or factual layer;
6. all current mandatory tests/audits remain PASS;
7. the authorization policy itself is present on `main` with `status=READY_FOR_APPEND`.

Any mismatch makes the authorization stale and blocks the write.

## Scope restrictions

The production append slice may contain only the single B96 immutable run and its deterministic manifest update produced by the standard append-only helper. It must not include B97, B98, overlay retirement, identity-fix migration, UI/localization changes, schema changes, manual hashes or unrelated cleanup.

After B96 is persistently appended and deployed, all current-main validation must be rerun before B97 is considered. The first three legacy overlays remain active during this step.
