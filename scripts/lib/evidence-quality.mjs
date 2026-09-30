// Review signals only. This module makes no factual, acceptance or publication decision.
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) ? value : [];
const validHttp = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
};

export function analyzeEvidenceQuality(data, {asOf, staleDays = 30} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf || '') || !Number.isInteger(staleDays) || staleDays < 1)
    throw new TypeError('asOf YYYY-MM-DD and positive staleDays required');
  const asOfMillis = Date.parse(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(asOfMillis) || new Date(asOfMillis).toISOString().slice(0, 10) !== asOf)
    throw new TypeError('invalid asOf date');
  const sources = list(data?.sources?.sources);
  const records = list(data?.records?.records);
  const evidence = list(data?.evidence?.evidence);
  const findings = [];
  const add = (kind, id, code) => findings.push({kind, id, code});
  const shared = new Map();
  for (const source of sources) {
    const id = source.id;
    if (!nonempty(source.url)) add('source', id, 'URL_MISSING');
    else if (!validHttp(source.url)) add('source', id, 'URL_INVALID_SCHEME');
    else {
      const normalized = source.url.trim();
      shared.set(normalized, [...(shared.get(normalized) || []), id]);
    }
    if (!nonempty(source.publisher) && !nonempty(source.name)) add('source', id, 'PUBLISHER_IDENTITY_MISSING');
    if (!nonempty(source.publication_date)) add('source', id, 'PUBLICATION_DATE_MISSING');
    if (source.source_tier == null && source.tier == null) add('source', id, 'TIER_MISSING');
    if (String(source.url_validation_status || '').includes('RECHECK_REQUIRED')) add('source', id, 'URL_RECHECK_DECLARED');
    if (nonempty(source.url_validation_checked_at)) {
      const checked = Date.parse(source.url_validation_checked_at);
      if (Number.isFinite(checked) && asOfMillis - checked > staleDays * 86400000)
        add('source', id, 'URL_CHECK_OLDER_THAN_THRESHOLD');
    }
  }
  for (const ids of shared.values()) if (ids.length > 1)
    for (const id of ids) add('source', id, 'URL_SHARED_BY_MULTIPLE_SOURCE_IDS');
  for (const record of records) {
    const count = list(record.source_ids).length;
    if (count === 0) add('record', record.id, 'NO_SOURCE_ID');
    else if (count === 1) add('record', record.id, 'SINGLE_SOURCE_ID');
  }
  for (const item of evidence) {
    const id = item.evidence_id || item.id;
    if (!list(item.source_ids).length) add('evidence', id, 'NO_SOURCE_ID');
    if (!nonempty(item.what_it_does_not_prove_cs) && !nonempty(item.what_it_does_not_prove_en))
      add('evidence', id, 'LIMITATION_TEXT_MISSING');
  }
  findings.sort((a, b) => `${a.kind}:${a.id}:${a.code}`.localeCompare(`${b.kind}:${b.id}:${b.code}`, 'en'));
  const byCode = {};
  for (const item of findings) byCode[item.code] = (byCode[item.code] || 0) + 1;
  return {
    classification: 'READ_ONLY_REVIEW_SIGNALS',
    as_of: asOf,
    stale_days: staleDays,
    inventory: {sources: sources.length, records: records.length, evidence: evidence.length},
    finding_count: findings.length,
    findings_by_code: Object.fromEntries(Object.entries(byCode).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    live_url_check: 'NOT_RUN',
    semantic_evidence_review: 'NOT_RUN',
    canonical_mutation_authorized: false,
    publication_authorized: false,
    findings,
  };
}
