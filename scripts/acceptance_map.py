#!/usr/bin/env python3
"""Read-only structural validation of reported per-finding acceptance evidence.

A PASS never verifies facts, receipts, canonical membership or publication.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys

SHA1 = re.compile(r'[a-f0-9]{40}')
SHA256 = re.compile(r'[a-f0-9]{64}')
POINTER = re.compile(r'(?:/(?:[^~/]|~[01])*)+')
STATES = ('accepted', 'partial', 'unresolved', 'unknown')
AUTHORITY = {'canonical_import', 'publication', 'drive_cleanup', 'state_transition'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def digest(value, pattern):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def fields(value, keys, label):
    require(isinstance(value, dict) and set(value) == set(keys), label + ' fields invalid')


def string_list(value, label):
    require(isinstance(value, list) and all(text(item) for item in value), label + ' must be text array')
    require(len(value) == len(set(value)), label + ' contains duplicates')


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate JSON key')
        result[key] = value
    return result


def parse_map(raw):
    def reject_constant(_):
        raise ValueError('non-JSON numeric constant')
    return json.loads(raw, object_pairs_hook=no_duplicate_keys, parse_constant=reject_constant)


def validate_map(document, *, expected_main_sha):
    """Check shape and a caller-supplied baseline; never fetch or adjudicate evidence."""
    require(digest(expected_main_sha, SHA1), 'expected main must be an exact SHA')
    fields(document, {'schema_version', 'classification', 'observed_main_sha', 'authority', 'findings'}, 'map')
    require(document['schema_version'] == 'engineer-osint-acceptance-map-v1', 'unsupported map schema')
    require(document['classification'] == 'NONCANONICAL_EVIDENCE_INDEX', 'noncanonical classification required')
    require(document['observed_main_sha'] == expected_main_sha, 'baseline mismatch; revalidation required')
    fields(document['authority'], AUTHORITY, 'authority')
    require(all(value is False for value in document['authority'].values()), 'authority must remain false')
    rows = document['findings']
    require(isinstance(rows, list), 'findings must be an array')
    seen = set()
    counts = Counter()
    for row in rows:
        fields(row, {'source', 'finding_id', 'source_locator', 'recorded_disposition',
                     'disposition_evidence', 'accepted_scope', 'remaining_scope',
                     'canonical_evidence', 'publication_evidence'}, 'finding')
        source = row['source']
        fields(source, {'file_id', 'revision', 'revision_unknown_reason', 'raw_sha256',
                        'hash_verification', 'verification_evidence'}, 'source')
        require(text(source['file_id']), 'source identity required')
        if source['revision'] is None:
            require(text(source['revision_unknown_reason']), 'unknown revision requires reason')
        else:
            require(text(source['revision']) and source['revision_unknown_reason'] is None, 'revision metadata inconsistent')
        raw_hash = source['raw_sha256']
        require(raw_hash is None or digest(raw_hash, SHA256), 'raw SHA256 invalid')
        provenance = source['hash_verification']
        require(isinstance(provenance, str) and provenance in {'fresh', 'inherited', 'unknown'}, 'hash provenance invalid')
        require(text(source['verification_evidence']), 'hash provenance evidence or limitation required')
        if provenance in {'fresh', 'inherited'}:
            require(raw_hash is not None, 'fresh/inherited hash required')
        require(text(row['finding_id']), 'finding ID required')
        require(isinstance(row['source_locator'], str) and POINTER.fullmatch(row['source_locator']), 'source JSON pointer required')
        identity = (source['file_id'], source['revision'], raw_hash, row['finding_id'])
        require(identity not in seen, 'duplicate scoped finding')
        seen.add(identity)
        state = row['recorded_disposition']
        require(isinstance(state, str) and state in STATES, 'disposition invalid')
        require(text(row['disposition_evidence']), 'content-owner decision reference or limitation required')
        string_list(row['accepted_scope'], 'accepted scope')
        string_list(row['remaining_scope'], 'remaining scope')
        require(not set(row['accepted_scope']) & set(row['remaining_scope']), 'scope overlap')
        canonical = row['canonical_evidence']
        require(isinstance(canonical, list), 'canonical evidence array required')
        for evidence in canonical:
            fields(evidence, {'commit_sha', 'run_id', 'record_id', 'path', 'json_pointer',
                              'run_raw_sha256', 'verification_evidence'}, 'canonical evidence')
            require(digest(evidence['commit_sha'], SHA1), 'canonical commit must be exact')
            require(text(evidence['run_id']) and text(evidence['record_id']), 'canonical run and record required')
            path = evidence['path']
            require(text(path) and not path.startswith('/') and '\\' not in path
                    and all(part not in {'', '.', '..'} for part in path.split('/')), 'repository-relative evidence path required')
            require(isinstance(evidence['json_pointer'], str) and POINTER.fullmatch(evidence['json_pointer']), 'canonical JSON pointer required')
            require(digest(evidence['run_raw_sha256'], SHA256), 'canonical run raw SHA256 required')
            require(text(evidence['verification_evidence']), 'canonical proof reference required')
        publication = row['publication_evidence']
        require(isinstance(publication, list), 'publication evidence array required')
        for evidence in publication:
            fields(evidence, {'commit_sha', 'reference'}, 'publication evidence')
            require(digest(evidence['commit_sha'], SHA1) and text(evidence['reference']), 'exact publication evidence reference required')
        if state in {'accepted', 'partial'}:
            require(provenance == 'fresh', 'acceptance cannot rely on inherited/unknown hash')
            require(bool(canonical) and bool(row['accepted_scope']), 'bounded acceptance and canonical proof required')
        else:
            require(not row['accepted_scope'], 'unresolved/unknown cannot assert accepted scope')
        if state == 'partial':
            require(bool(row['remaining_scope']), 'partial requires remaining scope')
        if state == 'accepted':
            require(not row['remaining_scope'], 'accepted finding cannot have remaining scope; use partial')
        counts[state] += 1
    return {'classification': 'STRUCTURAL_CHECK_ONLY', 'structural_check': 'PASS',
            'baseline_match': 'CALLER_SUPPLIED_SHA_ONLY', 'finding_count': len(rows),
            'counts_by_recorded_disposition': {state: counts[state] for state in STATES},
            'factual_verification': 'NOT_RUN', 'canonical_verification': 'NOT_RUN',
            'publication_verification': 'NOT_RUN', 'global_completeness': False,
            'authority': {key: False for key in sorted(AUTHORITY)}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--expected-main-sha', required=True)
    args = parser.parse_args()
    try:
        result = validate_map(parse_map(args.input.read_text(encoding='utf-8')),
                              expected_main_sha=args.expected_main_sha)
    except (OSError, UnicodeError, ValueError, TypeError, RecursionError):
        # Do not echo private source IDs, paths, evidence content or parser excerpts.
        print('acceptance map validation failed', file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
