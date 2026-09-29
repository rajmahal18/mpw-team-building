# Configuration & Zod Contracts

> These are **contract proposals**, not final repo code. Phase 3 should turn them into actual shared TypeScript/Zod schemas.

## 1. Design rules

- Discriminated unions for every extensible primitive.
- Stable machine keys are separate from organizer-facing labels.
- Every array is variable-length unless semantics require otherwise.
- Technical abuse/safety ceilings may exist, but they are platform limits—not event assumptions.
- Unknown config must fail validation rather than silently being ignored.
- Published definitions carry `schemaVersion` and are immutable.
- No arbitrary JS expressions.

## 2. Shared primitives

```ts
type Id = string;
type ISODateTime = string;

type LocalizedText = {
  default: string;
  translations?: Record<string, string>;
};

type Visibility = "PUBLIC" | "EVENT" | "STAFF" | "PRIVATE";

type ActorKind =
  | "TEAM"
  | "INDIVIDUAL"
  | "PAIR"
  | "SUBGROUP"
  | "AD_HOC";
```

## 3. Event config

```ts
type EventConfig = {
  schemaVersion: 1;
  terminology: {
    team: string;
    participant: string;
    station: string;
    marshal: string;
    points: string;
  };
  participation: {
    accountRequirement: "NONE" | "OPTIONAL" | "REQUIRED";
    deviceMode: "INDIVIDUAL" | "SHARED_TEAM" | "EITHER";
    allowLateJoin: boolean;
  };
  leaderboard: LeaderboardPolicy;
  privacy: PrivacyPolicy;
  timing: EventTimingPolicy;
  featureFlags: Record<string, boolean>;
};
```

The event's visual theme is data but not a Phase 2 design concern:

```ts
type EventBrandingConfig = {
  logoAssetId?: Id;
  coverAssetId?: Id;
  teamColorUsage?: "NONE" | "ACCENT" | "PROMINENT";
  themeTokens?: Record<string, string>; // validated/whitelisted later
};
```

## 4. Participation policy

```ts
type ParticipationPolicy = {
  mode:
    | "INDIVIDUAL"
    | "WHOLE_TEAM"
    | "PAIR"
    | "SUBGROUP"
    | "TEAM_VS_TEAM"
    | "MULTI_TEAM_HEAT"
    | "SELECTED_REPRESENTATIVES";
  minActive?: number;
  maxActive?: number;
  selection?:
    | { type: "ALL" }
    | { type: "CAPTAIN" }
    | { type: "ORGANIZER_ASSIGNED" }
    | { type: "TEAM_CHOOSES"; count?: number }
    | { type: "RANDOM"; count: number; scope: "TEAM" | "EVENT" };
  substitutions?: {
    allowed: boolean;
    untilState?: "NOT_STARTED" | "LIVE";
  };
};
```

## 5. Activity definition

```ts
type ActivityDefinition = {
  schemaVersion: 1;
  key: string;
  title: LocalizedText;
  description?: LocalizedText;
  categoryTags: string[];
  participation: ParticipationPolicy;
  content: ActivityBlock[];
  metrics: MetricDefinition[];
  attempts: AttemptPolicy;
  timing: TimingPolicy;
  verification: VerificationPolicy;
  scoring?: ScoringDefinition;
  rules: RuleDefinition[];
  completion: CompletionPolicy;
  progression?: ProgressionPolicy;
  safety?: SafetyMetadata;
  accessibility?: AccessibilityMetadata;
  organizerNotes?: string;
  marshalNotes?: string;
};
```

## 6. Block union

```ts
type ActivityBlock =
  | HeadingBlock
  | RichTextBlock
  | ClueBlock
  | HintBlock
  | SafetyNoticeBlock
  | MediaBlock
  | SingleSelectBlock
  | MultiSelectBlock
  | BooleanBlock
  | TextInputBlock
  | NumberInputBlock
  | OrderingBlock
  | MatchingBlock
  | CategorizationBlock
  | RankingBlock
  | RatingBlock
  | ChecklistBlock
  | MediaSubmissionBlock
  | SecretCodeBlock
  | ManualMetricBlock
  | AcknowledgeBlock
  | JudgeRubricBlock
  | MarshalDecisionBlock
  | TimerBlock
  | RandomDrawBlock
  | ApprovalGateBlock;
```

Every block has:

```ts
type BlockBase = {
  id: string;                 // stable within definition lineage
  type: string;               // registry discriminator
  visibleTo?: Visibility;
  title?: LocalizedText;
  required?: boolean;
  when?: ConditionExpr;       // optional display/eligibility condition
};
```

## 7. Multiple choice — arbitrary choices

```ts
type Choice = {
  id: string;
  label?: LocalizedText;
  mediaAssetId?: Id;
  organizerNote?: string;
};

type SingleSelectBlock = BlockBase & {
  type: "single_select";
  prompt: LocalizedText;
  choices: Choice[];
  shuffleChoices?: boolean;
  validation: {
    correctChoiceIds?: string[]; // protected server-side projection
  };
  scoring?: QuestionScoringPolicy;
};

type MultiSelectBlock = BlockBase & {
  type: "multi_select";
  prompt: LocalizedText;
  choices: Choice[];
  selection: {
    min?: number;
    max?: number;
  };
  validation: {
    correctChoiceIds?: string[];
    correctnessMode: "EXACT_SET" | "PARTIAL_ALLOWED";
  };
  scoring?: QuestionScoringPolicy;
};
```

There is no `choiceA`, `choiceB`, `choiceC`, or `choiceD` field.

## 8. Text/fill-blank

