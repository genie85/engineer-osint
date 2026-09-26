#!/usr/bin/env python3
"""Build and publish the approved ENGINEER OSINT main snapshot directly to Netlify.

No GitHub API or Actions call is part of this path. Research intake is deliberately
outside its scope: only the already canonical local run-store is materialized.
"""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/engineer-osint"
DIST = ROOT / "docs/engineer-osint-dist"
SITE_ID = "6d73e474-a47c-4328-a587-ab38534c901e"
SITE_NAME = "engineer-osint"
SITE_URL = "https://engineer-osint.netlify.app/"
API = "https://api.netlify.com/api/v1"
MIN_FREE_BYTES = 11_000_000_000
NETLIFY_EDGE_COMMENT = (
    b"<!-- This site is hosted on Netlify. Anyone can build and deploy a site\n"
    b"     like this one for free: https://netlify.new/?utm_campaign=loops&utm_source=ai-legible&utm_medium=owned&utm_content=comment&utm_id=6d73e474-a47c-4328-a587-ab38534c901e\n"
    b"     Netlify hosting facts for this site: static/SSR served via Netlify Edge. -->\n"
)

QA_BEFORE_BUILD = ["test-current-state.mjs", "validate-patch.mjs"]
QA_AFTER_BUILD = [
    "audit-media-history.mjs",
    "validate-media-coverage.mjs",
    "validate-runtime.mjs",
    "audit-overlay-retirement.mjs",
    "audit-post-b98-steady-state.mjs",
    "verify-post-b98-pages-readiness.mjs",
    "audit-public-cz-ui-latest.mjs",
    "validate-public-cz-regression.mjs",
    "verify-pages-artifact.mjs",
]


def fail(message):
    raise SystemExit(message)


