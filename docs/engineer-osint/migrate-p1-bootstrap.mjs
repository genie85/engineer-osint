import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {canonicalDigest,mergeIdentified,parseJsonStrict,sha256Text} from './lib/integrity.mjs';
import {RUN_STORE_SCHEMA_VERSION} from './lib/run-store.mjs';

const root='docs/engineer-osint',dist='docs/engineer-osint-dist';
const manifestPath=join(root,'data/run-store-manifest.json');
if(existsSync(manifestPath))throw new Error(`Refusing to overwrite existing ${manifestPath}`);
const html=readFileSync(join(dist,'index.html'),'utf8'),marker='window.__ENGINEER_DATA__=';
const start=html.indexOf(marker),end=html.indexOf(';</script>',start);
if(start<0||end<0)throw new Error('Built ENGINEER_DATA marker is missing');
const data=parseJsonStrict(html.slice(start+marker.length,end),{source:'P1 bootstrap built ENGINEER_DATA',maxBytes:40*1024*1024});
data.dashboard_patch_extras=data.dashboard_patch_extras||{};
data.dashboard_patch_extras.observed_minimum_updates=mergeIdentified(
  [],data.dashboard_patch_extras.observed_minimum_updates||[],
  {keys:['id','entity_id'],kind:'bootstrap observed minimum',legacyIdPrefix:'ENG-OBS-LEGACY'}
);
const runId=data.state_latest?.run_id;
if(!runId)throw new Error('P1 bootstrap snapshot has no state_latest.run_id');
const integrity=data.dashboard_patch_extras.patch_integrity||{};
const runIds=data.dashboard_materialization?.patch_run_ids||data.dashboard_patch_extras.patch_history_runs||[];
const legacyStatus=integrity.legacy_status||(
  (integrity.malformed_patch_shas?.length||integrity.duplicate_run_ids?.length||integrity.parent_discontinuities?.length)
    ?'DEGRADED_LEGACY_ACKNOWLEDGED':'COMPLETE'
);
const legacyIntegrity={
  status:legacyStatus,run_count:integrity.run_count||runIds.length,
  revision_count:integrity.revision_count||runIds.length,
  malformed_patch_shas:integrity.malformed_patch_shas||[],duplicate_run_ids:integrity.duplicate_run_ids||[],
  parent_discontinuities:integrity.parent_discontinuities||[],external_checkpoint_parent:integrity.external_checkpoint_parent||null,
  enforcement_cutoff:integrity.enforcement_cutoff||runId
};
data.dashboard_patch_extras.patch_integrity=legacyIntegrity;
data.dashboard_patch_extras.patch_continuity=legacyStatus;
data.dashboard_materialization={
  ...(data.dashboard_materialization||{}),status:'SUCCESS',continuity:legacyStatus,
  current_run_id:runId,patch_run_count:runIds.length,patch_run_ids:runIds
};
delete data.dashboard_materialization.append_only_run_count;
delete data.dashboard_materialization.snapshot_run_id;
const snapshotRelative=`data/snapshots/canonical-${runId}.json`;
const snapshotPath=join(root,snapshotRelative),snapshotRaw=JSON.stringify(data,null,2)+'\n';
const manifest={
  schema_version:RUN_STORE_SCHEMA_VERSION,
  store_id:'engineer-osint-public-canonical',
  snapshot:{
    run_id:runId,path:snapshotRelative,file_sha256:sha256Text(snapshotRaw),canonical_sha256:canonicalDigest(data),
    source_main_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    legacy_run_count:runIds.length,legacy_revision_count:integrity.revision_count||runIds.length,
    record_count:data.records?.records?.length||0,source_count:data.sources?.sources?.length||0
  },
  runs:[],
  legacy_history:{
    status:legacyStatus,
    malformed_patch_shas:integrity.malformed_patch_shas||[],duplicate_run_ids:integrity.duplicate_run_ids||[],
    parent_discontinuities:integrity.parent_discontinuities||[],external_checkpoint_parent:integrity.external_checkpoint_parent||null,
    enforcement_cutoff:integrity.enforcement_cutoff||runId
  },
  policy:{
    append_only:true,manifest_order_is_canonical:true,run_files_are_immutable:true,
    direct_main_write:false,correction_operations_version:'engineer-osint-operations-v1'
  }
};
mkdirSync(join(root,'data/snapshots'),{recursive:true});
mkdirSync(join(root,'data/runs'),{recursive:true});
writeFileSync(snapshotPath,snapshotRaw,'utf8');
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8');
writeFileSync(join(root,'data/runs/README.md'),'# Append-only ENGINEER OSINT runs\n\nEach post-snapshot factual run is stored once as `<run_id>.json` and registered by hash in `../run-store-manifest.json`. Existing run files are immutable.\n','utf8');
console.log(JSON.stringify({status:'CREATED',run_id:runId,snapshot:snapshotRelative,snapshot_bytes:Buffer.byteLength(snapshotRaw),canonical_sha256:manifest.snapshot.canonical_sha256},null,2));
