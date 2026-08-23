// One ordered manifest is shared by the public injector and runtime audits.
// Legacy factual overlays remain explicit migration debt and are audited separately.
export const LEGACY_FACTUAL_OVERLAY_MODULES=[
  ['engineer-rich-backfill-module','rich-backfill.js'],
  ['engineer-rich-backfill-israel-turkiye-eod-module','rich-backfill-israel-turkiye-eod.js'],
  ['engineer-rich-backfill-eod-lead-module','rich-backfill-eod-lead.js'],
  ['engineer-rich-backfill-usa-rok-module','rich-backfill-usa-rok.js'],
  ['engineer-data-integrity-identity-fixes-module','data-integrity-identity-fixes.js']
];

export const LOCALIZATION_DATA_MODULES=[
  ['engineer-i18n-terminology-module','i18n-terminology.js'],
  ['engineer-i18n-content-cs-module','i18n-content-cs.js'],
  ['engineer-i18n-content-cs-usa-rok-module','i18n-content-cs-usa-rok.js'],
  ['engineer-i18n-content-cs-japan-australia-module','i18n-content-cs-japan-australia.js'],
  ['engineer-i18n-content-cs-france-germany-poland-module','i18n-content-cs-france-germany-poland.js'],
  ['engineer-i18n-content-cs-israel-turkiye-rich-module','i18n-content-cs-israel-turkiye-rich.js'],
  ['engineer-i18n-content-cs-events-backlog-module','i18n-content-cs-events-backlog.js'],
  ['engineer-i18n-content-cs-public-cz-2110-module','i18n-content-cs-public-cz-2110.js'],
  ['engineer-i18n-content-cs-public-cz-0633-module','i18n-content-cs-public-cz-0633.js'],
  ['engineer-i18n-content-cs-public-cz-1746-module','i18n-content-cs-public-cz-1746.js'],
  ['engineer-i18n-content-cs-public-cz-1817-module','i18n-content-cs-public-cz-1817.js'],
  ['engineer-i18n-content-cs-public-cz-1834-module','i18n-content-cs-public-cz-1834.js'],
  ['engineer-i18n-content-cs-public-cz-1940-module','i18n-content-cs-public-cz-1940.js'],
  ['engineer-i18n-content-cs-public-cz-2015-module','i18n-content-cs-public-cz-2015.js'],
  ['engineer-i18n-content-cs-public-cz-2025-module','i18n-content-cs-public-cz-2025.js'],
  ['engineer-i18n-content-cs-public-cz-2045-module','i18n-content-cs-public-cz-2045.js'],
  ['engineer-i18n-content-cs-public-cz-b54-module','i18n-content-cs-public-cz-b54.js'],
  ['engineer-i18n-content-cs-public-cz-b61-module','i18n-content-cs-public-cz-b61.js'],
  ['engineer-i18n-content-cs-public-cz-b62-module','i18n-content-cs-public-cz-b62.js'],
  ['engineer-i18n-content-cs-public-cz-backlog-module','i18n-content-cs-public-cz-backlog.js'],
  ['engineer-i18n-enum-cs-safe-core-module','i18n-enum-cs-safe-core.js'],
  ['engineer-i18n-enum-cs-safe-registry-module','i18n-enum-cs-safe-registry.js'],
  ['engineer-i18n-enum-cs-safe-state-module','i18n-enum-cs-safe-state.js']
];

export const PRESENTATION_MODULES=[
  ['engineer-ui-phase2-module','ui-phase2.js'],
  ['engineer-ui-phase3-module','ui-phase3.js'],
  ['engineer-ui-phase4-module','ui-phase4.js'],
  ['engineer-ui-phase5-module','ui-phase5.js'],
  ['engineer-ui-phase6-i18n-module','ui-phase6-i18n.js'],
  ['engineer-i18n-language-switch-hardening-module','i18n-language-switch-hardening.js'],
  ['engineer-rich-topic-australia-nato-eod-module','rich-topic-australia-nato-eod.js'],
  ['engineer-topic-czech-engineers-eod-module','ui-topic-czech-engineers-eod.js'],
  ['engineer-ui-phase7-media-module','ui-phase7-media.js'],
  ['engineer-ui-phase8-navigation-module','ui-phase8-navigation.js'],
  ['engineer-ui-phase9-intelligence-module','ui-phase9-intelligence.js'],
  ['engineer-ui-version-status-module','ui-version-status.js'],
  ['engineer-overview-intro-stats-module','ui-overview-intro-stats.js'],
  ['engineer-overview-delta-cleanup-module','ui-overview-delta-cleanup.js'],
  ['engineer-i18n-runtime-switch-fix-module','i18n-runtime-switch-fix.js'],
  ['engineer-public-cz-ui-canary-module','public-cz-ui-canary.js']
];

export const CANONICAL_SNAPSHOT_MODULE=['engineer-canonical-snapshot-module','canonical-snapshot.js'];
export const PUBLIC_RUNTIME_MODULES=[
  ...LEGACY_FACTUAL_OVERLAY_MODULES,
  ...LOCALIZATION_DATA_MODULES,
  CANONICAL_SNAPSHOT_MODULE,
  ...PRESENTATION_MODULES
];

export const isIntrinsicTranslationPath=path=>
  /(?:^|\.)(?:[A-Za-z0-9_]+_cs|translation_audit_cs)(?:\.|$)/.test(path)||
  /(?:^|\.)(?:__i18n_public_orig|__i18n_public_orig_text)(?:\.|$)/.test(path);
