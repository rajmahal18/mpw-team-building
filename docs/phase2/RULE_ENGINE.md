# Declarative Rule Engine

## 1. Principle

Organizer-authored automation must be powerful without permitting arbitrary code execution.

Model rules as:

```text
WHEN trigger
IF condition expression
THEN ordered actions
```

Rules are versioned inside the activity/event definition. Runtime executions are separately recorded.

## 2. Rule definition

```ts
type RuleDefinition = {
  id: string;
  enabled: boolean;
  name?: string;
  trigger: TriggerDefinition;
  condition?: ConditionExpr;
  actions: ActionDefinition[];
  executionPolicy?: {
    oncePer?: "EVENT" | "TEAM" | "ENTRY" | "ACTIVITY_RUN" | "TRIGGER_OCCURRENCE";
    maxExecutions?: number;
  };
};
```

## 3. Typed value references

Conditions/actions read values through safe references:

```ts
type ValueExpr =
  | { type: "literal"; value: unknown }
  | { type: "metric"; key: string }
  | { type: "score"; scope: "ACTIVITY" | "EVENT"; key?: string }
  | { type: "run"; field: "attemptNo" | "elapsedMs" | "status" }
  | { type: "team"; field: "id" | "status" | "completedActivityCount" }
  | { type: "event"; field: "state" | "now" }
  | { type: "station"; field: "status" | "queueLength" | "capacity" }
  | { type: "submission"; field: "status" | "correct" }
  | { type: "variable"; scope: string; key: string };
```

No raw property paths supplied by the browser. Every resolvable field is whitelisted by registry.

## 4. Condition AST

```ts
type CompareOp = "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "NOT_IN";

type ConditionExpr =
  | { type: "compare"; left: ValueExpr; op: CompareOp; right: ValueExpr }
  | { type: "exists"; value: ValueExpr }
  | { type: "all"; conditions: ConditionExpr[] }
  | { type: "any"; conditions: ConditionExpr[] }
  | { type: "not"; condition: ConditionExpr };
```

## 5. Trigger examples

```ts
{ type: "ACTIVITY_RUN_COMPLETED" }
{ type: "STATION_CHECKED_IN", stationId: "..." }
{ type: "TIMER_EXPIRED", timerKey: "quiz" }
{ type: "MATCH_FINALIZED" }
{ type: "MANUAL", key: "release_bonus_round" }
```

## 6. Action examples

```ts
{ type: "ADD_SCORE", amount: { type: "literal", value: 20 }, reason: "Bonus" }
{ type: "UNLOCK_ACTIVITY", activityId: "..." }
{ type: "ASSIGN_ROUTE_STEP", routeStepId: "..." }
{ type: "SEND_MESSAGE", audience: { type: "CURRENT_ENTRY" }, templateId: "..." }
{ type: "MARK_RUN_FAILED" }
```

## 7. Government-team-building examples

### Failed challenge -> redemption task

```text
WHEN activity run completed
IF metric.success == false
THEN unlock Redemption Challenge
```

### Station congestion -> optional reroute

```text
WHEN station check-in requested
IF station.queueLength >= station.capacityThreshold
THEN assign configured alternate route step
```

### Bonus for complete route before cutoff

```text
WHEN route completed
IF event.now <= configured cutoff
THEN add configured bonus points
```

All values such as threshold, bonus, alternate route, and cutoff are organizer data.

## 8. Determinism and idempotency

Each runtime rule execution stores:

- rule definition version/checksum;
- trigger event ID;
- scope IDs;
- condition result;
- actions attempted;
- action result IDs;
- executedAt;
- idempotency key.

Reprocessing the same domain event must not double-award points or duplicate route assignments.

## 9. Loop prevention

Rules can cause events that could trigger other rules. Guardrails:

- event/action deduplication;
- maximum causal depth;
- explicit `oncePer` policies;
- detect direct self-trigger cycles during preflight where possible;
- prohibit rule graphs that mutate their own trigger condition indefinitely without a bounded policy;
- transaction/outbox boundary for side effects.

## 10. Runtime ordering

Recommended:

1. persist originating mutation;
2. emit domain event/outbox row in same transaction;
3. worker/server process rule candidates;
4. evaluate against server-authoritative state;
5. execute actions transactionally where possible;
6. record `RuleExecution`;
7. emit resulting events.

V1 can process synchronously for simplicity as long as the contract remains idempotent and replay-safe.

## 11. Security

Never support:

- JavaScript `eval`;
- SQL fragments;
- arbitrary HTTP requests from organizer formulas;
- dynamic imports;
- unbounded loops;
- direct database field mutation by string path.
