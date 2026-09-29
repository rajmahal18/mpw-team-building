# Government, Privacy, Safety, and Accessibility Baseline

This is product/architecture guidance, not a substitute for MPW legal/privacy/HR review.

## 1. Philippine privacy baseline

RA 10173 / Data Privacy Act applies to personal information processing. Core principles relevant to this platform include:

- transparency;
- legitimate/specified purpose;
- proportionality/data minimization;
- accuracy where required;
- retention only as necessary;
- appropriate organizational, physical, and technical safeguards.

NPC rules for government agencies emphasize Privacy Impact Assessment (PIA), access controls, control frameworks, and security of agency personal data.

Sources:
- https://privacy.gov.ph/data-privacy-act/
- https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/
- https://privacy.gov.ph/npc-circular-16-01-security-of-personal-data-in-government-agencies/
- https://privacy.gov.ph/projects/

## 2. Data minimization for a team-building app

Default participant record should need very little:

- display name;
- team;
- event role/status;
- optionally employee identifier only if operationally justified.

Avoid collecting sensitive personal information merely because it is available elsewhere.

Health/accommodation needs should not become public team metadata. If operationally required, use a separate restricted workflow designed with HR/privacy stakeholders.

## 3. Media/privacy

Because team-building apps may collect photos/videos:

Configurable policies should include:

- media upload enabled/disabled;
- event-only vs public gallery;
- moderation before display;
- download permission;
- retention period;
- participant privacy notice;
- deletion/export handling where policy requires.

## 4. RBAC

Server-side permissions are mandatory.

Examples:

- participants cannot see hidden answer keys;
- marshals see only assigned stations unless authorized otherwise;
- judges can score assigned activities;
- score overrides require elevated permission;
- audit/report export is restricted;
- private participant data is not exposed to public scoreboard routes.

## 5. Audit log

Log security/competition-relevant actions:

- login/admin changes where appropriate;
- publish/lock/unlock event;
- team roster changes after lock;
- result creation/edit/delete;
- score adjustments;
- approval/rejection;
- penalties/bonuses;
- disqualification;
- QR revocation/regeneration;
- permission/role changes;
- data export.

## 6. Retention

Make retention policy explicit by category:

- event configuration;
- participant roster;
- submissions;
- photos/videos;
- audit logs;
- exports.

Avoid a single forever-retention assumption.

## 7. Safety metadata

Each physical activity can record:

- physical intensity;
- mobility/balance requirement;
- contact/non-contact;
- indoor/outdoor;
- water exposure;
- equipment risk;
- surface requirements;
- recommended space;
- weather sensitivity;
- heat sensitivity;
- marshal requirement;
- first-aid/safety notes;
- prohibited/adapted variants;
- alternative low-impact role/activity.

## 8. Outdoor/heat planning

Philippine DOLE guidance on heat stress includes adequate water, ventilation/shade, rest breaks, work-time/location adjustments, and emergency procedures.

Product support can include:

- event hydration/rest blocks;
- heat/weather contingency notes;
- organizer safety checklist;
- station pause/closure;
- indoor fallback mapping;
- emergency broadcast;
- incident logging;
- emergency contact display.

Source:
- https://dole.gov.ph/news/dole-reminds-employers-of-safety-measures-for-heat-stress/

## 9. Accessibility and inclusive participation

The system should make it easy to design an equivalent participation path rather than assume all employees can run, jump, hear audio, see small text, or perform publicly.

Activity metadata/config can support:

- alternative seated/low-impact variant;
- non-athletic team roles;
- accessible station notes;
- text alternative to audio;
- captions/transcripts for video where feasible;
- sufficient contrast;
- scalable text;
- large touch targets;
- keyboard/accessibility semantics on admin/public pages;
- skip/alternative activity without public disclosure of medical details;
- private accommodation coordination outside public participant view.

Sources:
- https://ncda.gov.ph/persons-with-disabilities-in-the-workplace-dole-labor-advisory-no-15-s-2023/
- https://www.ilo.org/publications/promoting-diversity-and-inclusion-through-workplace-adjustments-practical

## 10. Government deployment checklist before real use

Before production with actual MPW employee data:

- identify official system owner;
- identify authorized admins;
- define data fields and purpose;
- perform/coordinate PIA as appropriate;
- approve privacy notice;
- define retention;
- define backup/recovery;
- define account/access revocation;
- confirm hosting/data-security requirements;
- test participant and public-data exposure;
- test audit/reporting;
- prepare offline/manual fallback on event day.

