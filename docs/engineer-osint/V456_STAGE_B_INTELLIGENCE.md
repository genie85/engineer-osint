# ENGINEER OSINT v4.5.6 — Stage B Intelligence v1 readiness

Status: **READ-ONLY ANALYTICAL MIGRATION GATE**

v4.5.6 follows the exact reviewed B96 Stage A candidate without persisting B96 or creating a manifest entry. It separates the 19 legacy analytical fields from factual migration and applies the native `extensions.intelligence_v1` contract.

## Gap materialization

The 15 legacy `intelligence_gaps` fields are mapped one-to-one to proposed `ENG-GAP-B97-OVL-*` objects in a chained `engineer-osint-20260830-B97` candidate. The migration deliberately does not invent priority: `priority=UNASSESSED`, `status=OPEN`, and the target record remains in `related_ids`. `sources_checked` contains only the reviewed source IDs associated with the legacy gap candidate after the B96 source append is simulated.

The B97 gap-only patch is validated through the same strict materializer used by the append-only run store, but only against the in-memory B96 result.

## Assessment/limitation gate

Four legacy fields require native assessments rather than factual fields:

- `ENG-EVT-0021.what_it_does_not_prove`
- `ENG-SIG-0006.staff_relevance`
- `ENG-SIG-0006.training_relevance`
- `ENG-SIG-0006.why_it_matters`

They are not automatically materialized. Intelligence v1 requires both `source_ids` and non-empty `supporting_evidence_ids`. The audit therefore searches canonical evidence only through explicit structural relationships (`record_id`, `related_record_id`, `target_id`, `related_ids`, `related_record_ids`) and requires an intersection with the reviewed source IDs. Text similarity, topic similarity, shared geography or model inference are not acceptable evidence bindings.

Even an explicit same-target/source evidence match remains `CURATOR_APPROVAL_REQUIRED`; it is not automatically promoted to supporting evidence for a specific analytical conclusion. If no such evidence exists, the assessment remains `EVIDENCE_BINDING_REQUIRED`.

## Post Stage A+B residual audit

After B96 and the gap-only B97 are simulated, the three legacy overlays are re-run in runtime order. Their factual residual signatures may not expand beyond the reviewed Stage-A residual set. This confirms that native Intelligence v1 gap preservation does not introduce a new factual mutation path.

Native gap materialization does not itself make the old `record.intelligence_gaps` writes disappear. A later transition slice must explicitly stop/remove those compatibility writes only after the public UI consumes the native Intelligence v1 objects and a public-output comparison proves no intended analytical content is lost.

## Safety

- B96 remains a dry-run candidate.
- B97 remains an in-memory/read-only candidate.
- no manifest or `data/runs` file is written;
- no assessment is created without explicit evidence binding and separate approval;
- `safe_to_append_stage_a=false`;
- `safe_to_append_stage_b=false`;
- `safe_to_retire_overlays=false`;
- `data-integrity-identity-fixes.js` remains outside this migration slice.
