# UI/UX coherence patch — Part 2

This pass corrects the visual-system problems found after the first organizer UX patch. It intentionally does not change the generic event-engine architecture.

## Design rules applied

- One organizer grid, spacing rhythm, control height, radius, and color language.
- Flat operational surfaces instead of gradients, floating cards, or decorative shadows.
- One disclosure cue on the right side of expandable rows. No duplicated plus icons.
- Left-aligned labels and content. No detached centered accordion titles.
- Primary actions are obvious; secondary and destructive actions are visually quieter.
- Metrics render as a compact information strip instead of dashboard-filler cards.
- Advanced settings are quiet disclosure rows rather than oversized cards.
- Forms use consistent two-column desktop / one-column mobile layouts.
- Developer-oriented identifiers are removed from normal organizer surfaces where they are not required to operate the event.

## Organizer changes

- Rebuilt event settings hierarchy and disclosure layout.
- Simplified branding to user-facing color behavior; raw asset/token fields are retained internally instead of exposed as form controls.
- Converted team/participant add flows into consistent compact disclosure actions.
- Removed raw team color-token/logo-asset controls from normal roster editing while preserving their stored values.
- Removed external source keys from the normal participant surface.
- Hid station marshal role keys behind the organizer-friendly marshal assignment action.
- Removed activity machine keys from normal activity pages and auto-generates library template keys server-side.
- Renamed the visual builder to Activity editor and removed raw machine-key / generated-JSON helpers from the normal editor surface.
- Raw media asset identifiers are no longer exposed in activity blocks; existing media references are preserved and described with user-facing status text.

## Validation

- Changed TS/TSX files pass TypeScript parser/transpile diagnostics using TypeScript 5.8.3.
- `npm ci` could not complete in the sandbox before timeout, so the dependency-aware project typecheck/build was not claimed as complete.
- The working copy was cleaned of the partial `node_modules` install before packaging.
