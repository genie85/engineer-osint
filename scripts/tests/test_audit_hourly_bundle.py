import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "audit-hourly-bundle.py"
SPEC = importlib.util.spec_from_file_location("audit_hourly_bundle", MODULE_PATH)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)
MAIN = "a" * 40
CANONICAL = "b" * 64


class BundleAuditTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        folder = self.root / "handoffs/ready_for_development"
        folder.mkdir(parents=True)
        self.path = folder / "handoff.json"
        self.document = {
            "handoff_id": "H-1",
            "status": "READY_FOR_DEVELOPMENT",
            "base_main_sha": "c" * 40,
            "canonical_parent": {"run_id": "B112", "canonical_sha256": "d" * 64},
        }
        self.save_bundle()

    def save_bundle(self):
        raw = (json.dumps(self.document) + "\n").encode()
        self.path.write_bytes(raw)
        digest = hashlib.sha256(raw).hexdigest()
        (self.root / "SHA256SUMS.txt").write_text(f"{digest}  handoff.json\n")
        manifest = {
            "project": "ENGINEER_OSINT", "total_files": 1,
            "total_bytes": len(raw), "json_valid_files": 1, "json_invalid_files": 0,
            "counts_by_category": {"handoff_ready_for_development": 1},
            "files": [{"filename": "handoff.json", "category": "handoff_ready_for_development",
                       "bytes": len(raw), "sha256": digest, "status": "READY_FOR_DEVELOPMENT"}],
        }
        (self.root / "MANIFEST.json").write_text(json.dumps(manifest))

    def test_stale_declared_ready_handoff_stays_blocked(self):
        report = AUDIT.audit(self.root, MAIN, "B113", CANONICAL)
        self.assertEqual(report["integrity"], "PASS")
        self.assertEqual(report["gates"]["STALE_MAIN_SHA"], 1)
        self.assertEqual(report["gates"]["STALE_CANONICAL_PARENT"], 1)
        self.assertFalse(report["canonical_import_authorized"])

    def test_byte_change_fails_before_classification(self):
        self.path.write_bytes(self.path.read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            AUDIT.audit(self.root, MAIN, "B113", CANONICAL)

    def test_symlinked_payload_is_not_read(self):
        outside = self.root.parent / (self.root.name + "-outside.json")
        outside.write_bytes(self.path.read_bytes())
        self.addCleanup(outside.unlink)
        self.path.unlink()
        self.path.symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "escapes its directory"):
            AUDIT.audit(self.root, MAIN, "B113", CANONICAL)


if __name__ == "__main__":
    unittest.main()
