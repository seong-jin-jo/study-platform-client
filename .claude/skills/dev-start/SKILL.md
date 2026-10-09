---
name: dev-start
version: 1.0.1
description: 'Convert a Figma page or route node into a Next.js App Router page wired to real APIs. Refreshes backend repo, cross-checks DTOs, stops at commit.'
when_to_use: 'Activates on "페이지 구현해줘", "페이지 만들어줘", "Figma 페이지", "라우트 구현", "페이지 시작".'
---

# dev-start

## Purpose

Take one Figma page/route node, save its design context to `docs/Figma/`, decide route + API mappings, cross-check DTOs against the **live staging swagger** (local backend repo as fallback), generate a Next.js page wired to real hooks under the backend edge-case gate, run iterative Chrome ↔ Figma verification (pixel + token hex) until zero mismatches, then commit on the current branch. PR creation is **not** part of this skill — user invokes `/pr` afterwards.

## Required tooling — fail loud

- Figma MCP (`mcp__claude_ai_Figma__*`) — fetch + screenshot.
- A browser MCP for visual verification (`mcp__chrome-devtools__*` → `mcp__playwright__*` → `browser-harness`).

If the Figma MCP is unavailable, abort. If no browser tool is reachable at Step 8b, follow the Path B hand-off in `.claude/rules/figma-visual-verify.md` — never silently skip verification.

## Shared rules (read before coding)

- `.claude/rules/figma-design.md` — exhaustive property read (run first)
- `.claude/rules/figma-fetch.md` — fetch protocol, asset lifecycle, sub-section drill
- `.claude/rules/figma-pre-code-gate.md` — Gate A token mapping, node coverage
- `.claude/rules/figma-asset-download.md` + `.claude/rules/no-lucide-icon-substitution.md` — real assets, no lucide substitution
- `.claude/rules/svg-assets.md` — viewBox / preserveAspectRatio
- `.claude/rules/styling.md` — token system, no arbitrary spacing/sizing values
- `.claude/rules/api-live-schema-check.md` — live swagger DTO check
- `.claude/rules/backend-edge-case-gate.md` — loading/error/empty/401/enum/optional handling
- `.claude/rules/figma-visual-verify.md` — pixel + token-hex verification loop

## Feature Context Record

- **At start:** run `/feature-intake <slug>` to create/update `docs/features/<slug>/` and record `fileKey` + `nodeId` into `snapshot.json` (so drift can be tracked across sessions). `<slug>` = the route slug.
- **Before commit (Step 10):** run `/feature-sync <slug>` to refresh the Figma + contract fingerprints and confirm zero drift. Both use the same staging-first contract source as Step 7.

## Use_When

- User says "페이지 구현해줘", "페이지 만들어줘", "Figma 페이지", "라우트 구현", "페이지 시작"
- User shares a Figma URL and the target node is a **page-level frame** (full route, multi-section composition with data areas)
- Output should be one `page.tsx` under `src/app/(landing|service|admin)/.../` plus any helper components

## Do_Not_Use_When

- Figma node is a single component — use `design-to-dev` skill instead
- User wants only design tokens / no API wiring — handle inline
- Backend repo at `../study-platform-mvp/` is not present — abort early (S3)
- No Figma URL is available — ask user for one before proceeding

## Inputs

- Figma URL (with `node-id` query param) for a page/frame node
- Optional: target route path (e.g., `/premium-study/[id]`). If omitted, derive from Figma frame name + project routing convention.

---

## Steps

### 1–2. Figma Fetch + Asset Lifecycle + Sub-section Drill

→ **Full protocol:** `.claude/rules/figma-fetch.md` (`{slug}` = `{route-slug}`) — **check cache first** per `.claude/rules/figma-cache.md` Step F0

Summary:
- Run 4 Figma MCP calls in parallel (`get_design_context`, `get_variable_defs`, `get_screenshot`, `get_metadata`)
- Immediately download all image assets to `/public/{route-slug}/` — never hardcode Figma MCP URLs
- Never substitute assets with hand-crafted SVG, HTML text chars, or CSS — download the actual file
- Drill every Level-1 section individually; sample all variant matrix cells; record exact rotation degrees

### 3. Token Mapping

Map every Figma variable from Step 1's `get_variable_defs` to a `@theme inline` token in `src/app/global.css`, per `.claude/rules/figma-pre-code-gate.md` Gate A and `.claude/rules/styling.md` — those rules own the token formula, the arbitrary-value ban, and the base-Tailwind-undefined gotcha (incl. `bg-white` → use `bg-gray-0`). Do not re-state them here.

