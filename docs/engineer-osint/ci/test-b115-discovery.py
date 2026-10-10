"""Read-only source checks and disjoint synthetic fixture tests; no browser/authority."""
import importlib.util,json,pathlib,tempfile,unittest,subprocess,sys
sys.dont_write_bytecode=True
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('b115_discovery',HERE/'discover-b115-browser.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
ROOT=HERE.parents[2]
class Discovery(unittest.TestCase):
 def test_exact_source_closure(self):
  pins=json.loads((HERE/'b114-dmz-source-pins.json').read_text());snap=d.snapshot(HERE.parent)
  self.assertEqual(set(snap)-set(pins),{'ci/discover-b115-browser.py','ci/simulate-b115.mjs','ci/b114-dmz-source-pins.json','ci/test-b115-discovery.py'})
  for name,value in pins.items():self.assertEqual(snap[name],value,name)
 def test_actual_strict_simulation_and_unchanged_inputs(self):
  before=d.snapshot(HERE.parent)
  with tempfile.TemporaryDirectory() as temp:
   work=pathlib.Path(temp)/'simulation';d.simulate(ROOT,HERE.parent/'candidates/B115_DMZ_20261010.json',work)
   self.assertFalse((work/'.git').exists());self.assertTrue((work/'NONCANONICAL_SIMULATION.txt').exists())
   self.assertEqual(d.sha(d.raw(work/'docs/engineer-osint/data/run-store-manifest.json')),d.SUCCESSOR_MANIFEST)
   self.assertEqual(d.sha(d.raw(work/'docs/engineer-osint/data/runs/engineer-osint-20261010-B115.json')),d.CANDIDATE)
   with self.assertRaisesRegex(ValueError,'destination must be new'):d.simulate(ROOT,HERE.parent/'candidates/B115_DMZ_20261010.json',work)
  self.assertEqual(before,d.snapshot(HERE.parent))
 def test_changed_candidate_rejected_before_copy(self):
  with tempfile.TemporaryDirectory() as temp:
   bad=pathlib.Path(temp)/'bad.json';bad.write_text('{}');work=pathlib.Path(temp)/'simulation'
   with self.assertRaisesRegex(ValueError,'candidate pin mismatch'):d.simulate(ROOT,bad,work)
   self.assertFalse(work.exists())
 def test_overlap_rejected(self):
  with self.assertRaisesRegex(ValueError,'overlapping'):d.simulate(ROOT,HERE.parent/'candidates/B115_DMZ_20261010.json',ROOT/'unsafe')
 def test_wrong_baseline_rejected(self):
  with self.assertRaisesRegex(ValueError,'B114 exact DOM mismatch'):d.baseline_digest('<html>wrong</html>')
 def test_observation_never_authorizes(self):
  r=d.discovered(d.B114_DOM,'a'*64,{'synthetic_test_only':True})
  self.assertEqual(r['status'],'DISCOVERED_NOT_AUTHORIZED');self.assertFalse(r['authority_granted']);self.assertFalse(r['canonical_write'])
 def test_receipt_authority_override_rejected(self):
  with self.assertRaisesRegex(ValueError,'reserved receipt field'):d.discovered(d.B114_DOM,'a'*64,{'authority_granted':True})
 def test_bad_observation_rejected(self):
  with self.assertRaisesRegex(ValueError,'invalid observed'):d.discovered(d.B114_DOM,'invalid',{})
  with self.assertRaisesRegex(ValueError,'unmatched baseline'):d.discovered('a'*64,'b'*64,{})
 def test_sandbox_not_weakened(self):
  args=d.browser_args('/native','/tmp/profile','file:///tmp/index.html')
  self.assertNotIn('--no-sandbox',args);self.assertNotIn('--allow-chrome-scheme-url',args)
  self.assertIn('--allow-chrome-scheme-url',d.sandbox_probe_args('/native','/tmp/profile'))
  with self.assertRaisesRegex(ValueError,'unsupported render'):d.browser_args('/native','/tmp/profile','https://example.test')
  with self.assertRaises(ValueError):d.sandbox_evidence('<html>no verified sandbox table</html>')
 def test_explicit_opt_in_required(self):
  p=subprocess.run([sys.executable,'-B','-I',str(HERE/'discover-b115-browser.py'),'--checkout',str(ROOT),'--expected-head','a'*40,'--candidate','missing','--browser','missing','--baseline-dom','missing','--output','missing'],capture_output=True,text=True)
  self.assertNotEqual(p.returncode,0);self.assertIn('explicit execution opt-in required',p.stderr)
if __name__=='__main__':unittest.main()
