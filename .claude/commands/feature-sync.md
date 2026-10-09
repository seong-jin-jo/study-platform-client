---
description: Detect drift in a feature's Figma + backend sources and report only what changed. Use to re-check a feature against its stored snapshot.
argument-hint: [slug] [--local]
version: 1.0.0
---

Detect drift in a feature's external sources (Figma + backend contract) and surface ONLY what changed. The hub is `docs/features/<slug>/context.md`; the machine baseline is `docs/features/<slug>/snapshot.json`. SSOT: `skills_context/SHARED/feature-context.md`.

Argument: `<slug>` (required). Optional flag: `--local`.

This is the one genuinely-new capability of the system: existing rules re-check the *full* schema every time; this command computes a delta against a stored fingerprint and reports only the difference.

## Execution Order

1. **Load baseline.** Read `docs/features/<slug>/snapshot.json`. If missing, tell the user to run `/feature-intake <slug>` first. Note each entry's stored `fingerprint`.

2. **Re-fetch backend contract (staging-first).**
   - Default source: staging `https://test-api.zeroone.it.kr/v3/api-docs`.
   - **Use `ctx_execute`, never WebFetch** (WebFetch is blocked by hook):
     ```javascript
     const res = await fetch('https://test-api.zeroone.it.kr/v3/api-docs');
     const api = await res.json();
     ```
   - SpringDoc wraps responses in `BaseResponse<T>`; drill `content.$ref` to the real DTO (see `.claude/rules/api-live-schema-check.md`).
   - With `--local`: instead read the backend source at `../study-platform-mvp` (controllers/DTOs) for an un-deployed preview. Label these deltas `(local)` so they are not confused with shipped contract.

3. **Re-fetch Figma.** For each `snapshot.json` figma entry, call MCP `get_design_context` using its `fileKey` + `nodeId` (parsed from the entry's `url`). If `fileKey`/`nodeId` are missing, parse them from `url` first (`%3A` → `:`). Follow `.claude/rules/figma-design.md` for truncation handling.

4. **Compute fingerprints.** For each source, hash the *normalized* shape, not the whole payload:
   - **Contract**: sorted list of `{field name, type, optional, enum values}` per DTO → stable string → fingerprint (e.g. sha256 of the canonical JSON). Ignore description/example text.
   - **Figma**: sorted set of `{node id, layout, key tokens}` per node → stable string → fingerprint. Ignore session-scoped asset URLs (they rotate every call — never let them produce a delta).

5. **Diff against baseline.** For each entry compare new fingerprint vs stored:
   - unchanged → silent (do NOT print).
   - changed → show a **field-level delta**: what was added / removed / type-changed / enum-changed. Not just "fingerprint differs".
   - new source in snapshot.json with `fingerprint: null` → treat as first capture (baseline, not a delta).

6. **Report delta only.** Format:
   ```
   <slug> sync — 2 changes

   [contract] GET /api/v1/group-studies → GroupStudyResponse
     + maxMembersCount: number (new, required)
     ~ status: enum  RECRUITING|CLOSED → RECRUITING|CLOSED|ARCHIVED

   [figma] 상세 헤더 (node 42:118)
     ~ gap token changed
   ```
   If nothing changed: `<slug> sync — no drift.`

7. **Persist.**
   - Update each changed entry's `fingerprint` + top-level `lastSync` (today, ISO) in `snapshot.json`.
   - Append one row per change to `context.md` section **7. Changelog**: `<date> | sync | <one-line delta summary>`.
   - If a contract delta affects a DTO the FE types mirror, remind the user to update `src/types/api/*` or regenerate OpenAPI — do not edit those here.

8. **Conflict with intake.** If a delta contradicts a recorded `FC-<slug>-NNN` requirement (e.g. a field a requirement depends on was removed), flag it explicitly and ask the user before updating the baseline — drift may be a backend regression, not an intended change.

## Notes

- Delta-only output is the whole point. Never dump the full schema when only one field moved.
- This command owns sections 4-5 fingerprints + changelog. It does not touch inbound (sections 1-3) or outbound (section 6).
- The HOW of verifying contracts/Figma lives in existing rules; this command links, never duplicates.

## Examples

```
/feature-sync premium-study           → diff against staging contract + Figma, show drift only
/feature-sync premium-study --local   → diff against ../study-platform-mvp (un-deployed preview)
```
