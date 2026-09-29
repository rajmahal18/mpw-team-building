# Event Operations Model

The app must run a real event, not just display activities.

## 1. Event lifecycle

Suggested states:

- Draft
- Configuration
- Registration/Open Join
- Ready
- Locked
- Live
- Paused
- Results Review
- Finalized
- Archived
- Cancelled

State transitions should be permissioned and audited.

## 2. Publishing and locking

Before going live, organizer can run validation:

- unresolved activities;
- missing answer keys;
- missing route assignments;
- invalid scoring;
- missing marshals;
- duplicate team codes;
- impossible participant counts;
- activities with no completion rule;
- missing required media/assets;
- unsafe conflicting schedule warnings where detectable.

A “Lock Event” action can snapshot key rules/content for fairness. Later edits may require explicit unlock/version change and create an audit entry.

## 3. Teams

Operations should support:

- create/edit/delete before lock;
- bulk import;
- random assignment;
- manual assignment;
- captain selection;
- team branding;
- late substitutions;
- absent members;
- merge/split only with elevated permission;
- team status: ready/active/finished/withdrawn/disqualified.

## 4. Marshals, judges, referees

Staff can be assigned by:

- event;
- station;
- activity;
- match/heat;
- time block.

A marshal mobile view should prioritize:

- current station/activity;
- team queue;
- scan/open team;
- start timer;
- approve/reject;
- enter result;
- add penalty/bonus with reason;
- report incident/problem;
- pause station;
- call organizer.

## 5. Stations

Station data:

- name/label;
- code/QR;
- location description;
- map coordinates optional;
- photos/signage;
- assigned activity/activities;
- expected duration;
- team capacity;
- active queue;
- marshals;
- equipment list;
- opening window;
- live status;
- fallback activity/station;
- safety/accessibility notes.

## 6. Routes

Supported route strategies:

- same fixed route for all;
- rotated starting positions;
- circular station rotation;
- organizer-defined route per team;
- automatically balanced routes;
- random route;
- free choice;
- QR-discovered stations;
- conditional branching;
- capacity-aware reassignment later.

For station-heavy events, route generation should seek to reduce first-station congestion.

## 7. Queue/capacity

Optional station queue engine:

- max simultaneous teams;
- waiting queue;
- estimated wait;
- next team;
- priority override;
- team called/arrived/no-show;
- auto-route to alternate available station where configured.

## 8. Scheduling

Support:

- event master timeline;
- station operating windows;
- activity time blocks;
- team call times;
- staggered starts;
- breaks;
- lunch/prayer/rest blocks;
- award ceremony;
- manual delay;
- global pause/resume;
- schedule shift later.

## 9. Equipment and logistics

Activity templates can define materials; event instances can define actual inventory.

Possible fields:

- item;
- required quantity;
- available quantity;
- station assignment;
- owner/custodian;
- setup state;
- replacement/spare quantity;
- notes.

Useful views:

- per-station checklist;
- total procurement/prep list;
- missing equipment warnings.

## 10. Broadcasts

Organizer may send:

- all-event announcement;
- team-specific message;
- station/marshal message;
- schedule delay;
- emergency notice;
- leaderboard freeze notice;
- final assembly instruction.

## 11. Incident and exception handling

The event must tolerate reality:

- team late;
- station unavailable;
- equipment breaks;
- QR damaged;
- phone battery dead;
- network poor;
- player injured/unable to continue;
- score dispute;
- duplicate submission;
- wrong team checks in;
- activity cancelled;
- rain forces indoor fallback.

Each exception should have explicit organizer tools rather than requiring database edits.

## 12. Event control center

Suggested live dashboard:

- event state;
- active teams / finished teams;
- station load;
- queues;
- pending approvals;
- flagged submissions;
- recent score changes;
- incidents;
- announcements;
- leaderboard status;
- quick global pause;
- quick station disable;
- event health indicators.

