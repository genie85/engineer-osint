# ENGINEER OSINT v4.5.13 — one-shot B96 publication slice

Status: **PUBLICATION WORKFLOW FOR REVIEW / B96 STILL NOT PERSISTED**

## Purpose

v4.5.12 made the production Pages pipeline safe for both the current B95 state and the reviewed post-B96 state, and activated the exact B96 append authorization after both required PR workflows passed. The v4.5.12 readiness slice is now merged and deployed from `main`.

v4.5.13 provides the missing execution mechanism for the separately authorized one-run-only B96 publication. It does not hand-edit the append-only store and it does not write B96 directly to `main`.

## Publication model

The workflow `.github/workflows/b96-one-shot-publish.yml` is triggered only when that workflow file itself is added or changed on `main`.

It must fail closed unless all of the following remain true:

- persistent canonical tip is `engineer-osint-20260826-B95`;
- `engineer-osint-20260829-B96` does not already exist;
- `V4511_B96_APPEND_AUTHORIZATION.json` remains `READY_FOR_APPEND`;
- `post_b96_ci_pipeline_ready=true`;
- the authorized B96 candidate SHA-256 is exactly `3d3992f63b84e3b797e91bf4b407e97046f7e0ca2bbb5f1f29f3f5c0426a13f1`;
- the authorized resulting canonical SHA-256 is exactly `4a2dd9dd1756fd15316741ce2488cb69ad17db3986830e7d20eea9b79693dcd5`;
- the isolated result branch `automation/b96-append-result` does not already exist.

## Pre-write proof

Before any write, the workflow re-runs:

- syntax, P0/P1 and append-only chain validation;
- current B95 build, media, runtime and overlay-retirement checks needed by the migration pipeline;
- migration dry-run, provenance and resolved production preview;
- exact Stage A candidate generation;
- standard `append-run.mjs` dry-run;
- exact 104-operation / 15-source and candidate/result hash checks;
- Stage A residual impact, Stage B/C gate, compatibility transition and simulated post-B96 audit.

The standard dry-run must leave the manifest and run count unchanged.

## Guarded write

Only after all pre-write gates pass, the workflow calls the repository-native guarded path:

`node docs/engineer-osint/append-run.mjs <exact-candidate> --write`

That helper independently requires the active authorization, exact parent identity and canonical hash, exact candidate file hash, exact resulting canonical hash, exact operation/source counts and all one-run-only safety restrictions.

After the local append, v4.5.13 immediately runs append-only validation and the persistent B96 audit. B97/B98 must remain absent and the three legacy factual overlays remain active.

## Isolation and review

The workflow removes generated build artifacts and then requires the repository diff to contain exactly two paths:

1. `docs/engineer-osint/data/run-store-manifest.json`
2. `docs/engineer-osint/data/runs/engineer-osint-20260829-B96.json`

It never pushes this generated append directly to `main`. The exact two-file result is committed by GitHub Actions to `automation/b96-append-result`.

That generated branch must then be reviewed through a normal pull request. Because the PR contains canonical data changes, the existing Pages and runtime-audit PR workflows will validate the real persistent POST_B96 state before any merge to `main`.

## Explicitly excluded

This slice does not:

- retire any legacy overlay;
- persist B97 or B98;
- migrate the identity-fix overlay;
- manually edit run-store hashes;
- add unrelated OSINT research delta;
- push append-generated canonical data directly to `main`.
