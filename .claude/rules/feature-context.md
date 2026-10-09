# Feature Context Record

Per-feature cross-team context hub. One feature = one living document at `docs/features/<slug>/context.md` (+ machine `snapshot.json`), so inbound spec, backend contract, and outbound evidence never drop between FE / planning-design / backend.

Source of truth: `skills_context/SHARED/feature-context.md`. Do not duplicate the workflow here.

## When this applies

- Starting a new feature with planning/design input → `/feature-intake <slug>`
- Checking whether Figma or backend contract drifted → `/feature-sync <slug>`
- After PR/doc → `/pr` and `/doc` auto-record into the Record's Outbound section

## Relationship to other rules

This rule carries WHAT/WHY/state of a feature. The HOW lives in existing rules and is referenced, not duplicated: `api-live-schema-check.md`, `schema-validation.md`, `figma-design.md` (+ siblings), `domain-entities.md`.

Design rationale (problem→solution): `docs/feature-context-record-design.md`.