```ts
type TextNormalization = {
  trim: boolean;
  collapseWhitespace: boolean;
  caseSensitive: boolean;
  ignorePunctuation?: boolean;
  unicodeNormalization?: "NFC" | "NFKC" | "NONE";
};

type TextMatcher =
  | { type: "EXACT"; accepted: string[]; normalization: TextNormalization }
  | { type: "CONTAINS"; accepted: string[]; normalization: TextNormalization }
  | { type: "REGEX"; patterns: string[]; flags?: string }
  | { type: "FUZZY"; accepted: string[]; threshold: number; normalization: TextNormalization }
  | { type: "MANUAL_REVIEW" };

type TextInputBlock = BlockBase & {
  type: "text_input" | "textarea" | "fill_blank";
  prompt: LocalizedText;
  blanks?: Array<{ id: string; label?: string; matcher?: TextMatcher }>;
  matcher?: TextMatcher;
  maxLength?: number;
};
```

## 9. Numeric input/result

```ts
type NumericAcceptance =
  | { type: "EXACT"; value: number }
  | { type: "RANGE"; min?: number; max?: number }
  | { type: "ABS_TOLERANCE"; target: number; tolerance: number }
  | { type: "PERCENT_TOLERANCE"; target: number; percent: number }
  | { type: "MANUAL" };

type NumberInputBlock = BlockBase & {
  type: "number_input";
  prompt: LocalizedText;
  unit?: string;
  acceptance?: NumericAcceptance;
};
```

## 10. Metrics

```ts
type MetricDefinition = {
  key: string;
  label: LocalizedText;
  type:
    | "NUMBER"
    | "DURATION_MS"
    | "COUNT"
    | "DISTANCE"
    | "VOLUME"
    | "WEIGHT"
    | "PERCENT"
    | "BOOLEAN"
    | "TEXT"
    | "RUBRIC"
    | "PLACEMENT";
  unit?: string;
  direction?: "HIGHER_BETTER" | "LOWER_BETTER" | "TARGET_BEST" | "NEUTRAL";
  target?: number;
  source:
    | "SYSTEM"
    | "SUBMISSION"
    | "MARSHAL"
    | "JUDGE"
    | "ORGANIZER"
    | "COMPETITION";
};
```

## 11. Timing

```ts
type TimingPolicy = {
  mode: "NONE" | "COUNTDOWN" | "STOPWATCH" | "WINDOW";
  durationMs?: number;
  startTrigger?: "MANUAL" | "FIRST_OPEN" | "FIRST_INPUT" | "MARSHAL" | "RULE";
  expiryAction?: "NONE" | "AUTO_SUBMIT" | "FAIL" | "REQUIRE_REVIEW";
  pause?: {
    allowed: boolean;
    allowedCapabilities?: string[];
  };
  graceMs?: number;
  authority?: "SERVER" | "MARSHAL_RECORDED";
};
```

## 12. Attempts

```ts
type AttemptPolicy = {
  maxAttempts?: number; // undefined means not count-limited
  resetScope?: "NEVER" | "ROUND" | "DAY" | "MANUAL";
  preserveBest?: boolean;
  preserveAllResults: boolean;
  failedAttemptPenalty?: ScoreAdjustmentDefinition;
};
```

## 13. Verification

```ts
type VerificationPolicy =
  | { type: "AUTO" }
  | { type: "SELF_DECLARE" }
  | { type: "CAPTAIN" }
  | { type: "MARSHAL"; approvalsRequired?: number }
  | { type: "JUDGE"; judgesRequired?: number }
  | { type: "OPPONENT" }
  | { type: "DUAL"; requiredRoles: string[] }
  | { type: "MEDIA_REVIEW"; mediaTypes: string[] }
  | { type: "ORGANIZER_FINALIZE" };
```

## 14. Completion

```ts
type CompletionPolicy =
  | { type: "ALL_REQUIRED_BLOCKS" }
  | { type: "ANY_N_BLOCKS"; count: number }
  | { type: "METRIC_THRESHOLD"; metricKey: string; operator: CompareOp; value: unknown }
  | { type: "VERIFIED" }
  | { type: "RULE_CONTROLLED" };
```

## 15. Progression

```ts
type ProgressionPolicy = {
  onComplete?: ProgressionAction[];
  onFail?: ProgressionAction[];
};

type ProgressionAction =
  | { type: "UNLOCK_ACTIVITY"; activityId: Id }
  | { type: "UNLOCK_STATION"; stationId: Id }
  | { type: "ASSIGN_ROUTE_STEP"; routeStepId: Id }
  | { type: "FINISH_ROUTE" }
  | { type: "NONE" };
```

## 16. Safety/accessibility metadata

```ts
type SafetyMetadata = {
  intensity?: "LOW" | "MODERATE" | "HIGH";
  environment?: Array<"INDOOR" | "OUTDOOR" | "WET" | "HEAT" | "STAIRS" | "ROUGH_GROUND">;
  equipment?: Array<{ item: string; quantity?: number; notes?: string }>;
  warnings?: string[];
  stopConditions?: string[];
};

type AccessibilityMetadata = {
  mobilityDemand?: "LOW" | "MEDIUM" | "HIGH";
  requiresVision?: boolean;
  requiresHearing?: boolean;
  requiresFineMotor?: boolean;
  alternativeRoles?: string[];
  organizerNotes?: string[];
};
```

## 17. Schema evolution

Every top-level versioned definition includes `schemaVersion`.

Upgrade rules:

- old published versions remain readable;
- migrations are deterministic pure transforms;
- runtime never mutates historical JSON in place;
- unsupported old versions are migrated on read to an internal normalized form, while raw original remains retained where required;
- registry components declare which schema versions they support.