- ✅ Exact → project token. ⚠️ Close → nearest, record deviation. ❌ No match → nearest + record deviation (or stop + report for a final design).
- Build the mapping table → saved to the spec doc in Step 5.

### 4. Component Reuse Check

Before writing any code, identify which Figma sections already exist as components.

From `get_metadata`, collect all `type === "INSTANCE"` nodes. For each:

```bash
codegraph query "{ComponentName}"
```

| Result | Action |
|--------|--------|
| Found in `src/components/` | Record import path. Use in Step 8. Do not re-implement. |
| Not found | Mark TODO. Run `design-to-dev` skill separately. |

Output: Component reuse map table (Figma instance → codebase path → status).

### 5. Save to `docs/Figma/`

Create `docs/Figma/{page-slug}.md`:

```markdown
# {RouteName}

## Source
- File: {fileKey} | Node: {nodeId} | URL: {Figma URL} | Captured: {YYYY-MM-DD}

## Route
- Target path: src/app/(service)/.../page.tsx
- Layout group: (landing|service|admin) | Auth required: yes/no

## Sections
| Section | Type | Data Source | Notes |

## Component Reuse
| Figma instance | Codebase path | Status |

## Token Mapping
| Figma Variable | Project Token | Status |

## Token Deviations
## Transforms
| Node | Rotation | Scale | Notes |

## API Mapping
| Region | Hook | DTO Type | File |

## Component–API Map
| Component | Renders fields | Hook | DTO type | Notes |

## Notes
```

### 6. Code Mapping (Route + API)

#### 6a. Route Mapping

| Figma frame name pattern | Project route group |
|--------------------------|---------------------|
| Public/Landing/Marketing | `src/app/(landing)/.../page.tsx` |
| Authenticated user pages | `src/app/(service)/.../page.tsx` |
| Admin pages | `src/app/(admin)/.../page.tsx` |

#### 6b. API Mapping (per-component)

For every component in Step 4's reuse map AND every new component to be written:

1. Identify which data fields that component renders (from Figma text nodes, lists, badges)
2. Search `src/hooks/queries/`, `src/api/`, `src/api/openapi/` for matching hook
3. Record in Component–API Map table (saved to spec doc in Step 5):

| Component | Renders | Hook | DTO Field | Status |
|-----------|---------|------|-----------|--------|
| ClassCard | title, thumbnailUrl, memberCount | useGetClassList | ClassListItem.title/thumbnail/memberCount | ✅ |
| SomeWidget | price | — | — | TODO: no hook found |

**Never invent endpoints.** Missing hook → leave a `// TODO: API not found - <ComponentName>` placeholder **and** suggest the fix: run `yarn generate:api <swagger-api-title>` or invoke the `swagger-api-to-hook` skill to scaffold the hook from the live swagger. Do not stop at a bare TODO.

#### 6c. Middleware Route Registration

**Always run this step.** Unregistered paths redirect to `/`.

```bash
grep -n "'/path'" src/features/auth/server/middleware/route-policy.ts
```

| Route group | Required policy |
|-------------|-----------------|
| `(landing)` | `PUBLIC_SESSION` |
| `(service)` | Already protected (default) |
| `(admin)` | Already protected (default) |

If `(landing)` path not registered, add to `ROUTE_POLICIES` in `route-policy.ts`:

```typescript
{
  kind: ROUTE_POLICY_KINDS.PUBLIC_SESSION,
  path: '/{route-path}',
  match: ROUTE_MATCH_TYPES.PREFIX,
},
```

### 7. DTO Cross-Check (live swagger first)

Primary source is the **live staging swagger** — no local backend repo required. Follow `.claude/rules/api-live-schema-check.md`:

Use the `WebFetch` tool (load via `ToolSearch` if not in context) to fetch `https://test-api.zeroone.it.kr/v3/api-docs`. See `.claude/rules/api-live-schema-check.md` for the full protocol. SpringDoc wraps all responses in `BaseResponse<T>` — drill `content.$ref` to reach the real DTO.

`--local` flag (fallback / un-deployed preview): refresh the backend repo and read the `.java` DTOs instead.

