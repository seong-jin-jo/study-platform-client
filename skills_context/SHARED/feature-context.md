# Feature Context Record — Agent Skill SSOT

Use this when working on a feature's cross-team context: capturing inbound planning/design specs, tracking backend contract drift, or recording outbound evidence (PR/verification). Goal: **one feature = one living context document**, so nothing dropped between FE, planning/design, and backend.

This file is the shared source of truth. Claude and Codex wrappers stay thin and point here. Do not duplicate this workflow in wrappers.

Design rationale: `docs/feature-context-record-design.md` (problem→solution, P1-P5).

## Artifacts

Each feature owns a folder `docs/features/<slug>/`:
- `context.md` — human hub, 7 sections. Read by FE/planning/design/BE. Template: `docs/features/_TEMPLATE/context.md`.
- `snapshot.json` — machine fingerprint baseline (Figma nodes + backend DTOs). Humans don't read it; only `/feature-sync` reads/updates it. Keeps human diffs clean.

`context.md` sections: 1 Meta · 2 Requirement/WHY (`FC-<slug>-NNN` IDs) · 3 Screen↔Route map · 4 Backend contract · 5 Figma reference · 6 Outbound evidence · 7 Changelog (append-only).

## Commands (ownership boundaries)

| Command | Owns | File |
|---------|------|------|
| `/feature-intake <slug>` | inbound: sections 1-3, 5 + changelog | `.claude/commands/feature-intake.md` |
| `/feature-sync <slug>` | drift: sections 4-5 fingerprints + changelog | `.claude/commands/feature-sync.md` |
| `/pr`, `/doc` | outbound: section 6 | `.claude/commands/pr.md`, `doc.md` |

Each command touches only its sections. No command duplicates verification HOW — that lives in existing rules.

## Relationship to existing rules (HOW vs WHAT)

The 18 rules in `.claude/rules/` describe **HOW** to implement (Figma reading, token mapping, API schema checks, schema validation). This system describes **WHAT/WHY** a feature is and its **state**. It links to the rules, never replaces them:
- Backend contract verification HOW → `.claude/rules/api-live-schema-check.md`, `schema-validation.md`
- Figma reading HOW → `.claude/rules/figma-design.md` and siblings
- Domain disambiguation → `.claude/rules/domain-entities.md`

## Key decisions

1. **snapshot.json separate from context.md** — machine fingerprints kept out of the human doc to avoid hash diff noise. Humans read the changelog; the engine reads the json.
2. **staging-first backend source** — `/feature-sync` defaults to staging `/v3/api-docs` (the contract FE actually integrates against). Local `../study-platform-mvp` only via `--local` (un-deployed preview), labeled `(local)` to avoid false drift.

## The one new capability

Delta detection. Existing rules re-check the *full* schema each time; `/feature-sync` fingerprints sources and reports **only what changed**, logging it to the changelog. Everything else (hub doc, FC IDs, outbound) connects existing assets.

## Monorepo promotion path

This is a strict subset of the future `docs/product-ssot/` vision, built for today's split repos. On monorepo migration: `docs/features/<slug>/` → `docs/product-ssot/{domain}/`, `FC-<slug>-NNN` → `REQ-*`, `/feature-sync` → FE-BE contract CI. Promotion, not replacement.
