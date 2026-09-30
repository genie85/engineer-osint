#!/usr/bin/env python3
"""Read-only integrity and freshness inventory for an ENGINEER OSINT export.

This does not validate factual claims, consume a handoff, or authorize a write.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys


CATEGORY_DIRS = {
    "hourly_run": "hourly_runs",
    "handoff_ready_for_development": "handoffs/ready_for_development",
    "handoff_review_required": "handoffs/review_required",
}
SHA256 = re.compile(r"^[a-f0-9]{64}$")
SHA1 = re.compile(r"^[a-f0-9]{40}$")


def fail(message):
    raise ValueError(message)


def read_json(path):
    return json.loads(path.read_bytes())


def audit(bundle, main_sha, canonical_run, canonical_sha):
    bundle = Path(bundle).resolve()
    if not bundle.is_dir():
        fail("bundle directory missing")
    if (bundle / "MANIFEST.json").is_symlink() or (bundle / "SHA256SUMS.txt").is_symlink():
        fail("bundle control file is a symlink")
    if not SHA1.fullmatch(main_sha) or not canonical_run or not SHA256.fullmatch(canonical_sha):
        fail("invalid current baseline identity")
    manifest = read_json(bundle / "MANIFEST.json")
    if not isinstance(manifest, dict):
        fail("manifest root is not an object")
    if manifest.get("project") != "ENGINEER_OSINT":
        fail("unexpected project")
    entries = manifest.get("files")
    if not isinstance(entries, list) or len(entries) != manifest.get("total_files"):
        fail("manifest file count mismatch")
    sums = {}
    for line in (bundle / "SHA256SUMS.txt").read_text().splitlines():
        match = re.fullmatch(r"([a-f0-9]{64})  ([^/\\]+\.json)", line)
        if not match or match.group(2) in sums:
            fail("invalid or duplicate SHA256SUMS entry")
        sums[match.group(2)] = match.group(1)

    seen_names = set()
    counts = Counter()
    declared = Counter()
    gates = Counter()
    handoff_ids = set()
    producer_ids = set()
    total_bytes = 0
    details = []
    for entry in entries:
        if not isinstance(entry, dict):
            fail("manifest entry is not an object")
        name, category = entry.get("filename"), entry.get("category")
        if category not in CATEGORY_DIRS or not isinstance(name, str) or Path(name).name != name or name in seen_names:
            fail("unsafe path, unknown category or duplicate filename")
        if not SHA256.fullmatch(str(entry.get("sha256", ""))):
            fail("invalid manifest hash")
        seen_names.add(name)
        path = bundle / CATEGORY_DIRS[category] / name
        if path.is_symlink() or not path.resolve().is_relative_to(bundle):
            fail("bundle file escapes its directory: " + name)
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if len(raw) != entry.get("bytes") or digest != entry["sha256"] or sums.get(name) != digest:
            fail("file byte, size or checksum mismatch: " + name)
        document = json.loads(raw)
        if not isinstance(document, dict):
            fail("JSON root is not an object: " + name)
        total_bytes += len(raw)
        counts[category] += 1
        if category == "hourly_run":
            run_id = document.get("producer_declared_run_id")
            if run_id:
                if run_id in producer_ids:
                    gates["DUPLICATE_PRODUCER_RUN_ID"] += 1
                producer_ids.add(run_id)
            continue
        handoff_id = document.get("handoff_id")
        if not isinstance(handoff_id, str) or not handoff_id:
            fail("handoff ID missing: " + name)
        if handoff_id in handoff_ids:
            gates["DUPLICATE_HANDOFF_ID"] += 1
        handoff_ids.add(handoff_id)
        status = document.get("status")
        declared[status] += 1
        if status != entry.get("status"):
            fail("manifest/JSON status mismatch: " + name)
        parent = document.get("canonical_parent") or {}
        if not isinstance(parent, dict):
            fail("canonical parent is not an object: " + name)
        reasons = []
        if document.get("base_main_sha") != main_sha:
            reasons.append("STALE_MAIN_SHA")
        if parent.get("run_id") != canonical_run or parent.get("canonical_sha256") != canonical_sha:
            reasons.append("STALE_CANONICAL_PARENT")
        if status != "READY_FOR_DEVELOPMENT":
            reasons.append("REVIEW_REQUIRED")
        if not reasons:
            reasons.append("NEEDS_INDEPENDENT_RESEARCH_REVIEW")
        for reason in reasons:
            gates[reason] += 1
        details.append({"handoff_id": handoff_id, "file": name, "declared_status": status, "gates": reasons})
    if set(sums) != seen_names or dict(counts) != manifest.get("counts_by_category"):
        fail("manifest/SHA256SUMS/category inventory mismatch")
    if total_bytes != manifest.get("total_bytes") or manifest.get("json_valid_files") != len(entries) or manifest.get("json_invalid_files") != 0:
        fail("manifest byte or JSON count mismatch")
    return {
        "classification": "READ_ONLY_NON_CANONICAL_INVENTORY",
        "main_sha_supplied": main_sha,
        "canonical_tip_supplied": canonical_run,
        "manifest_sha256": hashlib.sha256((bundle / "MANIFEST.json").read_bytes()).hexdigest(),
        "integrity": "PASS",
        "file_count": len(entries),
        "total_bytes": total_bytes,
        "categories": dict(sorted(counts.items())),
        "declared_handoff_statuses": dict(sorted(declared.items())),
        "gates": dict(sorted(gates.items())),
        "schema_validation": "NOT_RUN",
        "semantic_deduplication": "NOT_RUN",
        "canonical_import_authorized": False,
        "publication_authorized": False,
        "handoffs": details,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--main-sha", required=True)
    parser.add_argument("--canonical-run", required=True)
    parser.add_argument("--canonical-sha", required=True)
    parser.add_argument("--details", action="store_true", help="include per-handoff IDs and filenames")
    args = parser.parse_args()
    try:
        result = audit(args.bundle, args.main_sha, args.canonical_run, args.canonical_sha)
    except (ValueError, OSError, json.JSONDecodeError) as error:
        print(json.dumps({"integrity": "FAIL", "reason": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1
    if not args.details:
        del result["handoffs"]
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
