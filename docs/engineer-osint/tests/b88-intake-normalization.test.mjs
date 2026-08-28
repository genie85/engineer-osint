import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const path='docs/engineer-osint/data/runs/engineer-osint-20260826-B88.json';

test('B88 normalization is exact, hash-pinned and does not broaden strict intake',()=>{
  const patch=JSON.parse(readFileSync(path,'utf8'));
  const normalization=patch.extensions?.intake_normalization_v1;
  assert.deepEqual({
    run_id:patch.state.run_id,
    parent_run_id:patch.state.parent_run_id,
    update_count:patch.state.counts.UPDATE,
    updated_records:patch.updated_records.length,
    lead_count:patch.state.counts.LEAD,
    lead_ids:patch.lead_updates.map(item=>item.lead_id),
    rule_id:normalization?.rule_id,
    source_file_sha256:normalization?.source_file_sha256,
    removed_orphan_source_ids:normalization?.removed_orphan_source_ids
  },{
    run_id:'engineer-osint-20260826-B88',
    parent_run_id:'engineer-osint-20260826-B87',
    update_count:0,
    updated_records:0,
    lead_count:1,
    lead_ids:['LEAD-003'],
    rule_id:'B88_STRICT_INTAKE_NORMALIZATION',
    source_file_sha256:'4432cfc298f5c88bb6fd248f8a61a8dfe62c1f573fac2a295b8a2839759e32ed',
    removed_orphan_source_ids:['ENG-SRC-0219','ENG-SRC-0220']
  });
  assert.deepEqual(patch.lead_updates[0].source_ids,[
    'ENG-SRC-0329','ENG-SRC-0517','ENG-SRC-0518','ENG-SRC-0519','ENG-SRC-0520'
  ]);
});
