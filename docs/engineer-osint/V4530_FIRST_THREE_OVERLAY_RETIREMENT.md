# ENGINEER OSINT v4.5.30 — first-three factual overlay retirement

Status: **REVIEWED RETIREMENT SLICE**

This slice retires exactly the first three transition-guarded factual overlays from the active public runtime after the persistent B98 migration and v4.5.29 semantic-parity gate passed on `main`.

## Retired from active runtime

- `rich-backfill.js`
- `rich-backfill-israel-turkiye-eod.js`
- `rich-backfill-usa-rok.js`

The files remain in the repository as historical migration artifacts. They are no longer entries in `LEGACY_FACTUAL_OVERLAY_MODULES`, are no longer members of `TRANSITION_GUARDED_LEGACY_OVERLAY_FILES`, and are removed from the active legacy overlay baseline.

## Explicitly not retired

`data-integrity-identity-fixes.js` remains active, remains in the legacy overlay baseline, and remains outside the transition guard. This slice does not authorize its migration or retirement.

The transition guard runtime itself stays installed. With an empty guarded-file set it is inert; deleting it is a separate cleanup concern and is not required for this retirement.

## Immutable pre-retirement reference

The retirement is reviewed against `main` commit `7f7d08867052716d95ba75472afbafdcee4484ef` and the successfully deployed v4.5.29 Pages artifact.

The pre-retirement public runtime data digest after identity-fix plus localization is pinned to:

`3633ba18cc69e06bdc72ca574157d901da5b43644993b4c8760e6302b728460f`

The retirement audit must reproduce that digest exactly after the first three modules are absent from the active runtime.

## Required gates

The retirement PR must fail closed unless all of the following pass:

1. exact B98 historical lineage/hash integrity;
2. all 15 B97 gaps, 2 B98 evidence objects and 4 B98 assessments remain present;
3. active runtime contains only the identity-fix legacy factual overlay;
4. the three retired runtime script IDs are absent from the built artifact;
5. identity-fix remains present in the built artifact;
6. the three historical overlay files remain byte-identical to their reviewed archived hashes;
7. active legacy baseline contains only identity-fix;
8. public runtime data digest equals the pinned v4.5.29 pre-retirement digest;
9. P0/P1, canonical chain, runtime, PUBLIC-CZ, Pages and headless-browser retirement regression all pass;
10. no canonical run, run-store manifest, canonical data, identity-fix migration or unrelated runtime removal occurs.

This is a runtime-debt retirement slice, not a factual publication run. No append-only canonical run is created.
