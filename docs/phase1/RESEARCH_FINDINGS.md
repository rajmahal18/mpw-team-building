# Research Findings — Existing Platforms and Team-Building Patterns

Research date: 2026-09-23

## Executive synthesis

Existing mature scavenger-hunt/Amazing-Race platforms converge on a common architecture: **missions/elements/stages + configurable content + points + progression + media + live administration**. The strongest products avoid hardcoding each experience as a separate feature.

This validates building MPW Team Building as a generic engine rather than an event-specific website.

## 1. Actionbound — strongest reference for conditional game composition

Actionbound exposes a creator with elements such as quizzes, missions, QR codes, GPS locations, stages, rewards, points, countdowns, progress, surveys, and offline-capable play. It supports indoor/outdoor, individual/group modes, and random/selectable/fixed stage sequences.

Important product lessons:

- Stages can run **fixed, freely selectable, or random**.
- Selectable stages can be entered from a list or by scanning a stage-specific QR code.
- Elements within stages can be randomized.
- “Switches” implement conditional visibility/branching based on prior elements, answers, points, completion, time taken, elapsed time, date/time, and other conditions.
- Quiz modes include solution input, multiple choice, numeric estimation, sorting, and cloze/fill-in-the-blank.
- Quizzes can configure attempts, hints, time limits, points, and deductions.
- Missions can accept text, picture, video, audio, or no digital answer for purely physical tasks.

Product implication: MPW should treat **conditions/actions and stage ordering as first-class primitives**, not later add-ons.

Sources:
- https://en.actionbound.com/
- https://en.actionbound.com/help/article/quiz-element
- https://en.actionbound.com/help/article/mission
- https://en.actionbound.com/help/article/sequence-of-stages
- https://en.actionbound.com/help/article/switches
- https://en.actionbound.com/help/article/conditions-depending-on-other-elements
- https://en.actionbound.com/help/article/conditions-depending-on-times

## 2. Goosechase — strong reference for mission library, guest participation, live ops

Goosechase frames missions as flexible building blocks and supports camera/photo/video, text, and GPS missions. It also provides team/participant management, live leaderboards, score adjustments, broadcasts, scheduled releases, custom branding, activity feeds, reports, and mission libraries.

Important product lessons:

- Participation can be individual or team-based.
- Teams can be pre-created or participant-created.
- Maximum team size is configurable.
- Missions can unlock based on points.
- Real-time live operation matters: organizers adjust scores, award bonus points, communicate, and review submissions during the event.
- Post-event reporting and downloadable submissions extend the value after the game.
- Guest participation reduces friction.

Sources:
- https://goosechase.com/features
- https://goosechase.com/how-it-works/create-experience
- https://support.goosechase.com/en/articles/15890732-unlock-missions-based-on-points-feature
- https://blog.goosechase.com/goosechase-demo/

## 3. Scavify — strong reference for mobile challenge variety and live engagement

Scavify combines photo, video, QR, Q&A, multiple choice, GPS, real-time leaderboards, progress tracking, photo streams, push messages, and scheduled automation.

Product implication: submissions are not just “answers.” They include evidence/media/check-ins and may need review/moderation.

Sources:
- https://www.scavify.com/
- https://www.scavify.com/virtual-scavenger-hunt
- https://www.scavify.com/qr-code-scavenger-hunt-app

## 4. Eventzee — strong reference for challenge-type extensibility and branding

Eventzee offers photo, video, quiz, GPS, QR, text, information, route/explore/grouped challenges, social feeds, chat, leaderboards, custom branding, and mobile admin approval.

Product implication: activity types should be composable, branding should be per event, and approval workflow should be available on mobile.

Sources:
- https://eventzeeapp.com/
- https://eventzeeapp.com/custom-events/

## 5. Team-building operations research

Team-building formats consistently fall into several families:

- icebreakers / relationship-building;
- communication exercises;
- problem solving / logic;
- physical field-day games;
- scavenger hunt / Amazing Race;
- creative/performance challenges;
- trust/collaboration exercises;
- sports/tournament formats;
- office/culture trivia;
- large-group rotating stations.

For large groups, parallel play and station rotation reduce waiting. Non-athletic roles (judge, navigator, photographer, scorekeeper, strategist) increase participation. Outdoor events need weather and heat contingencies.

Sources:
- https://teambuilding.com/blog/team-building-activities
- https://teambuilding.com/blog/outdoor-team-building
- https://teambuilding.com/blog/teamwork-games
- https://teambuilding.com/blog/problem-solving-games

