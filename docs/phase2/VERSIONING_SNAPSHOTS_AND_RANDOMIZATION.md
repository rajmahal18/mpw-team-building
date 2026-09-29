# Versioning, Snapshots & Randomization

## 1. Why immutable versions matter

A competitive event must be able to answer:

> What exact instructions, question versions, scoring rules, route rules, and answer keys applied when Team Blue performed this activity?

Therefore live runtime records reference immutable version IDs.

## 2. Template versioning

```text
ActivityTemplate
  v1
  v2
  v3
```

Adding template `v2` to an event creates an event-owned activity definition. It does **not** create a live pointer that silently changes when template `v3` is published.

Store provenance:

- source template ID;
- source template version ID;
- copiedAt;
- copiedBy.

After copy, organizer may customize freely.

## 3. Activity definition versions

```text
ActivityInstance
  Draft definition A
  Published v1 (immutable)
  Draft derived from v1
  Published v2 (immutable)
```

`ActivityRun.activityDefinitionVersionId` permanently identifies what that run used.

## 4. Question versions

`Question` is stable identity; `QuestionVersion` is immutable content/answer key.

Editing spelling, choices, accepted aliases, media, points defaults, or answer key creates a new version when published.

## 5. Event snapshot

Locking an event creates an `EventSnapshot` containing at minimum:

- event config version/hash;
- team roster snapshot policy/reference;
- activity instance -> definition version map;
- station/route version or snapshot;
- competition configs;
- question draw specifications;
- scoring aggregation definition;
- terminology/visibility policies relevant to gameplay;
- createdAt/by;
- checksum.

The snapshot may be stored as normalized JSON plus explicit referenced version IDs.

## 6. Live hotfix policy

Real events need fixes. Never mutate locked history invisibly.

Possible hotfix flow:

1. authorized organizer opens a new draft from published v1;
2. edits configuration;
3. system shows impact analysis;
4. organizer publishes v2 with reason;
5. defines effective scope:
   - only future runs;
   - selected affected entries;
   - all not-yet-started teams;
6. existing started/completed runs remain on v1 unless explicitly migrated/voided;
7. action is audited.

## 7. Randomization record

Any fairness-relevant random draw stores:

```text
RandomizationRecord
- eventId
- scopeType / scopeId
- purpose
- algorithmVersion
- seedHash / seed representation
- inputSetHash
- outputJson
- generatedAt
- generatedBy: SERVER
- relatedDefinitionVersionId
```

Examples:

- shuffled choice order;
- random 20 questions from a 100-question bank;
- randomized station order;
- representative draw;
- randomized tournament seeding.

## 8. Randomization scopes

Supported scopes may include:

- EVENT: same draw for everyone;
- TEAM: stable unique draw per team;
- ENTRY: stable per participation unit;
- ATTEMPT: new draw per allowed attempt;
- ROUND/MATCH: unique per competition unit.

The organizer explicitly configures scope where it matters.

## 9. Question selection snapshots

For a quiz draw, runtime should not repeatedly query “current active questions.” Store selected immutable question-version IDs and order.

Example:

```json
{
  "bankId": "bank_general",
  "selectionPolicy": { "type": "RANDOM_N", "count": 20 },
  "questionVersionIds": ["qv_81", "qv_12", "qv_55"],
  "choiceOrders": {
    "qv_81": ["c3", "c1", "c4", "c2"]
  }
}
```

## 10. Schema version vs content version

Do not confuse:

- **schema version** — shape/contract of JSON;
- **content version** — organizer's published revision.

An activity may be content v7 while using schema v2.

## 11. Checksums

Published definitions/snapshots should have canonicalized content hashes/checksums. Useful for:

- detecting corruption/unintended mutation;
- audit exports;
- comparing runtime references;
- cache validation.