```bash
test -d ../study-platform-mvp || { echo "Backend repo missing"; exit 1; }
DEFAULT_BRANCH=$(cd ../study-platform-mvp && git remote show origin | grep "HEAD branch" | awk '{print $NF}')
cd ../study-platform-mvp && git pull origin "$DEFAULT_BRANCH"
```

This is the same staging-first source `/feature-sync` uses — reuse it; do not duplicate the fetch logic. For every hook used in Step 6b, cross-check:
- Endpoint path + HTTP method
- Query/path param names + types
- Response field names, types, optionality
- Enum values

**Mismatch → abort (S2).** Report field-level diff. (Backend is read-only — report any needed backend change as a spec, never edit `.java`.)

```
QA Swagger JSON: https://test-api.zeroone.it.kr/v3/api-docs
QA Swagger UI:   https://test-api.zeroone.it.kr/swagger-ui/index.html
QA API base:     https://test-api.zeroone.it.kr
```

### 8. Page Generation

Write `page.tsx` at the path from Step 6a. Apply:

- Component reuse map from Step 4 — import existing components, do not re-implement
- Token mapping from Step 3 — project tokens only, no arbitrary values
- `cn()` for all `className` composition
- TanStack Query hooks from Step 6b
- TODO placeholders where API hooks or components are missing

**Backend edge-case gate (mandatory).** Enforce every item of `.claude/rules/backend-edge-case-gate.md` for each data-rendering region: `?? index` keys, enum `in` guards, **loading + error + empty** states for every `useQuery`, `onError`/`onSettled` + 401 handling via `analyzeError` for every `useMutation`, Zod+transformer for forms, OpenAPI consumed via `createApiInstance()` + `data.content` unwrap. A checklist item that cannot be met → **abort** and report. Do not ship happy-path-only JSX.

After write, run **in order**:

```bash
yarn lint:fix
yarn prettier:fix
yarn typecheck
```

If `yarn typecheck` fails → **abort (S4)**. Report errors.

### 8b. Chrome ↔ Figma Visual Verification (pixel + token hex)

**Dev server check first:**
```bash
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"
```
→ `000` or timeout: dev server not running → use `yarn build && yarn start` for verification (Turbopack + Console Ninja can jam new routes on `yarn dev`).

→ **Full protocol:** `.claude/rules/figma-visual-verify.md` (target = the route at `http://localhost:3000/<route>`)

