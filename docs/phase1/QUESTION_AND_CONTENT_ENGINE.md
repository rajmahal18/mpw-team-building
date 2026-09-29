# Question and Content Engine

## Principle

Organizers own the content. The platform owns the structure, validation, security, and scoring primitives.

A “Quiz” is not a fixed four-choice component. It is an activity composed of organizer-authored questions with independent types and configuration.

## Question types

### Objective / auto-gradable

- single-choice multiple choice;
- multi-select multiple choice;
- true/false;
- fill-in-the-blank;
- short-answer exact/normalized match;
- numeric exact;
- numeric estimate with tolerance;
- ordering;
- matching pairs;
- categorization/grouping;
- sequence completion;
- image-choice;
- image identification with text answer;
- audio prompt + objective answer;
- video prompt + objective answer;
- date/time answer;
- code/password answer.

### Manual/judged

- long answer;
- explanation;
- creative response;
- photo evidence;
- video evidence;
- audio evidence;
- drawing/image upload;
- performance rubric;
- presentation/pitch score;
- marshal pass/fail.

### Survey/non-scored

- poll;
- rating scale;
- Likert scale;
- free response;
- ranking/preferences;
- reflection/debrief;
- feedback form.

## Multiple-choice flexibility

Never assume four choices.

Per question:

- minimum supported choices should be validation-driven, not UI-hardcoded;
- organizer can add/remove/reorder choices;
- one or many answers may be correct;
- choice text may include images/media;
- choice order can be fixed or shuffled;
- answer choices may have individual feedback;
- partial credit can be enabled;
- wrong selections can subtract points if desired;
- maximum allowed selections can be configured.

## Fill-in-the-blank / text answer flexibility

Organizer can configure:

- primary correct answer;
- accepted aliases;
- case sensitivity;
- trim whitespace;
- collapse repeated spaces;
- ignore punctuation;
- accent/Unicode normalization where safe;
- exact vs contains vs regex (advanced);
- typo/fuzzy tolerance only when intentionally enabled;
- one blank or multiple blanks;
- blank-specific answers;
- partial credit;
- manual-review fallback.

## Numeric flexibility

- exact answer;
- accepted range;
- absolute tolerance;
- percentage tolerance;
- unit label;
- optional unit conversion later;
- higher/lower is better for estimation challenges;
- closest answer wins mode.

## Question bank

Question banks should support:

- name;
- category;
- tags;
- difficulty;
- points default;
- owner/scope;
- event-specific or reusable library;
- active/inactive;
- versioning;
- import/export;
- media attachments;
- explanation/reference notes.

## Random selection

A quiz/activity can request:

- all questions;
- random N from bank;
- random N per category;
- weighted by difficulty;
- fixed seed per event/team/attempt;
- no-repeat across rounds;
- same questions for all teams but shuffled;
- different sampled questions per team;
- organizer-selected fixed subset.

## Attempts and reveal policy

Per question or quiz:

- attempts allowed;
- point deduction per attempt;
- hint availability/cost;
- answer reveal immediately / after final attempt / after activity / after event / never;
- explanation reveal policy;
- review previous answers on/off;
- backtracking on/off;
- skip allowed/on-off.

## Timers

- no timer;
- per question;
- whole quiz;
- timer starts on reveal;
- timer starts on explicit Start;
- auto-submit on expiry;
- grace period;
- speed bonus/decay.

## Scoring

Support:

- fixed correct points;
- partial score;
- negative score;
- speed bonus;
- first-correct bonus;
- attempt penalty;
- hint penalty;
- difficulty multiplier;
- question weights;
- section weights;
- pass threshold;
- placement from total score/time.

## Security/fairness

- answer keys are server-side protected;
- participant payloads must not include hidden correct answers;
- publish/lock can snapshot question versions;
- random draws are stored/auditable;
- server is authoritative for scoring;
- organizers with answer-key permission can view keys; ordinary participants cannot;
- if the developer participates, not-yet-generated random content and server-side hidden banks reduce accidental foreknowledge, though privileged server/database access can never be cryptographically hidden from a system administrator with full access.

## Import/export possibilities

Future-proof for:

- CSV/Excel question import;
- JSON template import/export;
- copy questions between events;
- duplicate question;
- batch edit points/tags;
- image/media bulk upload;
- AI-assisted drafting later, always editable by organizer.

