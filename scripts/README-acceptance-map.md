# Per-finding acceptance evidence index

This standalone tool structurally checks a **noncanonical evidence index**. It
records dispositions supplied by the content owner; it never decides whether a
claim is true, accepted, published, or eligible for import or cleanup. No existing
canonical, handoff, runtime, governance or publication contract consumes it.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/acceptance_map.py \
  scripts/fixtures/acceptance-map.synthetic.json \
  --expected-main-sha dddddddddddddddddddddddddddddddddddddddd
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s scripts/tests -p test_acceptance_map.py
```

The fixture is entirely synthetic, including its hashes, record/run IDs and
proof references. For a real private index, pass its explicit local path and the
freshly observed main SHA. The caller obtains that SHA; the tool does no network
requests. A mismatch requires revalidation by the owner, not automatic rewriting.

## Format: `engineer-osint-acceptance-map-v1`

The JSON root contains `schema_version`, `classification` (always
`NONCANONICAL_EVIDENCE_INDEX`), `observed_main_sha`, `authority`, and `findings`.
All four authority flags (`canonical_import`, `publication`, `drive_cleanup`,
`state_transition`) must be the boolean `false`. Unknown fields and duplicate
JSON keys are rejected. The synthetic fixture shows the complete field layout.

Each finding connects:

| Field | Meaning |
| --- | --- |
| `source` | File ID, revision or explicit unknown-revision reason, raw SHA-256, `fresh`/`inherited`/`unknown` hash provenance, and its evidence or limitation reference. |
| `finding_id`, `source_locator` | Finding identity scoped to file/revision/hash, and a JSON Pointer to the source finding. Duplicate scoped IDs are rejected. |
| `recorded_disposition`, `disposition_evidence` | Content owner's reported assessment and its decision reference or explicit limitation. The validator never changes it. |
| `accepted_scope`, `remaining_scope` | Bounded accepted and outstanding parts; no identical entry may appear in both. |
| `canonical_evidence` | Exact commit, run/record IDs, repository-relative path, JSON Pointer, run raw hash, and verification reference. |
| `publication_evidence` | Separate list of exact commit plus publication receipt reference. An empty list does not mean published; publication proof cannot substitute for canonical proof. |

Disposition meanings:

- `accepted`: the content owner reports evidence for the whole **bounded finding**;
  nonempty accepted scope and canonical proof references are required.
- `partial`: only the specified accepted scope is supported; a remaining scope
  is required. This cannot be silently promoted to accepted.
- `unresolved`: a documented outstanding question or conflict, not an acceptance.
- `unknown`: insufficient observation, identity or assessment; not a rejection.

Accepted/partial entries require a recorded fresh raw-hash observation. That is
still a **reported** observation: neither its truth nor the evidence reference is
verified by this tool. Unknown revisions are allowed only with an explicit reason;
never invent one. Unknown/inherited identities must not be silently marked fresh.

A structural PASS cannot establish factual equivalence, canonical membership,
receipt authenticity, review independence, legal/media clearance, deployment,
or completeness. Even all known findings being accepted cannot establish that
an entire file is implemented or authorize archiving it. Counts describe supplied
rows only. The tool always reports factual/canonical/publication verification as
`NOT_RUN` and global completeness as false; it prints no input IDs or evidence.

Keep real maps and source identities in the already approved private transport,
not this public repository. Preserve earlier observations and source bytes;
record later assessments separately rather than editing historical evidence.
This version checks one supplied snapshot, not a storage, versioning or
append-only service. It has no automatic state transitions or consumers.

The checker reads an explicitly selected file and writes only a count summary
to stdout. It does not fetch URLs, open referenced paths, write files, import
facts, move Drive documents, or modify canonical/history/governance. Do not wire
it into those decisions merely because its output says PASS.

Current workflows do not run `scripts/tests/test_acceptance_map.py` automatically.
Run the command above on the exact proposed head. CI/workflow changes are outside
this slice; an advisory classifier success is never merge authority.
