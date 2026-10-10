#!/usr/bin/env node
// PROPOSED finite lifecycle successor; no append/execution authority.
import {statfsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const states=[
 {run:'engineer-osint-20260928-B113',canonical:'c7ff079cfade9b35093f4779624bee6075a7df67b8069a47f040f8ae4d6c1d9b',manifest:'d3480581360f8ffc120d951c74a8fd597c19d03cc7e0e2f1e64ed25f492a76c3',test:'post-b113-publication.test.mjs'},
 {run:'engineer-osint-20261010-B114',canonical:'6e70d18d5aeb59c68b761c271e5c1cd74d9498cedcfaaa64bf0b044801a4e6c8',manifest:'cabad4db4ec37f5c5e83b64bb4fcc1004a936869d06004243ec29009a257b928',test:'post-b114-publication.test.mjs'},
 {run:'engineer-osint-20261010-B115',canonical:'1a0e5b1272f928c0f20d815d091a77c2646dbc755a6e6274a6416ed758a6335f',manifest:'b2aaea408de90d214b1519748c288e0dbd16a2d647d2f4eb549237be7dc16f7b',test:'post-b115-publication.test.mjs'}
];
const raw=readFileSync('docs/engineer-osint/data/run-store-manifest.json');
const tip=JSON.parse(raw).runs.at(-1),hash=createHash('sha256').update(raw).digest('hex');
const state=states.find(s=>s.run===tip?.run_id&&s.canonical===tip?.canonical_sha256&&s.manifest===hash);
if(!state)throw Error('Unsupported exact canonical state');
const fs=statfsSync('.',{bigint:true});if(fs.bavail*fs.bsize<12_000_000_000n)throw Error('12GB disk gate');
const tests=['docs/engineer-osint/tests/'+state.test,'docs/engineer-osint/tests/b114-strict-append.test.mjs'];
if(state.run!=='engineer-osint-20260928-B113')tests.push('docs/engineer-osint/tests/b115-strict-append.test.mjs','docs/engineer-osint/tests/dmz-ui-labels.test.mjs');
const result=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
