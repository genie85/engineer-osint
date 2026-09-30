// Prioritization is a deterministic work-order hint, never factual or publication authority.
const REVIEW_FIRST = new Set(['URL_MISSING', 'URL_INVALID_SCHEME', 'NO_SOURCE_ID', 'URL_RECHECK_DECLARED']);
const REVIEW_NEXT = new Set(['LIMITATION_TEXT_MISSING', 'TIER_MISSING', 'PUBLICATION_DATE_MISSING']);
const ranks = {REVIEW_FIRST: 0, REVIEW_NEXT: 1, MONITOR: 2};

export function buildReviewQueue(report, {limit = 25} = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new TypeError('limit must be 1..1000');
  if (report?.classification !== 'READ_ONLY_REVIEW_SIGNALS' || !Array.isArray(report.findings))
    throw new TypeError('full read-only findings required');
  const bySubject = new Map();
  for (const finding of report.findings) {
    if (!['source', 'record', 'evidence'].includes(finding.kind) || !finding.id || !finding.code)
      throw new TypeError('invalid review finding');
    const key = `${finding.kind}\0${finding.id}`;
    if (!bySubject.has(key)) bySubject.set(key, {kind: finding.kind, id: finding.id, codes: new Set()});
    bySubject.get(key).codes.add(finding.code);
  }
  const queue = [...bySubject.values()].map(({kind, id, codes}) => {
    const sorted = [...codes].sort();
    const work_order = sorted.some(code => REVIEW_FIRST.has(code)) ? 'REVIEW_FIRST'
      : sorted.some(code => REVIEW_NEXT.has(code)) ? 'REVIEW_NEXT' : 'MONITOR';
    return {kind, id, work_order, codes: sorted};
  });
  queue.sort((a, b) => ranks[a.work_order] - ranks[b.work_order]
    || a.kind.localeCompare(b.kind, 'en') || a.id.localeCompare(b.id, 'en'));
  const counts = {REVIEW_FIRST: 0, REVIEW_NEXT: 0, MONITOR: 0};
  for (const item of queue) counts[item.work_order]++;
  return {
    classification: 'READ_ONLY_REVIEW_QUEUE',
    canonical_run_id: report.canonical_run_id || null,
    canonical_sha256: report.canonical_sha256 || null,
    manifest_file_sha256: report.manifest_file_sha256 || null,
    as_of: report.as_of,
    subject_count: queue.length,
    counts_by_work_order: counts,
    shown: Math.min(limit, queue.length),
    omitted: Math.max(0, queue.length - limit),
    factual_assessment: 'NOT_RUN',
    canonical_mutation_authorized: false,
    publication_authorized: false,
    queue: queue.slice(0, limit),
  };
}
