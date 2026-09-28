#!/usr/bin/env node
import {statfsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const EXPECTED_RUN='engineer-osint-20260928-B113';
const EXPECTED_DIGEST='c7ff079cfade9b35093f4779624bee6075a7df67b8069a47f040f8ae4d6c1d9b';
const manifest=JSON.parse(readFileSync('docs/engineer-osint/data/run-store-manifest.json','utf8'));
const tip=manifest.runs.at(-1);
if(tip?.run_id!==EXPECTED_RUN||tip?.canonical_sha256!==EXPECTED_DIGEST){
  throw new Error(`Unsupported canonical state: ${tip?.run_id ?? 'missing'} / ${tip?.canonical_sha256 ?? 'missing'}`);
}
const fs=statfsSync('.',{bigint:true});
if(fs.bavail*fs.bsize<12_000_000_000n)throw new Error('12GB disk gate');
const result=spawnSync(process.execPath,['--test',
  'docs/engineer-osint/tests/post-b113-publication.test.mjs'
],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status ?? 1);
