# Phase 4 Architecture Notes

## Template lifecycle

```text
Organization
  -> ActivityTemplate
      -> immutable ActivityTemplateVersion(s)

ActivityTemplateVersion
  --materialize--> Event ActivityInstance
                     -> immutable ActivityDefinitionVersion(s)
```

Materialization copies and re-validates the definition while replacing event-local identity (`key` and `title`). There is no live inheritance from template to event activity.

## Why this matters

A template can improve in 2027 without changing the 2026 event. An organizer may also modify an event copy heavily, publish it, run it, and later save that successful version as a new reusable template.

## Team and roster semantics

Do not introduce fixed `numberOfTeams` or `playersPerTeam` columns. Those values are views over Team and TeamMembership records. Validation rules, if an event needs them, belong in event configuration or preflight policy rather than database shape.

## Builder boundaries

Phase 4 edits event-level configuration and selects reusable activities. Phase 5 owns the visual editor for the internals of an ActivityDefinition. The raw JSON editor remains temporarily available to power users so the engine stays testable.
