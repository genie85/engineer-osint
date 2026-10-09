import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'acceptance_map.py'
SPEC = importlib.util.spec_from_file_location('acceptance_map', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
FIXTURE = SCRIPT.parent / 'fixtures/acceptance-map.synthetic.json'
BASE = 'd' * 40


class AcceptanceMapTests(unittest.TestCase):
    def setUp(self):
        self.document = json.loads(FIXTURE.read_text())

    def validate(self):
        return MODULE.validate_map(self.document, expected_main_sha=BASE)

    def test_mixed_findings_are_not_a_file_level_verdict(self):
        before = copy.deepcopy(self.document)
        result = self.validate()
        self.assertEqual(self.document, before)
        self.assertEqual(result['counts_by_recorded_disposition'], dict.fromkeys(MODULE.STATES, 1))
        self.assertEqual(result['factual_verification'], 'NOT_RUN')
        self.assertEqual(result['canonical_verification'], 'NOT_RUN')
        self.assertEqual(result['publication_verification'], 'NOT_RUN')
        self.assertFalse(result['global_completeness'])
        self.assertTrue(all(v is False for v in result['authority'].values()))
        self.assertNotIn('SYNTHETIC_FILE', json.dumps(result))

    def test_authority_false_is_exact_boolean(self):
        for value in (True, 0, None, 'false'):
            with self.subTest(value=value):
                self.document['authority']['drive_cleanup'] = value
                with self.assertRaises(ValueError): self.validate()

    def test_partial_requires_remainder_and_cannot_promote(self):
        self.document['findings'][1]['remaining_scope'] = []
        with self.assertRaisesRegex(ValueError, 'remaining scope'): self.validate()

    def test_accepted_cannot_hide_remainder(self):
        self.document['findings'][1]['recorded_disposition'] = 'accepted'
        with self.assertRaisesRegex(ValueError, 'use partial'): self.validate()

    def test_unresolved_cannot_assert_acceptance(self):
        self.document['findings'][0]['recorded_disposition'] = 'unresolved'
        with self.assertRaisesRegex(ValueError, 'cannot assert accepted'): self.validate()

    def test_acceptance_needs_fresh_identity_but_unknown_can_retain_inherited_hash(self):
        for provenance in ('inherited', 'unknown'):
            with self.subTest(provenance=provenance):
                self.document['findings'][0]['source']['hash_verification'] = provenance
                with self.assertRaisesRegex(ValueError, 'cannot rely'): self.validate()
        self.assertEqual(self.document['findings'][3]['source']['hash_verification'], 'inherited')

    def test_revision_absence_is_explicit(self):
        source = self.document['findings'][0]['source']
        source['revision'] = None
        with self.assertRaisesRegex(ValueError, 'requires reason'): self.validate()
        source['revision_unknown_reason'] = 'Provider did not expose a revision; exact raw bytes pinned.'
        self.validate()

    def test_missing_canonical_evidence_rejected(self):
        self.document['findings'][0]['canonical_evidence'] = []
        with self.assertRaisesRegex(ValueError, 'canonical proof'): self.validate()

    def test_publication_is_separate_and_not_implied(self):
        row = self.document['findings'][0]
        self.assertEqual(row['publication_evidence'], [])
        row['publication_evidence'] = [{'commit_sha': 'e' * 40, 'reference': 'SYNTHETIC deployment receipt'}]
        self.assertEqual(self.validate()['publication_verification'], 'NOT_RUN')
        row['canonical_evidence'] = []
        with self.assertRaisesRegex(ValueError, 'canonical proof'): self.validate()

    def test_mutable_ref_and_parent_path_rejected(self):
        evidence = self.document['findings'][0]['canonical_evidence'][0]
        evidence['commit_sha'] = 'main'
        with self.assertRaisesRegex(ValueError, 'exact'): self.validate()
        evidence['commit_sha'] = 'b' * 40
        for path in ('../run.json', '/run.json', 'data/../run.json', 'data\\run.json'):
            with self.subTest(path=path):
                evidence['path'] = path
                with self.assertRaisesRegex(ValueError, 'relative'): self.validate()

    def test_scoped_finding_identity(self):
        row = copy.deepcopy(self.document['findings'][0])
        self.document['findings'].append(row)
        with self.assertRaisesRegex(ValueError, 'duplicate scoped'): self.validate()
        row['source']['revision'] = 'ANOTHER_SYNTHETIC_REVISION'
        self.assertEqual(self.validate()['finding_count'], 5)

    def test_stale_baseline_does_not_rewrite(self):
        before = copy.deepcopy(self.document)
        with self.assertRaisesRegex(ValueError, 'baseline mismatch'):
            MODULE.validate_map(self.document, expected_main_sha='e' * 40)
        self.assertEqual(self.document, before)

    def test_malformed_shapes_and_unknown_fields(self):
        for value in (None, [], False, {'unexpected': True}):
            with self.subTest(value=value):
                with self.assertRaises(ValueError): MODULE.validate_map(value, expected_main_sha=BASE)
        self.document['accepted'] = True
        with self.assertRaisesRegex(ValueError, 'fields invalid'): self.validate()

    def test_duplicate_keys_and_non_json_numbers_rejected(self):
        for raw in ('{"a":1,"a":2}', '{"a":{"x":1,"x":2}}', '{"x":NaN}'):
            with self.subTest(raw=raw):
                with self.assertRaises(ValueError): MODULE.parse_map(raw)

    def test_pointer_escapes_and_scope_overlap(self):
        self.document['findings'][0]['source_locator'] = '/findings/~2bad'
        with self.assertRaisesRegex(ValueError, 'pointer'): self.validate()
        self.document['findings'][0]['source_locator'] = '/findings/~0tilde~1slash'
        self.validate()
        self.document['findings'][1]['remaining_scope'] = self.document['findings'][1]['accepted_scope'][:]
        with self.assertRaisesRegex(ValueError, 'overlap'): self.validate()

    def test_empty_map_never_claims_completeness(self):
        self.document['findings'] = []
        result = self.validate()
        self.assertEqual(result['finding_count'], 0)
        self.assertFalse(result['global_completeness'])

    def test_cli_success_is_read_only_and_does_not_echo_input(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private.json'
            raw = json.dumps(self.document).encode()
            path.write_bytes(raw)
            result = subprocess.run([sys.executable, str(SCRIPT), str(path), '--expected-main-sha', BASE], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)['structural_check'], 'PASS')
            self.assertNotIn('SYNTHETIC', result.stdout)
            self.assertEqual(path.read_bytes(), raw)
            self.assertEqual(list(Path(directory).iterdir()), [path])

    def test_cli_rejects_invalid_input_without_disclosing_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private-sensitive-name.json'
            path.write_text('{"private-secret": INVALID}')
            result = subprocess.run([sys.executable, str(SCRIPT), str(path), '--expected-main-sha', BASE], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(result.stdout, '')
            self.assertEqual(result.stderr, 'acceptance map validation failed\n')


if __name__ == '__main__':
    unittest.main()
