# Configuration Universe — What Must Be Flexible

This document is intentionally broad. The goal is to prevent future assumptions from silently becoming hardcoded constraints.

## A. Event identity and presentation

Configurable:

- event name;
- short name;
- description;
- year/edition;
- organization/unit;
- organizer display name;
- venue and venue notes;
- event start/end date and time;
- timezone;
- event logo;
- cover/hero image;
- sponsor/partner logos;
- primary/secondary/accent colors;
- background/surface/text colors or derived theme;
- light/dark/system mode options;
- custom terminology;
- event iconography;
- public/private visibility;
- participant landing-page message;
- rules/waiver/privacy notice references;
- result/archive visibility;
- branding on generated QR/scoreboards/reports.

## B. Teams and participants

Configurable:

- number of teams;
- team minimum/maximum capacity;
- team names;
- team abbreviations;
- team logo/photo;
- team color(s);
- team captain/co-captains;
- member roster;
- substitute/reserve status;
- department/division metadata;
- guest/employee participant type;
- individual vs team event participation;
- manual/random/balanced team assignment;
- self-join vs organizer-assigned;
- join code/QR;
- whether accounts are required;
- one-device-per-team vs individual devices;
- display names/nicknames;
- jersey/shirt number if applicable;
- custom participant fields;
- player eligibility rules;
- late registration;
- team lock/finalization time.

## C. Roles and permissions

Possible roles are templates, not fixed labels:

- super admin;
- event owner;
- event admin;
- scorekeeper;
- marshal/facilitator;
- referee/judge;
- station manager;
- team captain;
- participant;
- media/documentation;
- spectator/public viewer;
- auditor/read-only reviewer.

Permissions should be capability-based and configurable per event/role where safe:

- edit event;
- edit teams;
- edit activities;
- publish/lock;
- view answer keys;
- approve submissions;
- enter results;
- override results;
- apply penalty/bonus;
- manage QR/checkpoints;
- broadcast messages;
- view private media;
- export reports;
- view audit logs.

## D. Event structure

Configurable:

- event phases;
- opening/briefing periods;
- activity blocks;
- station rotations;
- simultaneous vs sequential activities;
- breaks/meals/prayer/rest periods;
- award ceremony;
- start/end windows;
- activity availability windows;
- pause/resume;
- rain/indoor fallback mode;
- contingency schedule;
- team-specific schedules;
- staggered starts.

## E. Activity identity

Configurable per activity:

- name;
- short name;
- category/tags;
- description;
- objectives;
- instructions;
- organizer-only notes;
- marshal instructions;
- participant instructions;
- images/video/reference files;
- venue/station association;
- equipment/materials;
- estimated duration;
- setup/cleanup time;
- participant requirements;
- intensity;
- accessibility notes;
- safety notes;
- alternative participation roles;
- indoor/outdoor;
- wet/dry;
- reusable template status.

## F. Participation model

Configurable:

- individual;
- pair;
- fixed subgroup;
- whole team;
- team vs team;
- multiple teams per heat;
- selected representatives;
- rotating representatives;
- all members required;
- minimum/maximum active players;
- captain-only action;
- marshal-only result entry;
- spectator voting where enabled.

## G. Activity flow

Configurable:

- immediate/open;
- linear sequence;
- free choice;
- random order;
- organizer-assigned route;
- team-specific route;
- round-robin station rotation;
- prerequisite activity;
- score threshold unlock;
- time threshold unlock;
- QR unlock;
- marshal unlock;
- scheduled unlock;
- answer-dependent branch;
- random branch;
- capacity-aware route;
- optional/bonus activity;
- skip allowed/not allowed;
- retry path;
- redemption activity;
- sudden-death/tie-break activity.

## H. Input/submission types

Configurable activity blocks can request:

- no input / acknowledge;
- single-choice;
- multi-select;
- true/false;
- short text;
- long text;
- fill-in-the-blank;
- numeric input;
- estimate/range;
- date/time;
- ordering;
- matching;
- ranking;
- rating scale;
- poll/survey;
- checklist;
- image upload;
- video upload;
- audio upload;
- file upload;
- QR scan/open;
- secret code;
- manual stopwatch result;
- distance/count/quantity result;
- judge rating;
- marshal pass/fail;
- captain confirmation;
- custom result fields.

## I. Verification

Configurable:

