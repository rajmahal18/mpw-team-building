# Phase 5 Handoff — Activity + Question/Content Builder

Phase 5 should replace the raw ActivityDefinition JSON workflow with a visual builder that writes the exact same typed contracts.

Minimum builder requirements:

- add/remove/reorder blocks;
- organizer-authored rich instructions;
- question type selection per block;
- arbitrary-length multiple-choice arrays (never fixed A/B/C/D fields);
- single-select and multi-select answer keys;
- fill-in/short-text accepted answers and normalization options;
- numeric exact/range/tolerance settings;
- judge rubric criteria with arbitrary criteria count/weights/scales;
- participation, attempts, timing, verification and completion policies;
- metric definitions;
- safe visual scoring-expression builder;
- rule WHEN/IF/THEN editor without organizer JavaScript;
- activity preflight and participant-safe preview;
- immutable save-as-new-version and publish flow.

Do not redesign the persistence model merely to simplify forms. The builder is a projection/editor for Phase 2/3 contracts.
