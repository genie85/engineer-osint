# ENGINEER OSINT — RESEARCH → DEVELOPMENT HANDOFF CONTRACT v1

Prompt semantic version: 3.7
Canonical prompt authority: `MASTER_PROMPT.md`
Machine schema: `prompt-handoff.schema.json`

## 1. Účel

Handoff odděluje **význam a důkazy** od **implementace**. RESEARCH dodává DEVELOPMENT přesně strukturovaný, auditovatelný balík. DEVELOPMENT jej spotřebuje bez svévolné reinterpretace factual vrstvy.

Cíle:

- neprovádět stejný research dvakrát bez důvodu;
- zabránit přeskoku od neověřeného zjištění k implementaci;
- zabránit DEVELOPMENT agentu měnit fakta/licence/confidence kvůli testům nebo UI;
- umožnit přesné stale/failure routing zpět do RESEARCH;
- zachovat hashes, source dates, conflicts, limitations a downstream validation plan.

## 2. Statusy

### `READY_FOR_DEVELOPMENT`

Research je v deklarovaném scope dostatečně uzavřený pro implementaci. Neznamená automatickou canonical authorization.

### `BLOCKED_RESEARCH`

Chybí důkaz, identita, licence, rozlišení konfliktu nebo jiná research podmínka, která může změnit význam/implementaci. DEVELOPMENT nesmí blocker obejít.

### `REVIEW_REQUIRED`

Podklady jsou dostatečné k lidskému/chráněnému rozhodnutí, ale nikoli k autonomní downstream mutaci v daném risk scope.

## 3. Povinné top-level položky

Každý handoff podle `prompt-handoff.schema.json` obsahuje minimálně:

- `schema_version`;
- `handoff_id`;
- `producer=RESEARCH`;
- `consumer=DEVELOPMENT`;
- `status`;
- `created_at`;
- `base_main_sha`;
- `canonical_parent`;
- `candidate`;
- `factual_scope`;
- `claims`;
- `sources`;
- `evidence`;
- `conflicts`;
- `unresolved`;
- `safety_classification`;
- `media`;
- `expected_effect`;
- `invariants_to_preserve`;
- `required_downstream_validations`;
- `deterministic_hashes`;
- `forbidden_mutations`;
- `freshness`.

Pole smějí být prázdná pouze tam, kde prázdnota sama nese explicitní význam. Povinné pole se nesmí vynechat jen proto, že downstream agent „si to domyslí“.

## 4. READY gate

RESEARCH smí nastavit `READY_FOR_DEVELOPMENT` jen pokud:

1. factual scope je jednoznačný;
2. každý podstatný claim má klasifikaci `FACT | INFERENCE | CONFLICT | UNVERIFIED`;
3. source/evidence vztahy jsou explicitní;
4. relevantní konflikty a limitations nejsou skryté;
5. unresolved položka, která může změnit bezpečnost, canonical identitu, factual meaning nebo media práva, není ignorována;
6. parent/base sensitivity je popsána;
7. relevantní deterministic hashes jsou vyplněny, pokud je lze bezpečně vypočítat;
8. downstream validation plan je konkrétní;
9. forbidden mutations chrání factual/safety hranice;
10. media položka není označena implementovatelně, pokud licence nebo identita zůstává nevyřešená.

## 5. DEVELOPMENT acceptance gate

DEVELOPMENT před první factual-dependent mutací:

1. schema-validate handoff;
2. ověří semantic prompt version/CORE;
3. fresh-readne `main` a relevantní canonical parent;
4. vyhodnotí `freshness`;
5. ověří candidate/hash identity, pokud je relevantní;
6. ověří, že implementační plán nepřekračuje `forbidden_mutations`;
7. ověří, že `status=READY_FOR_DEVELOPMENT`.

Mismatch = žádná factual-dependent write operace.

## 6. Stale handoff

Použij `STALE_HANDOFF`, pokud:

- `base_main_sha` se změnil a `freshness.revalidate_on_main_change=true`;
- canonical parent se změnil a `freshness.parent_sensitive=true`;
- candidate/hash identity driftuje;
- vypršel `valid_until` u časově citlivého zjištění;
- source correction materialně mění evidence scope.

Stale handoff se neaktualizuje downstream odhadem. Vrať jej RESEARCH k revalidaci nebo regeneraci.

## 7. HANDOFF_REJECTED feedback

DEVELOPMENT vrací factual/research problém bez mutace factual scope:

```json
{
  "status": "HANDOFF_REJECTED",
  "handoff_id": "...",
  "rejection_code": "...",
  "observed_failure": "...",
  "intended_layer": "...",
  "observed_layer": "...",
  "needed_research_change": "...",
  "implementation_state": "UNCHANGED_FOR_FACTUAL_SCOPE"
}
```

Typické `rejection_code`:

- `SCHEMA_INVALID`;
- `STALE_BASE`;
- `STALE_PARENT`;
- `HASH_MISMATCH`;
- `UNRESOLVED_CONFLICT`;
- `INSUFFICIENT_EVIDENCE`;
- `MEDIA_LICENSE_UNRESOLVED`;
- `MEDIA_IDENTITY_UNRESOLVED`;
- `FACT_IMPLEMENTATION_CONTRADICTION`;
- `SAFETY_SCOPE_MISMATCH`.

## 8. Hranice odpovědnosti

RESEARCH nesmí downstream technický guard oslabit, aby se handoff stal implementovatelný.

DEVELOPMENT nesmí factual hodnotu změnit, aby handoff prošel buildem/testem.

Pokud technická realita odhalí factual rozpor, DEVELOPMENT jej **pozoruje a vrací**, nikoli sám vyřeší změnou faktu.

Pokud research odhalí technický blocker, popíše jej jako downstream requirement, nikoli jako důvod k přepsání workflow/guardu.

## 9. Cross-domain completion

Cross-domain slice je dokončen, až když:

- research význam zůstal beze svévolné downstream mutace;
- implementation odpovídá handoffu;
- required downstream validations jsou observed na exact head;
- unresolved/conflicts zůstávají správně reprezentované;
- canonical/history/safety hranice jsou zachované;
- deployment/runtime výsledek odpovídá expected effect, pokud je relevantní.

## 10. Reuse rule

Validní fresh handoff je důvod **neopakovat celý research**. DEVELOPMENT smí provést cílenou verifikaci konkrétního vstupu nebo stale podmínky, ale nemá bez evidence znovu otevírat již uzavřenou research otázku.

Tím se zkracuje kontext a cyklus bez snížení kvality důkazů.
