# ENGINEER OSINT autonomous development roadmap

This file is an operational roadmap for the hourly autonomous-development task. It is not an authoritative source of OSINT facts and it must not replace the canonical data/run-store lineage.

## Safety model

- One development slice at a time.
- Existing open autonomous-development PR takes precedence over new work.
- Production regressions, red CI, Pages failures and canonical-integrity failures are P0.
- No canonical-history rewrite, append-only run rewrite, manual historical-hash edit or unverified factual publication.
- No image is copied into the repository unless redistribution rights are documented.
- Historical migration evidence is retained unless a dedicated regression-tested retirement explicitly authorizes removal.

## Operational optimization rule — consolidated read-only preparation

When several read-only steps serve the same future authorization and do not mutate canonical state, history, workflow permissions or another protected state, combine them into one read-only slice/PR when practical instead of creating separate sequential discovery PRs.

The combined read-only slice may include:

- discovery and source/contract inspection;
- deterministic candidate simulation;
- readiness evidence;
- exact candidate, successor, lifecycle and browser/DOM hash or digest discovery;
- downstream compatibility review;
- expected-successor precomputation.

Use this consolidation only when all included steps share the same logical target and future authorization boundary, remain independently auditable, preserve the one-active-write-slice rule, and do not weaken fail-closed or exact-head CI. Pin deterministic outputs explicitly where useful.

If any included step requires a protected mutation, expands write authority, changes safety semantics or belongs to a materially different authorization boundary, split it into a separate slice.

## Phase A — post-v4.5.46 consolidation

Goal: reduce migration-era technical debt without weakening the proven v4.5.46 production contract.

1. Inventory B96/B97/B98/B99 one-shot, readiness, candidate and retirement workflows.
2. Classify every migration-era workflow and audit as one of:
   - `ACTIVE_PRODUCTION_PROTECTION`
   - `HISTORICAL_EVIDENCE_KEEP`
   - `REMOVABLE_CI_DEBT_CANDIDATE`
3. Before deleting any workflow, add or identify regression coverage proving that its active safety role is redundant.
4. Preserve B96-B99 lineage and the v4.5.46 invariants:
   - active legacy factual overlays = 0;
   - active legacy baseline modules = 0;
   - identity-fix historical source retained;
   - transition guard retained until separately reviewed;
   - B99 hashes unchanged.
5. Simplify lifecycle branches, health aliases and duplicated migration checks only after classification.

### Immediate next slice

Create a machine-readable workflow inventory with trigger classification and dependency references. Do not delete workflows in the same slice as the initial classification.

## Phase B — CI modernization

1. Inventory GitHub Actions that still target deprecated Node.js runtimes.
2. Upgrade supported action versions and standardize Node.js 24 where appropriate.
3. Extract duplicated P0/P1, canonical-chain, PUBLIC-CZ and browser checks into reusable workflows where this preserves equivalent or stronger gates.
4. Measure CI duration before/after changes.
5. Preserve Pages artifact verification and production browser regressions.

## Phase C — B100+ canonical pipeline

Target flow:

`source -> candidate -> validation -> append-only run -> canonical data -> build -> publish`

Develop candidate diffs, lineage validation, SHA-256 gates, review reports, direct-canonical-edit protection and recovery without history rewrites. Runtime overlays are not the normal data-correction mechanism.

## Phase D — graphic and UX development

Use small measurable UI slices rather than a single redesign.

Priorities:

- design tokens and typography;
- card hierarchy and media placement;
- spacing/grid/responsive behavior;
- full-text and combined filters;
- active-filter state and result counts;
- mobile filter UX;
- keyboard navigation, focus states, ARIA and contrast;
- performance and layout stability.

Any material UI/runtime change requires browser regression; visual before/after evidence should be captured when practical.

## Phase E — photo coverage

Long-term KPI: at least one relevant local image for every information card where redistribution is legally permitted.

Track:

- total cards;
- cards with local image;
- cards without local image;
- license-blocked cards;
- no-suitable-image-found cards;
- photo coverage percentage.

Preferred source order:

1. official manufacturer;
2. ministry of defence / armed forces / government source;
3. NATO or equivalent official organization;
4. Wikimedia Commons;
5. another trustworthy source with explicit redistribution terms.

A repository copy requires documented redistribution rights, such as Public Domain, CC0, CC BY, CC BY-SA or another clearly compatible license. Unclear copyright means no local copy.

For each accepted image retain at least record/card ID, original URL, author/rightsholder, source, license, license URL where available, acquisition date and local SHA-256. Honor attribution requirements. Use responsive/lazy-loaded local images, thumbnails, alt text and a fallback.

Process images in small auditable batches.

## Phase F — OSINT content growth

Expand engineering equipment, bridging, obstacles, mining/demining, C-IED, EOD, RCP, UGV/autonomy, detection, military construction equipment, modernization programs and battle-tested lessons learned. Prefer primary/official evidence and preserve the relationship:

`claim -> evidence -> source -> date -> confidence`

## Phase G — evidence quality and freshness

Build review backlogs for dead URLs, stale evidence, missing primary sources, single-source claims, source conflicts, low confidence and long-unverified records. Do not delete historical facts merely because an URL disappears.

## Phase H — automated OSINT intake

Later target:

`monitoring -> candidate -> deduplication -> extraction -> evidence validation -> review -> canonical append`

AI-generated extraction is a candidate, not a source and not an automatic publication authorization.

## Phase I — analytical layer / knowledge graph

After canonical identities are stable enough, model systems, variants, manufacturers, countries, users, conflicts, events, contracts, technologies, sources and evidence plus their relationships.
