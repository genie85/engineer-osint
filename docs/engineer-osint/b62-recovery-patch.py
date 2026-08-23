from pathlib import Path

run_store = Path('docs/engineer-osint/lib/run-store.mjs')
s = run_store.read_text(encoding='utf-8')
marker = "export function applyStrictPatchToCanonicalData(input,patch){\n  validatePatch(patch,{strict:true});\n  const data=structuredClone(input),runId=patch.state.run_id;"
replacement = """function reconcileLegacyVisualMirror(data){
  const canonical=asArray(data.visual_registry?.visuals),legacy=asArray(data.dashboard_patch_extras?.visuals);
  if(!legacy.length)return;
  const byId=new Map(canonical.map(item=>[itemKey(item,idRules.visuals),item]));
  for(const item of legacy){
    const id=itemKey(item,idRules.visuals);
    ensure(Boolean(id),'Legacy visual mirror item has no stable identifier');
    const existing=byId.get(id);
    if(existing)ensure(canonicalDigest(existing)===canonicalDigest(item),`Legacy visual mirror conflict for ${id}`);
  }
  data.visual_registry=data.visual_registry||{};
  data.visual_registry.visuals=mergeIdentified(canonical,structuredClone(legacy),{keys:idRules.visuals,kind:'canonical visuals legacy mirror'});
}

export function applyStrictPatchToCanonicalData(input,patch){
  validatePatch(patch,{strict:true});
  const data=structuredClone(input),runId=patch.state.run_id;
  reconcileLegacyVisualMirror(data);"""
if 'function reconcileLegacyVisualMirror(data)' not in s:
    if marker not in s:
        raise SystemExit('run-store insertion marker not found')
    run_store.write_text(s.replace(marker, replacement, 1), encoding='utf-8')

test_file = Path('docs/engineer-osint/tests/p1-run-store.test.mjs')
ts = test_file.read_text(encoding='utf-8')
if 'strict append preserves disjoint legacy visual mirror before synchronization' not in ts:
    ts += """

test('strict append preserves disjoint legacy visual mirror before synchronization',()=>{
  const base=canonical();
  base.visual_registry={visuals:[{asset_id:'ENG-VIS-0001',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1']}]};
  base.dashboard_patch_extras.visuals=[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Katyusha'}];
  const result=applyStrictPatchToCanonicalData(base,patch());
  const canonicalIds=result.visual_registry.visuals.map(item=>item.asset_id||item.id).sort();
  const mirrorIds=result.dashboard_patch_extras.visuals.map(item=>item.asset_id||item.id).sort();
  assert.deepEqual(canonicalIds,['ENG-VIS-0001','ENG-VIS-0054']);
  assert.deepEqual(mirrorIds,canonicalIds);
});

test('strict append rejects conflicting legacy visual mirror identities',()=>{
  const base=canonical();
  base.visual_registry={visuals:[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Canonical'}]};
  base.dashboard_patch_extras.visuals=[{asset_id:'ENG-VIS-0054',related_ids:['ENG-EVT-TEST1'],source_ids:['ENG-SRC-TEST1'],caption:'Conflicting mirror'}];
  assert.throws(()=>applyStrictPatchToCanonicalData(base,patch()),IntegrityError);
});
"""
    test_file.write_text(ts, encoding='utf-8')
