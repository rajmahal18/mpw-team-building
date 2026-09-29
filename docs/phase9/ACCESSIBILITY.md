# Accessibility Baseline

Phase 9 is a functional accessibility pass, not a formal WCAG conformance claim.

## Implemented baseline

- semantic headings and labels in organizer/participant forms;
- visible keyboard focus indicator;
- skip-to-content link;
- reduced-motion media query;
- disabled controls visibly communicate state;
- mobile layouts avoid relying on horizontal scrolling for primary actions;
- participant status and sync state use visible text, not color alone;
- projector/leaderboard views preserve readable text hierarchy.

## Manual audit before production

Test at minimum:

- keyboard-only organizer flow;
- keyboard-only participant flow;
- screen reader announcement of status/submission results;
- 200% browser zoom;
- 320px viewport;
- high-contrast / forced-colors environment;
- touch target size;
- focus order inside modals/details/forms;
- reduced motion;
- image/media alternative text where organizer content requires it.

Do not claim formal WCAG compliance until the agency performs the required audit.
