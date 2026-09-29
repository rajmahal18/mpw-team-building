# Block & Plugin Registries

## Why registries

The platform must grow by **adding generic capability modules**, not by adding `if (game === ...)` branches.

A registry entry bundles the complete contract for one primitive.

## 1. Activity block registry

Conceptual interface:

```ts
interface ActivityBlockPlugin<TConfig, TSubmission, TResult> {
  type: string;
  schemaVersion: number;

  configSchema: ZodType<TConfig>;
  submissionSchema?: ZodType<TSubmission>;

  sanitizeForParticipant(config: TConfig, ctx: ViewContext): unknown;
  validateSubmission?(submission: TSubmission, config: TConfig, ctx: RuntimeContext): ValidationResult;
  deriveMetrics?(submission: TSubmission, config: TConfig, ctx: RuntimeContext): MetricEmission[];

  organizerEditorKey: string;
  participantRendererKey?: string;
  marshalRendererKey?: string;

  capabilities?: string[];
}
```

The UI keys map to actual components in Phase 4/5. The server owns validation and result derivation.

## 2. Initial block registry

### Content

- `heading`
- `rich_text`
- `image`
- `video`
- `audio`
- `file_reference`
- `clue`
- `hint`
- `safety_notice`
- `equipment_checklist`

### Objective inputs

- `single_select`
- `multi_select`
- `boolean`
- `text_input`
- `fill_blank`
- `number_input`
- `ordering`
- `matching`
- `categorization`
- `ranking`
- `rating`
- `checklist`
- `secret_code`

### Evidence/manual inputs

- `photo_submission`
- `video_submission`
- `audio_submission`
- `file_submission`
- `marshal_decision`
- `judge_rubric`
- `manual_metric`

### Controls

- `timer`
- `countdown`
- `approval_gate`
- `random_draw`
- `acknowledge`

Do not implement every plugin in Phase 3. The registry contract exists now so later plugins are additive.

## 3. Question type registry

Questions can reuse the block engine but receive question-specific metadata.

```ts
interface QuestionTypePlugin<TConfig, TAnswer> {
  type: string;
  configSchema: ZodType<TConfig>;
  answerSchema: ZodType<TAnswer>;
  participantProjection(config: TConfig): unknown;
  grade?(answer: TAnswer, protectedConfig: TConfig): GradeResult;
}
```

Initial logical types:

- single select;
- multi select;
- true/false;
- text/fill blank;
- numeric;
- ordering;
- matching;
- categorization;
- media prompt + objective answer;
- manual/judged response;
- survey/non-scored.

## 4. Metric type registry

A metric plugin defines normalization and comparison behavior.

Examples:

- duration;
- number/count;
- distance;
- volume;
- percentage;
- boolean;
- rubric score;
- placement;
- text remark.

Never encode “sack race time” as a metric type. It is simply `duration` with `LOWER_BETTER`.

## 5. Scoring operator registry

Operators should be composable AST nodes:

- constant;
- metric reference;
- add;
- subtract;
- multiply;
- divide-safe;
- min/max;
- clamp;
- round;
- threshold/bands;
- if/else;
- weighted sum;
- sum/average/best/worst;
- placement lookup;
- normalize;
- target-distance;
- attempt selector;
- judge aggregation.

New operators require tests using at least two different activity families.

## 6. Rule trigger registry

Examples:

- event start/end/pause/resume;
- route step reached/completed;
- activity run start/complete/fail;
- submission accepted/rejected;
- timer expired;
- metric recorded;
- score finalized;
- station check-in;
- marshal decision;
- match completed;
- manual organizer trigger.

## 7. Condition operator registry

- equality/inequality;
- numeric comparison;
- membership;
- contains;
- exists/missing;
- completed/not completed;
- status equals;
- time/window comparison;
- logical `ALL`, `ANY`, `NOT`.

## 8. Action registry

- unlock/lock activity;
- open/close station;
- add score adjustment;
- add time penalty;
- set/increment variable;
- assign route step;
- enqueue/dequeue;
- send message;
- request approval;
- mark complete/fail/void;
- create tiebreaker;
- generate content draw;
- create competition match;
- log domain event.

## 9. Competition format registry

```ts
interface CompetitionFormatPlugin<TConfig> {
  type: string;
  configSchema: ZodType<TConfig>;
  createInitialMatches(entries: EntryRef[], config: TConfig): MatchDraft[];
  onMatchFinalized(state: CompetitionState, match: MatchResult): CompetitionMutation[];
  validate(state: CompetitionState): ValidationIssue[];
}
```

Candidates:

- round robin;
- single elimination;
- double elimination;
- pools/groups;
- group-to-knockout;
- manual bracket;
- best-of-N series;
- random/seeded heats.

## 10. Registry invariant

A plugin is incomplete unless it defines:

1. configuration schema;
2. server validation;
3. safe participant projection;
4. runtime serialization/result semantics;
5. permission requirements if any;
6. audit implications;
7. migration/version strategy;
8. tests with at least two different use cases.