Summary:
- **Pixel:** Chrome screenshot → compare ALL checks against a fresh Figma reference → fix every ❌ → repeat
- **Token hex:** resolve every color/spacing token against `global.css` and confirm it equals the Figma value (catches `#d1d2d4` vs `#d5d7da` drift screenshots can't show) — this is the real 100% gate
- Exit only when zero pixel ❌ **and** zero hex ❌ remain simultaneously — never hand a mismatch to the user
- Soft cap 2 iterations; if ❌ remain → list every residual explicitly in the Step 9 summary, never hide one

### 9. Verify Gate

**Pause here.** Print:

```
✓ Page:       src/app/.../page.tsx
✓ Spec:       docs/Figma/{slug}.md
✓ DTO check:  passed
✓ Visual:     Chrome ↔ Figma — all checks passed (N iterations)
✓ Reference:  {Figma screenshot URL from Step 1}
{TODO list if any APIs or components missing}

Reply OK to commit, or describe mismatch to fix.
```

Wait for user OK before continuing.

### 10. Commit

Before committing, run `/feature-sync <slug>` to refresh the Figma + contract fingerprints in `docs/features/<slug>/snapshot.json` and confirm **zero drift** — so the 100% reflection holds across sessions. If sync reports drift, resolve it (or surface to the user) before commit.

```bash
git add src/app/.../page.tsx \
        docs/Figma/{slug}.md \
        {any helper components created}
git commit -m "feat : {RouteName} 페이지 구현"
```

Korean commit message, `feat : <subject>` format, ≤50 chars. Include TODOs and token deviations in commit body if any.

### 11. Stop

Print: `Run /pr to open PR against develop.` Do not auto-create PR.

---

## Blockers

| ID | Condition | Action |
|----|-----------|--------|
| S1 | API hook not found | Continue with `// TODO: API not found` placeholder, report in summary |
| S2 | Backend DTO mismatch | **Abort**, report field-level diff, await decision |
| S3 | `../study-platform-mvp/` missing | **Abort**, instruct clone |
| S4 | `yarn typecheck` fails | **Abort**, report errors |
| S5 | Sub-section `get_design_context` truncated after retry | Record as partial, continue best-effort, flag in spec Notes |
| S6 | Visual check not converging after 2 iterations | List remaining ❌ in Step 9 summary, hand off to user |

## Tool_Usage

- `mcp__claude_ai_Figma__get_design_context` — page + each sub-section (parallel)
- `mcp__claude_ai_Figma__get_variable_defs` — token extraction
- `mcp__claude_ai_Figma__get_screenshot` — visual reference
- `mcp__claude_ai_Figma__get_metadata` — child tree enumeration
- `Bash` — codegraph queries, global.css token read, git pull, yarn commands, git add/commit
- `Read` — inspect existing hooks, DTOs, global.css, backend classes
- `Write` — page.tsx, helper components, spec doc
- `mcp__chrome-devtools__navigate_page` — load/reload route for verification
- `mcp__chrome-devtools__take_screenshot` — capture Chrome state at each iteration
- `mcp__chrome-devtools__hover` / `mcp__chrome-devtools__click` — activate interactive states
- `mcp__chrome-devtools__take_snapshot` — find element UIDs for hover/click targets

## Final_Checklist

- [ ] All Figma image assets downloaded to `/public/{route-slug}/` — no Figma MCP URLs in source (Step 1b)
- [ ] No asset substituted with HTML text chars, inline SVG, or CSS — img count matches `const imgX` count (Step 1b)
- [ ] Cross-session plan: `get_design_context` re-called for fresh asset URLs (Step 1b)
- [ ] All 4 Figma MCP calls made in parallel (Step 1)
- [ ] Every Level-1 section drilled individually (Step 2)
- [ ] All variant cells sampled (Step 2b)
- [ ] All transform values recorded at exact degree precision (Step 2c)
- [ ] Visual content sizes derived from container sub-node call, not page-level (Step 2e)
- [ ] Token mapping table built against global.css `@theme inline` (Step 3)
- [ ] No arbitrary values or base Tailwind scale used anywhere
- [ ] No base Tailwind color classes (`bg-white`, `text-white`, `bg-black`) — `@theme inline` undefines them; use `bg-gray-0` for white
- [ ] Component reuse map built — existing components identified and imported (Step 4)
- [ ] `docs/Figma/{slug}.md` written with all tables (Step 5)
- [ ] Route under correct group (landing/service/admin)
- [ ] `(landing)` route registered as `PUBLIC_SESSION` in `route-policy.ts` (Step 6c)
- [ ] Completeness audit printed after figma-fetch.md F3f: "Components found: N (Level-1: A, Nested: B, Variant: C)"
- [ ] Components found count matches Step 4 reuse map entry count
- [ ] API mapping is per-component with explicit DTO field names (Step 6b)
- [ ] `docs/Figma/{slug}.md` includes Component–API Map table (Step 5)
- [ ] Every component either mapped to real hook or marked TODO + scaffolding suggestion (`yarn generate:api` / `swagger-api-to-hook`)
- [ ] `/feature-intake <slug>` run at start; `fileKey` + `nodeId` in `snapshot.json`
- [ ] DTO cross-check via live swagger `/v3/api-docs` (or `--local`); passed or aborted on mismatch
- [ ] QA URL printed in summary
- [ ] Backend edge-case gate enforced — loading/error/empty per query, onError/onSettled + 401 per mutation, `?? index` keys, enum `in` guards (Step 8)
- [ ] Page uses `cn()`, reused components, project tokens only
- [ ] `yarn lint:fix && yarn prettier:fix && yarn typecheck` all pass
- [ ] Visual verify: pixel ✅ + token-hex ✅, zero ❌ (residuals surfaced) before exiting (Step 8b)
- [ ] `/feature-sync <slug>` run before commit — zero drift confirmed (Step 10)
- [ ] Interactive states verified via hover/click (Step 8b)
- [ ] Cross-session: Figma screenshot re-fetched before visual comparison (Step 8b)
- [ ] Figma screenshot URL shown to user for visual comparison (Step 9)
- [ ] User confirmed visual match before commit
- [ ] Single commit on current branch, body lists TODOs and deviations
- [ ] `generateMetadata` or `metadata` object set (if landing/entry route)
- [ ] `error.tsx` exists for this route segment (error boundary)
- [ ] Critical path (payment, auth): E2E test written or linked per `.claude/rules/e2e-testing.md`
- [ ] Final output instructs user to run `/pr`
