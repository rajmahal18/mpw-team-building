# Phase 10 Visual System

The v1.0 UI uses one restrained system for organizer and participant surfaces rather than page-specific styling.

## Organizer

- neutral government-operations canvas;
- compact sticky global header;
- event workspace tabs with an explicit active state;
- consistent cards, tables, form controls, status badges and empty states;
- mobile layouts collapse to one clear column;
- destructive/risky workflows remain explicit instead of relying on color alone.

## Participant

Participant/public routes derive four optional CSS variables from `EventBrandingConfigSchema.themeTokens`:

- `accent`
- `background`
- `surface`
- `text`

Only simple CSS color values are accepted by the presentation adapter. Invalid values fall back to the production defaults. This preserves configurable branding without allowing arbitrary CSS injection.

## Projector

Projector mode uses the same leaderboard definition and standings source as the normal public leaderboard. The presentation changes; scoring does not.
