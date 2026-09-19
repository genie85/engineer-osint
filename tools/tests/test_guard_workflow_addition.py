"""The inventory authorization never grants candidate/merge authority."""
import json
from pathlib import Path
import unittest
import test_safe_automerge as fixtures

RECORD = Path(__file__).parents[2] / 'docs/engineer-osint/GUARD_WORKFLOW_ADDITION_AUTHORIZATION_20260919.json'


class AdditionBoundaryTests(unittest.TestCase):
    def fixture(self):
        case = fixtures.GuardTests()
        case.setUp()
        self.addCleanup(case.doCleanups)
        return case

    def test_successor_record_cannot_authorize_its_own_candidate(self):
        record = json.loads(RECORD.read_text())
        self.assertIs(record['bootstrapSelfAuthorization'], False)
        case = self.fixture()
        case.change('docs/engineer-osint/' + RECORD.name, RECORD.read_text())
        case.blocked(case.evaluate())
        self.assertEqual(case.git('rev-parse', 'HEAD'), case.base)

    def test_bootstrap_without_base_issuer_cannot_authorize_itself(self):
        record = json.loads(RECORD.read_text())
        self.assertIs(record['authorization']['mergeAuthorized'], False)
        case = self.fixture()
        workflow = '.github/workflows/safe-automerge-dry-run.yml'
        text = (case.repo / workflow).read_text()
        # Only the disposable test repository is changed.
        case.git('switch', '-q', 'main')
        case.git('rm', workflow)
        case.git('commit', '-qm', 'base has no issuer')
        case.base = case.git('rev-parse', 'HEAD')
        case.git('branch', '-f', 'change', case.base)
        case.git('switch', '-q', 'change')
        case.change(workflow, text)
        case.blocked(case.evaluate())
        self.assertEqual(case.git('rev-parse', 'HEAD'), case.base)


if __name__ == '__main__':
    unittest.main()
