# Participant PWA and QR Experience

## Platform decision

Primary participant surface: **mobile-first responsive website with optional PWA installation**.

Rationale:

- event participants should not be forced to install an app for a one/few-day event;
- QR codes can open ordinary HTTPS links from the phone camera;
- modern PWAs can be installed and can cache app resources;
- special browser APIs vary, so critical event flow must have reliable fallbacks.

## Participant entry flows

### A. Event join QR

`Scan -> event landing -> join/login/identify team -> participant home`

### B. Station QR when already identified

`Scan -> validate token -> check prerequisites -> record arrival/unlock -> station activity`

### C. Station QR when not identified

`Scan -> preserve destination -> join/login/team code -> return to station link -> continue`

### D. Shared team device

An event can configure one phone per team. The session represents the team rather than requiring every member to sign in.

## QR design

Use signed server-verifiable tokens rather than meaningful sequential IDs alone.

Potential token claims:

- event id;
- checkpoint/activity id;
- issue/version;
- optional expiry;
- allowed scope;
- nonce/version for revocation.

Do not put answer keys or sensitive data in QR codes.

## QR modes

- permanent event join;
- permanent station QR;
- regeneratable station QR;
- one-time code;
- short-lived code;
- team-specific code;
- activity-specific unlock;
- check-in-only;
- check-in + start activity;
- check-in + marshal confirmation.

## Mobile participant home

Should prioritize:

- current status;
- current/next activity;
- station/route guidance;
- team identity/color;
- score/rank only when event allows;
- announcements;
- pending submission state;
- help/rules;
- clear “what do I do now?”

Avoid showing admin complexity.

## Connectivity resilience

Event venues may have poor mobile data/Wi-Fi.

Target behavior:

- cache app shell and published non-sensitive event content;
- keep local draft answers/submissions where feasible;
- mark unsynced actions clearly;
- queue safe idempotent writes;
- retry after reconnect;
- prevent double scoring from retries;
- never pretend an unconfirmed competitive result is server-final;
- allow marshal manual fallback.

## Idempotency

Critical mutations should accept idempotency keys:

- checkpoint check-in;
- activity submission;
- timer start/finish where appropriate;
- result entry;
- score adjustment.

## Camera/media

Use standard mobile file/camera inputs as reliable baseline. In-app QR scanner can be an enhancement, but normal phone-camera QR scanning remains sufficient for checkpoint links.

## PWA installation

Optional for organizers/frequent marshals/participants. Do not block event participation behind installation.

Potential installed benefits:

- home-screen icon;
- standalone display;
- cached shell;
- easier repeat access.

## Public scoreboard

Separate lightweight route for projector/TV:

- event branding;
- standings;
- current activity/phase;
- selected live updates;
- auto-refresh/realtime transport;
- full-screen-friendly layout;
- hide private data.

