# ENGINEER OSINT v4.5.7 — assessment evidence binding

Status: **READ-ONLY EVIDENCE + INTELLIGENCE V1 GATE**

v4.5.7 follows the hypothetical B96 Stage A and B97 gap-only candidates without persisting either run. It resolves the four assessment blockers identified by v4.5.6 by creating explicit source-scoped evidence candidates first, then validating four narrower native Intelligence v1 assessment candidates against those evidence IDs.

## Evidence-first rule

An assessment is allowed only when its supporting evidence:

1. has an explicit structural relationship to the same target record;
2. uses a reviewed primary source also cited by the assessment;
3. states what the source supports and what it does not prove;
4. does not convert absence in a public source into a claim about real-world absence;
5. does not preserve analytical implications that exceed the reviewed source.

## Evidence candidates

### Türkiye — `ENG-EVT-0021`

The reviewed Turkish Ministry of National Defence source supports the named 2nd Army Engineer Brigade, completion of a 240 m floating bridge over the Euphrates in Deir ez-Zor, and planned opening after control crossings. The evidence object explicitly records that the reviewed public statement does not identify the bridge model, module count, MLC, construction time, traffic capacity, ferry configuration or intended duration. This is encoded as a **source-scope limitation**, not as evidence that those attributes were absent in reality.

### U.S. Army — `ENG-SIG-0006`

The reviewed official Army Europe/Africa-hosted DVIDS metadata supports a 22 June 2026 annual-training proof-of-concept by Bravo Company, 741st Brigade Engineer Battalion using a heavy-lift drone to remotely deliver and detonate a live Bangalore torpedo. The official description explicitly links the effort to reducing Soldier risk during wire-obstacle breaching and exploring future tactics, techniques and procedures.

The same source does **not** establish Army-wide fielding, approved doctrine/TTP, program-of-record status, EW resilience or performance in a contested electromagnetic environment.

## Four native assessments

The B98 candidate creates:

- one source-scope limitation assessment for `ENG-EVT-0021.what_it_does_not_prove`;
- a narrowed `why_it_matters` assessment for `ENG-SIG-0006`;
- a narrowed `staff_relevance` assessment for `ENG-SIG-0006`;
- a narrowed `training_relevance` assessment for `ENG-SIG-0006`.

The staff/training versions deliberately remove the legacy claims about EW resilience and contested-electromagnetic failure modes because the reviewed primary material does not establish them.

Together with the 15 B97 gaps, B98 therefore provides a structurally valid native path for **19/19 analytical migration candidates**. This does not mean the legacy record-level fields can yet be removed.

## Residual and retirement rule

After B96+B97+B98 are applied in memory, the three legacy overlays are executed again. They may not introduce any factual residual signature that was not already present after B97. Native Intelligence v1 preservation and legacy record-level compatibility fields are intentionally treated as separate concerns.

A later transition slice must prove that the public UI can consume the native objects and then make or remove the old compatibility writes without losing intended public content. Only after that can the zero-current-mutation retirement gate be re-evaluated.

## Safety

- B96, B97 and B98 remain unpersisted candidates.
- No manifest or `data/runs` file is changed.
- Evidence IDs are allocated only inside the simulated chain from the current B95 canonical state.
- No assessment is created from source IDs alone.
- `safe_to_append=false`.
- `safe_to_retire_overlays=false`.
- `data-integrity-identity-fixes.js` remains outside this slice.
