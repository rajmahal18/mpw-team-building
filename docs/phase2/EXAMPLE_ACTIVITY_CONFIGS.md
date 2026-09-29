# Example Activity Configurations

These examples prove the model can represent materially different government/team-building activities **without activity-specific tables or title-based logic**. JSON is illustrative and intentionally abbreviated where repetitive.

---

## 1. Amazing Race — QR checkpoint + marshal approval

```json
{
  "schemaVersion": 1,
  "key": "checkpoint_records_hunt",
  "title": { "default": "Records Hunt" },
  "categoryTags": ["amazing-race", "checkpoint", "teamwork"],
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "intro", "type": "rich_text", "required": true, "title": { "default": "Find the correct office based on the clue." } },
    { "id": "code", "type": "secret_code", "required": true, "title": { "default": "Enter the code given after completing the task." } },
    { "id": "approval", "type": "marshal_decision", "required": true }
  ],
  "metrics": [
    { "key": "elapsed_ms", "label": { "default": "Completion Time" }, "type": "DURATION_MS", "direction": "LOWER_BETTER", "source": "SYSTEM" }
  ],
  "attempts": { "maxAttempts": 3, "preserveAllResults": true },
  "timing": { "mode": "STOPWATCH", "startTrigger": "FIRST_OPEN", "authority": "SERVER" },
  "verification": { "type": "MARSHAL", "approvalsRequired": 1 },
  "completion": { "type": "VERIFIED" },
  "rules": []
}
```

The station/route layer controls QR arrival and what comes next. The activity itself does not know its station number.

---

## 2. Mixed-format organizer-authored quiz

One quiz can contain different question types and arbitrary choice counts.

```json
{
  "key": "mpw_knowledge_challenge",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    {
      "id": "q1",
      "type": "single_select",
      "prompt": { "default": "Select the correct answer." },
      "choices": [
        { "id": "a", "label": { "default": "Choice 1" } },
        { "id": "b", "label": { "default": "Choice 2" } },
        { "id": "c", "label": { "default": "Choice 3" } }
      ],
      "shuffleChoices": true
    },
    {
      "id": "q2",
      "type": "multi_select",
      "prompt": { "default": "Select every applicable item." },
      "choices": [
        { "id": "1", "label": { "default": "A" } },
        { "id": "2", "label": { "default": "B" } },
        { "id": "3", "label": { "default": "C" } },
        { "id": "4", "label": { "default": "D" } },
        { "id": "5", "label": { "default": "E" } },
        { "id": "6", "label": { "default": "F" } },
        { "id": "7", "label": { "default": "G" } }
      ],
      "selection": { "min": 1, "max": 4 }
    },
    {
      "id": "q3",
      "type": "fill_blank",
      "prompt": { "default": "Complete the statement." },
      "blanks": [
        { "id": "blank1", "label": "Answer" }
      ]
    }
  ],
  "metrics": [
    { "key": "correct_count", "label": { "default": "Correct Answers" }, "type": "COUNT", "direction": "HIGHER_BETTER", "source": "SYSTEM" }
  ],
  "timing": { "mode": "COUNTDOWN", "durationMs": 600000, "startTrigger": "MANUAL", "expiryAction": "AUTO_SUBMIT", "authority": "SERVER" },
  "verification": { "type": "AUTO" },
  "completion": { "type": "ALL_REQUIRED_BLOCKS" }
}
```

Protected answer keys live in server-only question/block config projections.

---

## 3. Sack race — fastest time

```json
{
  "key": "sack_race",
  "participation": { "mode": "SELECTED_REPRESENTATIVES", "minActive": 1 },
  "content": [
    { "id": "instructions", "type": "rich_text", "title": { "default": "Complete the marked course." } },
    { "id": "result", "type": "manual_metric", "required": true }
  ],
  "metrics": [
    { "key": "elapsed_ms", "label": { "default": "Time" }, "type": "DURATION_MS", "direction": "LOWER_BETTER", "source": "MARSHAL" },
    { "key": "violations", "label": { "default": "Violations" }, "type": "COUNT", "direction": "LOWER_BETTER", "source": "MARSHAL" }
  ],
  "verification": { "type": "MARSHAL" },
  "scoring": {
    "outputKey": "activity_points",
    "outputLabel": "Points",
    "expression": { "type": "placement_lookup", "table": [] }
  },
  "completion": { "type": "VERIFIED" }
}
```

The placement table is event configuration, so organizer may assign any points for any rank ranges.

---

## 4. Water transfer — highest volume with violation penalty