- auto-validated answer;
- exact match;
- normalized text match;
- accepted-answer aliases;
- numeric tolerance;
- partial match/fuzzy threshold where safe;
- organizer review;
- marshal review;
- referee result;
- QR/checkpoint proof;
- photo/video evidence;
- opponent confirmation;
- dual-marshal confirmation;
- manual override;
- no verification / honor system.

## J. Timing

Configurable:

- no timer;
- whole-event elapsed timer;
- activity timer;
- question timer;
- round timer;
- heat timer;
- countdown before start;
- grace period;
- overtime;
- late penalty;
- pause allowed;
- pause authority;
- start on first view / first input / marshal signal;
- server-authoritative vs manual time;
- fastest-wins metric;
- time-cap;
- time bonus/decay.

## K. Attempts and hints

Configurable:

- unlimited/limited attempts;
- attempts per participant/team;
- attempt reset rules;
- penalty per failed attempt;
- lockout after failures;
- hint availability;
- hint cost in points/time;
- automatic hint after delay;
- answer reveal policy;
- explanation after submit/end.

## L. Scoring

Configurable:

- fixed points;
- pass/fail points;
- partial credit;
- per-correct-item points;
- negative points;
- speed-based points;
- time-to-points conversion;
- placement points;
- rank-based table of arbitrary length;
- judge score/rubric;
- multi-judge average/median/drop-high-low;
- quantity-based score;
- distance-based score;
- count-based score;
- target proximity score;
- best-of-N;
- sum/average/max/min of attempts;
- bonus;
- penalty/demerit;
- multiplier;
- score cap/floor;
- team aggregate;
- individual contribution;
- custom rule graph/formula builder.

## M. Competition structure

Configurable:

- no head-to-head competition;
- leaderboard only;
- heats;
- round robin;
- single elimination;
- double elimination;
- pools/groups;
- group-to-knockout;
- best-of-N series;
- king/queen of court style rotation;
- ladder;
- Swiss-like pairing later;
- random pairing;
- seeded pairing;
- manual bracket;
- bye policy;
- advancement rules;
- third-place match;
- consolation matches;
- tie-break stages.

## N. Stations/checkpoints

Configurable:

- station name/number;
- custom label;
- location text;
- map coordinate if used;
- QR code;
- station capacity;
- queue policy;
- assigned marshal(s);
- operating window;
- equipment;
- setup checklist;
- activity set;
- random activity selection;
- team-specific activity;
- station open/closed/paused;
- fallback station;
- expected duration;
- congestion warning threshold.

## O. QR behavior

Configurable:

- event join QR;
- team join QR;
- station QR;
- activity QR;
- one-time QR/token;
- reusable signed QR;
- regenerated/revoked QR;
- expiry;
- valid event window;
- valid team(s);
- precondition requirements;
- check-in only vs unlock activity;
- check-in + marshal verification;
- deep-link preservation through login.

## P. Leaderboard and result visibility

Configurable:

- leaderboard on/off;
- live/delayed/frozen;
- show all/top-N only;
- hide numeric score;
- show rank only;
- per-activity leaderboard;
- overall leaderboard;
- individual leaderboard;
- team leaderboard;
- public/private;
- tie display policy;
- provisional/final status;
- score breakdown visibility;
- live score animation optional.

## Q. Communications

Configurable:

- global announcements;
- team-specific messages;
- marshal-only notices;
- scheduled announcements;
- activity-unlock notice;
- change/cancellation notice;
- emergency notice;
- scoreboard display messages;
- participant inbox;
- notification delivery methods as available.

## R. Media and gallery

Configurable:

- allow/require photo/video/audio;
- capture vs gallery upload;
- max file size/duration;
- public feed on/off;
- approval before public display;
- reactions/voting on/off;
- watermark/event branding;
- download permission;
- retention period;
- export ZIP;
- submission ownership/visibility.

## S. Awards

Configurable:

- overall champion;
- runner-up placements;
- best team spirit;
- most creative;
- fastest activity;
- highest quiz score;
- best photo/video;
- sportsmanship;
- custom awards;
- calculated vs manually awarded;
- tied awards allowed;
- certificate/report output later.

## T. Reports and archive

Configurable/reportable:

- team standings;
- activity results;
- individual contributions where collected;
- station throughput;
- activity completion rates;
- penalties/bonuses;
- judge scoring;
- submissions/media;
- attendance;
- event timeline;
- audit history;
- CSV/PDF export later;
- archive public/private;
- data retention/deletion schedule.

