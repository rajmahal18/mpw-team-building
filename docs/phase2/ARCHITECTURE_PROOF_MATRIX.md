# Architecture Proof Matrix

The purpose of this matrix is to test whether the architecture is actually generic.

| Scenario | Definition primitives | Runtime primitives | Special-case table/code? |
|---|---|---|---|
| Amazing Race checkpoint | station, route step, QR token, content blocks, marshal verification | station visit, activity run, submission, metric | **No** |
| Mixed quiz | arbitrary blocks/question versions, answer validators, timer | submissions, grading metrics, score entries | **No** |
| 3-choice MCQ | single-select `choices[]` length 3 | submission | **No** |
| 7-choice multi-select | multi-select `choices[]` length 7 | submission | **No** |
| Fill in blank | text matcher aliases/normalization | submission + grade | **No** |
| Sack race | duration metric, marshal verification, placement rule | metric observation, placement, score | **No** |
| Water transfer | volume + violation metrics, scoring AST | metric observations, score | **No** |
| Team chant | judge rubric config | judge submissions, aggregate score | **No** |
| Tower building | distance + boolean + rubric | metrics + judge submissions | **No** |
| Blindfold course | stopwatch + violations | metrics + derived adjusted time | **No** |
| Tug of war | team-vs-team participation + single-elim plugin | match/match sides | **No** |
| Scavenger hunt | free route + media blocks | station visits/submissions | **No** |
| Bonus activity | eligibility condition + score constant | rule execution + score entry | **No** |
| Reflection | textarea/rating, no scoring | submissions | **No** |
| New unknown physical activity | custom metrics + standard verification + generic scoring | runs/metrics/scores | **No**, unless a genuinely new interaction primitive is needed |

## Proof questions

### Can team counts vary from event to event?

Yes. Teams are rows. No schema column or engine loop assumes a count.

### Can team sizes vary?

Yes. Membership rows and participation policies specify optional min/max only where the organizer wants constraints.

### Can a quiz have 2, 3, 7, or 20 choices?

Yes. Choice lists are arrays validated by question type semantics. No A/B/C/D fields.

### Can one quiz mix formats?

Yes. Each block/question has its own discriminated type.

### Can the organizer create content after the app ships?

Yes. Content is data stored in versioned definitions/question versions.

### Can scoring vary per activity?

Yes. Metrics are independent from scoring expressions/placement rules.

### Can one event combine physical, digital, judged, and tournament activities?

Yes. Event aggregation consumes standardized score/result outputs.

### Can an activity have no score?

Yes. Scoring is optional.

### Can an activity require one or three judges?

Yes. Verification/rubric policies carry counts/configuration.

### Can a station host multiple activities?

Yes. `StationActivityAssignment` is many-to-many.

### Can one activity exist without a station?

Yes. `ActivityInstance` does not require a station.

### Can routes differ per team?

Yes. `RoutePlan` + assignment/snapshot support generated or manual team-specific routes.

### Can we correct a result without deleting history?

Yes. metric supersession + score ledger + audit.

### Can rules branch based on score, time, completion, or station state?

Yes. Typed condition AST + action registry.

### Does a new named game require code?

No, if its interaction is composable from existing primitives. Names are content.

## Failure conditions

Architecture should be considered violated if implementation introduces any of the following:

- activity-name conditionals;
- event-year conditionals;
- dedicated DB tables for ordinary named games;
- four-choice-only question model;
- fixed placement fields;
- score overwrite without history;
- participant answer keys in public payload;
- route logic encoded in page components;
- permissions checked only in UI;
- live edits mutating the definition used by completed runs.