## 6. Philippine/Filipino activity patterns

Philippine corporate team-building often uses Larong Pinoy / field-day mechanics such as:

- tug of war / hilahang lubid;
- sack race;
- patintero;
- piko relay;
- kadang-kadang / coconut-shell or stilt races;
- sipa;
- tumbang preso;
- luksong tinik / luksong baka;
- jumping-rope relays;
- Pinoy Henyo-style guessing;
- cup stacking;
- mixed obstacle relays.

Common operational patterns are team colors, captains, 10–25+ members, rotating games, timed events, referees/marshals, score tabulation, demerits/penalties, and an overall champion from accumulated points.

Sources:
- https://holifit.ph/sports-fest/palarong-pinoy-games-list/
- https://teambayanihan.com/team-building-activities/filipino-games/
- https://teambayanihan.com/larong-pinoy-for-team-building/

## 7. Government employee development context

The Philippine Civil Service Commission frames learning and development around competency development, leadership capacity, HR/OD, professional development, and collaborative learning. The app should therefore be able to support not only “fun games” but also learning-oriented quizzes, reflection, surveys, and debrief outputs.

Sources:
- https://csc.gov.ph/office-functions/csi
- https://www.csc.gov.ph/regional-offices/caraga/trainings/csc-caraga-2nd-semester-2026-training-programs

## 8. Philippine privacy context

RA 10173 applies to personal information processing in government and private sectors. Key principles include transparency, legitimate purpose, proportionality/data minimization, appropriate retention, and security. NPC Circular 16-01 specifically addresses government agencies and includes Privacy Impact Assessments, control frameworks, access management, and protection of agency personal data.

Product implications:

- privacy notice at appropriate collection points;
- collect only what is needed for the event;
- configurable media/profile visibility;
- retention settings;
- RBAC and server-side authorization;
- audit logs;
- plan a PIA before real employee data deployment.

Sources:
- https://privacy.gov.ph/data-privacy-act/
- https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/
- https://privacy.gov.ph/npc-circular-16-01-security-of-personal-data-in-government-agencies/
- https://privacy.gov.ph/projects/

## 9. Safety and accessibility research

Philippine labor guidance on heat stress emphasizes rest breaks, drinking water, ventilation/shade, work-location/time adjustments, and emergency procedures. Accessibility guidance recommends designing multiple meaningful participation modes and planning accommodations rather than assuming every participant can perform the same physical activity.

Product implications:

- activity safety metadata;
- indoor fallback activity field;
- alternative participation role/activity;
- accessibility notes;
- hydration/rest reminders and schedule blocks;
- emergency contacts / incident notes as optional operations features;
- avoid requiring medical diagnosis disclosure in the normal game flow.

Sources:
- https://dole.gov.ph/news/dole-reminds-employers-of-safety-measures-for-heat-stress/
- https://ncda.gov.ph/persons-with-disabilities-in-the-workplace-dole-labor-advisory-no-15-s-2023/
- https://www.ilo.org/publications/promoting-diversity-and-inclusion-through-workplace-adjustments-practical

## 10. Web/PWA feasibility

A mobile-first web app is viable for the core event experience. Modern PWAs can be installable and can use service workers/cache for offline-capable shells. However, browser support varies for specific APIs such as BarcodeDetector and Web Share, so the product should not rely on a single experimental API.

Recommended QR strategy: printed QR opens a normal HTTPS route. The phone's ordinary camera app can scan it. In-app scanning may exist as progressive enhancement with a library/fallback rather than relying only on BarcodeDetector.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API

## Product conclusion from research

The strongest architecture is:

1. **Event builder** for identity, teams, roles, schedule, rules, branding.
2. **Activity library** for fast reusable starting points.
3. **Activity engine** built from generic blocks, metrics, rules, conditions, and actions.
4. **Question/content engine** where organizers author arbitrary content.
5. **Flow engine** for stages, routes, unlocks, branching, schedules, and randomization.
6. **Competition/scoring engine** for points/time/placement/judging/brackets/round-robin/hybrids.
7. **Operations layer** for QR check-in, marshals, approvals, queues/capacity, overrides, and announcements.
8. **Participant mobile web experience** with minimal friction.
9. **Archive/reporting layer** for final results, submissions, statistics, and audit.
10. **Privacy/safety/accessibility controls** appropriate to government deployment.