```json
{
  "key": "water_transfer",
  "participation": { "mode": "WHOLE_TEAM" },
  "metrics": [
    { "key": "volume_ml", "label": { "default": "Water Collected" }, "type": "VOLUME", "unit": "mL", "direction": "HIGHER_BETTER", "source": "MARSHAL" },
    { "key": "violations", "label": { "default": "Violations" }, "type": "COUNT", "direction": "LOWER_BETTER", "source": "MARSHAL" }
  ],
  "timing": { "mode": "COUNTDOWN", "durationMs": 300000, "startTrigger": "MARSHAL", "authority": "SERVER" },
  "verification": { "type": "MARSHAL" },
  "scoring": {
    "outputKey": "raw_performance",
    "outputLabel": "Performance",
    "expression": {
      "type": "subtract",
      "left": { "type": "metric", "key": "volume_ml" },
      "right": {
        "type": "multiply",
        "values": [
          { "type": "metric", "key": "violations" },
          { "type": "constant", "value": 50 }
        ]
      }
    }
  },
  "completion": { "type": "VERIFIED" }
}
```

The `50` penalty is organizer config, not source logic.

---

## 5. Team chant — judged rubric

```json
{
  "key": "team_chant",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "performance", "type": "judge_rubric", "required": true }
  ],
  "verification": { "type": "JUDGE", "judgesRequired": 3 },
  "scoring": {
    "outputKey": "judge_score",
    "outputLabel": "Judge Score",
    "expression": { "type": "judge_aggregate", "rubricKey": "chant_rubric", "mode": "AVERAGE" }
  },
  "completion": { "type": "VERIFIED" }
}
```

Rubric config might be:

```json
{
  "key": "chant_rubric",
  "criteria": [
    { "id": "creativity", "label": "Creativity", "weight": 0.35, "scale": { "min": 1, "max": 10 } },
    { "id": "teamwork", "label": "Teamwork", "weight": 0.30, "scale": { "min": 1, "max": 10 } },
    { "id": "delivery", "label": "Delivery", "weight": 0.20, "scale": { "min": 1, "max": 10 } },
    { "id": "impact", "label": "Overall Impact", "weight": 0.15, "scale": { "min": 1, "max": 10 } }
  ],
  "aggregateJudges": "AVERAGE"
}
```

Organizer may add/remove/reweight criteria.

---

## 6. Free-roam scavenger hunt — optional missions

Each mission is its own activity instance or block group. Route strategy is `FREE_CHOICE`.

Mission example:

```json
{
  "key": "photo_landmark",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "clue", "type": "clue", "title": { "default": "Find the specified location." } },
    { "id": "photo", "type": "photo_submission", "required": true }
  ],
  "verification": { "type": "MEDIA_REVIEW", "mediaTypes": ["image"] },
  "scoring": {
    "outputKey": "mission_points",
    "outputLabel": "Mission Points",
    "expression": { "type": "constant", "value": 25 }
  },
  "completion": { "type": "VERIFIED" }
}
```

Different missions can have different point values without new code.

---

## 7. Tower building — quantity + judges hybrid

```json
{
  "key": "tower_build",
  "participation": { "mode": "WHOLE_TEAM" },
  "metrics": [
    { "key": "height_cm", "label": { "default": "Height" }, "type": "DISTANCE", "unit": "cm", "direction": "HIGHER_BETTER", "source": "MARSHAL" },
    { "key": "stability_pass", "label": { "default": "Stability Test" }, "type": "BOOLEAN", "source": "MARSHAL" }
  ],
  "content": [
    { "id": "rubric", "type": "judge_rubric", "required": true }
  ],
  "scoring": {
    "outputKey": "performance_score",
    "outputLabel": "Performance",
    "expression": {
      "type": "if",
      "condition": {
        "type": "compare",
        "left": { "type": "metric", "key": "stability_pass" },
        "op": "EQ",
        "right": { "type": "literal", "value": true }
      },
      "then": {
        "type": "add",
        "values": [
          { "type": "metric", "key": "height_cm" },
          { "type": "judge_aggregate", "rubricKey": "design", "mode": "AVERAGE" }
        ]
      },
      "else": { "type": "constant", "value": 0 }
    }
  }
}
```

---

## 8. Blindfold navigation — completion time + penalties

```json
{
  "key": "blindfold_navigation",
  "participation": { "mode": "PAIR", "minActive": 2, "maxActive": 2 },
  "metrics": [
    { "key": "elapsed_ms", "label": { "default": "Time" }, "type": "DURATION_MS", "direction": "LOWER_BETTER", "source": "SYSTEM" },
    { "key": "course_touches", "label": { "default": "Boundary Touches" }, "type": "COUNT", "direction": "LOWER_BETTER", "source": "MARSHAL" }
  ],
  "timing": { "mode": "STOPWATCH", "startTrigger": "MARSHAL", "authority": "SERVER" },
  "verification": { "type": "MARSHAL" },
  "scoring": {
    "outputKey": "adjusted_time_ms",
    "outputLabel": "Adjusted Time",
    "expression": {
      "type": "add",
      "values": [
        { "type": "metric", "key": "elapsed_ms" },
        {
          "type": "multiply",
          "values": [
            { "type": "metric", "key": "course_touches" },
            { "type": "constant", "value": 5000 }
          ]
        }
      ]
    }
  }
}
```

---

## 9. Tug of war — single-elimination tournament

Activity definition handles instructions/safety/result meaning. Competition plugin handles bracket.

