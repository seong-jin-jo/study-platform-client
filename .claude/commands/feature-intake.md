---
description: Capture inbound planning/design sources into a feature's Context Record at docs/features/<slug>/context.md.
argument-hint: [slug]
version: 1.0.0
---

Capture inbound planning/design sources into a feature's Context Record. The hub lives at `docs/features/<slug>/context.md`. SSOT for this system: `skills_context/SHARED/feature-context.md`.

Argument: `$ARGUMENTS` (kebab-case feature name, e.g. `premium-study`). If omitted, ask the user.

## Execution Order

1. **Resolve folder.**
   - If `docs/features/<slug>/` does not exist, create it by copying the template:
     `cp -r docs/features/_TEMPLATE docs/features/<slug>`
   - Replace every `<slug>` placeholder in the copied `context.md` and `snapshot.json`.
   - If it already exists, this is an *update* — do NOT overwrite; merge into existing sections.

2. **Gather inbound sources.** Ask the user to paste planning/design material (기획 문서, Slack, Notion, Figma 링크, 회의 메모). Accept links and pasted text.

3. **Summarize, never copy raw.** For each source, extract the essential WHAT/WHY in 1-2 lines. Keep the canonical link. Do not paste full original text. Do not store secrets/tokens/env values.

4. **Assign requirement IDs.** Each distinct requirement gets `FC-<slug>-NNN` (zero-padded, sequential from existing max in the file). Fill section **2. Requirement / WHY** with ID + summary + canonical link.

5. **Fill what you can** from the sources: routes (section 1), screen↔route map (section 3), Figma references (section 5). For Figma, record the **full link** the user provides (e.g. `https://www.figma.com/design/<fileKey>/<name>?node-id=<id>`) — it is clickable and embeds fileKey + node-id. Also parse `fileKey` and `nodeId` (convert URL-encoded `%3A` → `:`) into `snapshot.json` so `/feature-sync` can call MCP. Leave unknown fields as `<...>` placeholders — do not invent.

6. **Conflict flag.** If a new source contradicts something already in the Context Record (changed requirement, different route, renamed screen), do NOT silently overwrite. Add a `⚠ CONFLICT` row to section **7. Changelog** describing old vs new, and ask the user which is canonical before editing the affected section.

7. **Set status.** New record → `intake`. If implementation is already underway, ask whether to set `in-progress`.

8. **Update meta.** Set `updated` to today. Append a changelog row: `<date> | intake | <what was captured>`.

9. Report the path `docs/features/<slug>/context.md` and a short summary of captured FC IDs.

## Notes

- This command only touches inbound (sections 1-3, 5) + changelog. Backend contract fingerprints are owned by `/feature-sync`. Outbound is owned by `/pr` and `/doc`.
- Verification HOW lives in existing rules (`figma-*.md`, `api-live-schema-check.md`); this command does not duplicate them — it links.

## Examples

```
/feature-intake premium-study     → create/update docs/features/premium-study/, capture sources
/feature-intake                   → ask for slug first
```
