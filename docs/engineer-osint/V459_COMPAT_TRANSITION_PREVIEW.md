# ENGINEER OSINT v4.5.9 — compatibility transition preview

Status: **READ-ONLY / FAIL-CLOSED PREVIEW**

This slice asks a narrower question than overlay retirement: if the reviewed B96 factual/source candidate, B97 native-gap candidate and B98 evidence/assessment candidate were materialized exactly, could the first three legacy factual overlays later be short-circuited without losing the intended public semantics?

The answer is evaluated entirely in memory. No append-only run is written and no runtime overlay is changed.

## Full-native transition guard

`lib/overlay-transition-guard.mjs` does not trust a run ID alone. A future short-circuit is allowed only if the materialized state contains the full reviewed transition contract:

- B98 is the current materialized hypothetical tip and the B95→B96→B97→B98 chain matches;
- all 104 Stage A operation targets contain the reviewed values;
- all 104 Stage A operation IDs are present in the canonical change log;
- all 15 reviewed Stage A primary sources are present with the reviewed source payload;
- all 15 B97 native Intelligence v1 gaps are present;
- all four B98 native assessments are present;
- both B98 evidence objects are present;
- every assessment retains explicit target-linked and reviewed-source-linked evidence.

The v4.5.9 audit also proves fail-closed behavior by corrupting six independent parts of a post-B98 clone: one gap, one assessment, one evidence object, one reviewed source, one Stage A factual value and one operation-log entry. Every case must block the guard.

## Zero-mutation preview

The first three legacy overlays still produce the reviewed post-B98 residual debt when executed normally. v4.5.9 then simulates a wrapper that skips each of those modules only when the full guard passes. Under the exact B96+B97+B98 materialization this prospective guarded path must produce zero mutations for all three modules.

This is not yet production behavior. The overlay files are intentionally unchanged and persistent B95 must fail the guard.

## Public analytical semantics

The transition is semantic, not byte/layout equivalent:

- all 15 legacy intelligence-gap questions must be preserved exactly as B97 native gap questions;
- the four B98 assessments are reviewed replacements for legacy `what_it_does_not_prove`, `why_it_matters`, `staff_relevance` and `training_relevance` fields, including deliberate narrowing where the reviewed primary evidence does not support the older broader wording;
- both B98 evidence objects remain target- and source-linked;
- explicit no-write decisions from Stage A remain no-write.

The public situation hub and V4.3 entity detail already consume native `assessments` and `intelligence_gaps`. The entity detail therefore keeps the reviewed analytical content visible in `Current Assessment` and `Intelligence Gaps` even though dedicated legacy relevance-section placement is not required to remain identical.

## Artifacts

Pages publishes:

- `overlay-compat-transition-preview.json`
- `overlay-compat-transition-preview.md`
- `overlay-compat-transition-guard-spec.json`

The guard-spec artifact records the exact reviewed operation/source/gap/assessment/evidence identifiers and candidate hashes for later runtime-transition work.

## Safety

A PASS means only that a full native B96+B97+B98 materialization is sufficient for a fail-closed prospective short-circuit of the first three overlays while preserving the reviewed analytical semantics.

It does **not** mean:

- B96/B97/B98 may be appended automatically;
- the legacy overlays are currently removable;
- persistent B95 satisfies the guard;
- the separate identity-fix overlay is resolved;
- runtime short-circuiting is enabled.

`safe_to_append=false`, `safe_to_retire_overlays=false`, `short_circuit_enabled_in_production=false` and `canonical_write_performed=false` remain mandatory.