def command(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def git_output(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def token_from_environment():
    token = os.environ.get("NETLIFY_AUTH_TOKEN", "").strip()
    if token:
        return token
    path = Path(os.environ.get(
        "NETLIFY_AUTH_TOKEN_FILE", "~/.config/slibometr-netlify/token"
    )).expanduser()
    if not path.is_file() or path.stat().st_mode & 0o077:
        fail("Netlify token file missing or accessible to other users")
    token = path.read_text().strip()
    if not token:
        fail("Netlify token file is empty")
    return token


def api_request(path, token, method="GET", data=None, content_type=None):
    headers = {"Authorization": "Bearer " + token}
    if content_type:
        headers["Content-Type"] = content_type
    request = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        fail(f"Netlify API {method} {path} returned HTTP {error.code}")


def public_index_status():
    try:
        with urllib.request.urlopen(SITE_URL, timeout=30) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, b""
    except urllib.error.URLError:
        return None, b""


def verified_public_index(live, expected):
    """Accept only the exact observed Netlify Edge comment in the exact head slot."""
    if live == expected:
        return "exact"
    anchor = b'<meta charset="utf-8">\n'
    position = expected.find(anchor)
    if position < 0:
        fail("Expected HTML lacks the verified Netlify insertion point")
    position += len(anchor)
    if live.count(NETLIFY_EDGE_COMMENT) != 1 or live[position:position + len(NETLIFY_EDGE_COMMENT)] != NETLIFY_EDGE_COMMENT:
        fail("Public HTML has an unrecognized difference")
    if live[:position] + live[position + len(NETLIFY_EDGE_COMMENT):] != expected:
        fail("Public HTML differs beyond the verified Netlify Edge comment")
    return "netlify_edge_comment"


def build():
    free = os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize
    if free < MIN_FREE_BYTES:
        fail(f"Disk gate: {free} free bytes, {MIN_FREE_BYTES} required")
    manifest = json.loads((SOURCE / "data/run-store-manifest.json").read_text())
    tip = manifest["runs"][-1]
    run_id = tip["run_id"]
    for path in SOURCE.glob("*.js"):
        command("node", "--check", str(path))
    for path in SOURCE.glob("*.mjs"):
        command("node", "--check", str(path))
    for path in (SOURCE / "lib").glob("*.mjs"):
        command("node", "--check", str(path))
    for script in QA_BEFORE_BUILD:
        command("node", str(SOURCE / script))
    command("node", str(SOURCE / "build-pages.mjs"))
    command("node", str(SOURCE / "materialize-canonical-media-history.mjs"))
    index_path = DIST / "index.html"
    media_js = (SOURCE / "media-source-materialization.js").read_text()
    if "</script" in media_js.lower():
        fail("Unsafe media source module")
    html = index_path.read_text()
    marker = '<script id="engineer-ui-phase7-media-module">'
    if "engineer-media-source-materialization" not in html:
        snippet = f'<script id="engineer-media-source-materialization">{media_js}</script>'
        html = html.replace(marker, snippet + marker, 1) if marker in html else html.replace("</body>", snippet + "</body>", 1)
        index_path.write_text(html)
    for script in QA_AFTER_BUILD:
        command("node", str(SOURCE / script))
    index = index_path.read_bytes()
    if len(index) < 100_000 or run_id.encode() not in index:
        fail("Build is empty or does not contain canonical run ID")
    if tip["canonical_sha256"].encode() not in index:
        fail("Build lacks canonical digest")
    files = {
        "/" + path.relative_to(DIST).as_posix(): path.read_bytes()
        for path in DIST.rglob("*") if path.is_file() and path.name != ".nojekyll"
    }
    if len(files) > 100 or any(not path.resolve().is_relative_to(DIST.resolve()) for path in DIST.rglob("*") if path.is_file()):
        fail("Artifact exceeds verified API page or contains a file outside build directory")
    if "/index.html" not in files or "/health.txt" not in files:
        fail("Build lacks index or health")
    return tip, index, files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Build and validate without deploying")
    args = parser.parse_args()
    head = git_output("rev-parse", "HEAD")
    if not args.dry_run:
        if git_output("symbolic-ref", "--short", "HEAD") != "main":
            fail("Production deploy requires local main branch")
        if git_output("status", "--porcelain", "--untracked-files=no"):
            fail("Production deploy requires clean tracked files")
    tip, index, files = build()
    print(json.dumps({"phase": "validated", "head": head, "run": tip["run_id"],
                      "canonical_sha256": tip["canonical_sha256"], "index_sha256": sha256(index),
                      "file_count": len(files)}, sort_keys=True))
    if args.dry_run:
        return

    token = token_from_environment()
    site = api_request(f"/sites/{SITE_ID}", token)
    if site.get("name") != SITE_NAME or site.get("id") != SITE_ID:
        fail("Target Netlify site identity mismatch")
    if (site.get("build_settings") or {}).get("repo_url"):
        fail("Netlify site is still linked to a Git repo")
    status, _ = public_index_status()
    if status != 200:
        fail(f"Public Netlify preflight HTTP {status}; fix visitor access before deploying")
    previous_deploy_id = (site.get("published_deploy") or {}).get("id")
    remote = api_request(f"/sites/{SITE_ID}/files?per_page=100", token)
    remote_hashes = {entry["path"]: entry["sha"] for entry in remote}
    expected_hashes = {path: sha1(data) for path, data in files.items()}
    if len(remote_hashes) == len(files) and remote_hashes == expected_hashes:
        status, live = public_index_status()
        if status != 200:
            fail(f"No-op file hashes match, but public HTML returned HTTP {status}")
        readback = verified_public_index(live, index)
        print(json.dumps({"phase": "no_change", "deploy_id": previous_deploy_id,
                          "http": status, "source_index_sha256": sha256(index),
                          "public_index_sha256": sha256(live), "readback": readback}))
        return

    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as target:
        for path, data in sorted(files.items()):
            target.writestr(path.lstrip("/"), data)
    deploy = api_request(f"/sites/{SITE_ID}/deploys", token, "POST", archive.getvalue(), "application/zip")
    deploy_id = deploy.get("id")
    if not deploy_id:
        fail("Netlify did not return deploy ID; reconcile before retry")
    import time
    for _ in range(24):
        state = api_request(f"/deploys/{deploy_id}", token)
        if state.get("state") in ("ready", "error"):
            break
        time.sleep(5)
    if state.get("state") != "ready":
        fail(f"Deploy {deploy_id} not ready: {state.get('state')}; reconcile before retry")
    published = api_request(f"/sites/{SITE_ID}", token)
    if (published.get("published_deploy") or {}).get("id") != deploy_id:
        fail("Published deploy ID differs from requested deploy")
    actual = api_request(f"/sites/{SITE_ID}/files?per_page=100", token)
    if {entry["path"]: entry["sha"] for entry in actual} != expected_hashes:
        fail("Netlify file hashes differ from validated build")
    status, live = public_index_status()
    if status != 200:
        fail(f"Netlify public readback failed: HTTP {status}; deploy ID {deploy_id}")
    readback = verified_public_index(live, index)
    print(json.dumps({"phase": "verified", "previous_deploy_id": previous_deploy_id,
                      "deploy_id": deploy_id, "http": status,
                      "source_index_sha256": sha256(index), "public_index_sha256": sha256(live),
                      "readback": readback}, sort_keys=True))


if __name__ == "__main__":
    main()
