import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('B89 normalization is exact and retains every registered lead source',()=>{
  const patch=JSON.parse(readFileSync('docs/engineer-osint/data/runs/engineer-osint-20260826-B89.json','utf8'));
  const lead=patch.lead_updates[0];
  const normalization=patch.extensions?.intake_normalization_v1;
  assert.deepEqual({
    run_id:patch.state.run_id,
    parent_run_id:patch.state.parent_run_id,
    update_count:patch.state.counts.UPDATE,
    updated_records:patch.updated_records.length,
    lead_count:patch.state.counts.LEAD,
    lead_id:lead.lead_id,
    rule_id:normalization?.rule_id,
    source_file_sha256:normalization?.source_file_sha256,
    removed_orphan_source_ids:normalization?.removed_orphan_source_ids,
    added_localization_fields:normalization?.added_localization_fields
  },{
    run_id:'engineer-osint-20260826-B89',
    parent_run_id:'engineer-osint-20260826-B88',
    update_count:0,
    updated_records:0,
    lead_count:1,
    lead_id:'LEAD-003',
    rule_id:'B89_STRICT_INTAKE_NORMALIZATION',
    source_file_sha256:'f04d7245cdc6fdf3e2c40ff24b69973cc749ddead2c22d5345ca533c16cce148',
    removed_orphan_source_ids:['ENG-SRC-0219','ENG-SRC-0220'],
    added_localization_fields:['LEAD-003.topic_cs']
  });
  assert.deepEqual(lead.source_ids,[
    'ENG-SRC-0329','ENG-SRC-0517','ENG-SRC-0518','ENG-SRC-0519','ENG-SRC-0520','ENG-SRC-0521','ENG-SRC-0522'
  ]);
  assert.equal(lead.topic_cs,lead.title_cs);
});