```json
{
  "activity": {
    "key": "tug_of_war",
    "participation": { "mode": "TEAM_VS_TEAM" },
    "content": [
      { "id": "winner", "type": "marshal_decision", "required": true }
    ],
    "verification": { "type": "MARSHAL" },
    "completion": { "type": "VERIFIED" }
  },
  "competition": {
    "formatType": "single_elimination",
    "config": {
      "seeding": "RANDOM",
      "allowByes": true,
      "formatExtension": "third-place match can be added later as a competition plugin"
    }
  }
}
```

No tug-of-war-specific bracket code.

---

## 10. “Bring Me” — first valid submission wins

```json
{
  "key": "bring_me",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "prompt", "type": "rich_text", "required": true },
    { "id": "proof", "type": "photo_submission", "required": false },
    { "id": "marshal", "type": "marshal_decision", "required": true }
  ],
  "metrics": [
    { "key": "accepted_at_order", "label": { "default": "Completion Order" }, "type": "PLACEMENT", "direction": "LOWER_BETTER", "source": "SYSTEM" }
  ],
  "verification": { "type": "MARSHAL" },
  "scoring": {
    "outputKey": "points",
    "outputLabel": "Points",
    "expression": { "type": "placement_lookup", "table": [] }
  }
}
```

---

## 11. Larong Pinoy physical station — pass/fail + optional time

```json
{
  "key": "physical_station_custom",
  "title": { "default": "Organizer-named Game" },
  "participation": { "mode": "SELECTED_REPRESENTATIVES", "minActive": 2, "maxActive": 8 },
  "content": [
    { "id": "rules", "type": "rich_text" },
    { "id": "result", "type": "marshal_decision", "required": true }
  ],
  "metrics": [
    { "key": "passed", "label": { "default": "Completed" }, "type": "BOOLEAN", "source": "MARSHAL" },
    { "key": "elapsed_ms", "label": { "default": "Time" }, "type": "DURATION_MS", "direction": "LOWER_BETTER", "source": "MARSHAL" }
  ],
  "verification": { "type": "MARSHAL" },
  "completion": { "type": "VERIFIED" }
}
```

The app does not need to know whether this becomes patintero, tumbang preso, obstacle relay, or a newly invented physical game.

---

## 12. Randomized policy/service-values challenge

```json
{
  "key": "values_scenario_quiz",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    {
      "id": "question_draw",
      "type": "random_draw",
      "source": {
        "kind": "QUESTION_BANK",
        "bankId": "bank_values",
        "count": 5,
        "filters": { "tagsAny": ["service", "teamwork"] },
        "scope": "TEAM"
      }
    }
  ],
  "verification": { "type": "AUTO" },
  "completion": { "type": "ALL_REQUIRED_BLOCKS" }
}
```

Actual selected immutable question versions are stored in the randomization/generated-content snapshot.

---

## 13. Photo recreation — evidence + judges

```json
{
  "key": "photo_recreation",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "reference", "type": "image" },
    { "id": "submission", "type": "photo_submission", "required": true },
    { "id": "rubric", "type": "judge_rubric", "required": true }
  ],
  "verification": { "type": "JUDGE", "judgesRequired": 2 },
  "completion": { "type": "VERIFIED" }
}
```

---

## 14. Bonus mystery station — conditionally unlocked

```json
{
  "key": "mystery_bonus",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "challenge", "type": "secret_code", "required": true }
  ],
  "verification": { "type": "AUTO" },
  "scoring": {
    "outputKey": "bonus",
    "outputLabel": "Bonus",
    "expression": { "type": "constant", "value": 30 },
    "countsTowardEvent": true
  },
  "rules": [],
  "completion": { "type": "ALL_REQUIRED_BLOCKS" }
}
```

A separate event/activity rule controls whether it becomes eligible, e.g. after 4 core stations or before a configured cutoff.

---

## 15. Reflection / debrief — non-scored

```json
{
  "key": "team_reflection",
  "participation": { "mode": "WHOLE_TEAM" },
  "content": [
    { "id": "learning", "type": "textarea", "required": true, "title": { "default": "What helped your team work effectively?" } },
    { "id": "rating", "type": "rating", "required": false, "title": { "default": "Rate the activity." } }
  ],
  "verification": { "type": "SELF_DECLARE" },
  "completion": { "type": "ALL_REQUIRED_BLOCKS" }
}
```

No score required. The activity engine is not restricted to competitive games.

---

## 16. Completely custom future activity

Suppose MPW invents a game next year:

> Teams carry objects through a course. Score = objects delivered × quality multiplier − safety penalties. One marshal records object count, three judges rate quality, and an organizer may apply penalties.

No new activity type is necessary:

- participation: whole team;
- metric `objects_delivered`;
- judge rubric `quality`;
- penalty score ledger;
- scoring AST = count × judge aggregate;
- marshal verification;
- standard audit.

A new plugin is needed only if the **interaction itself** cannot be represented by existing generic blocks—not merely because the game has a new name.
