---
name: design-to-dev
version: 1.0.1
description: 'Convert a single Figma component node into a project component. Stops at commit; user runs /pr.'
when_to_use: 'Activates on "컴포넌트 만들어줘", "컴포넌트 구현해줘", "Figma 컴포넌트", "스토리북 만들어줘", "Figma 컴포넌트 구현".'
---

# design-to-dev

## Purpose

Take one Figma component node, generate a TypeScript component honoring project conventions, verify it pixel-for-pixel + token-for-token against Figma, then commit on the current branch. PR creation is **not** part of this skill — user runs `/pr` afterwards.

This SKILL is the **canonical** definition. The slash command `.claude/commands/design-to-dev.md` is a thin wrapper that parses `/design-to-dev <url> [name]` and delegates here. Keyword triggers and the slash command must produce **identical** output.

## Required tooling — fail loud

- Figma MCP (`mcp__claude_ai_Figma__*`) — required for fetch + screenshot.
- A browser MCP for visual verification (`mcp__chrome-devtools__*` → `mcp__playwright__*` → `browser-harness`).

If the Figma MCP is unavailable, abort and tell the user. If no browser tool is reachable at the verify step, follow the Path B hand-off in `.claude/rules/figma-visual-verify.md` — never silently skip verification.

## Shared rules (read before coding)

- `.claude/rules/figma-design.md` — exhaustive property read (run first)
- `.claude/rules/figma-fetch.md` — fetch protocol, asset lifecycle, sub-node drill
- `.claude/rules/figma-pre-code-gate.md` — Gate A token mapping, node coverage
- `.claude/rules/figma-asset-download.md` + `.claude/rules/no-lucide-icon-substitution.md` — download real assets, never substitute custom icons with lucide
- `.claude/rules/svg-assets.md` — viewBox / preserveAspectRatio checks
- `.claude/rules/styling.md` — token system, no arbitrary spacing/sizing values
- `.claude/rules/figma-visual-verify.md` — pixel + token-hex verification loop
- `.claude/rules/backend-edge-case-gate.md` — only when the component renders API data

## Use_When

- User says "컴포넌트 만들어줘", "컴포넌트 구현해줘", "Figma 컴포넌트", "스토리북 만들어줘", "Figma 컴포넌트 구현"
- User shares a Figma URL and the target node is a **single component** (button, card, badge, modal piece) — not a full page

## Do_Not_Use_When

- Figma node is a full page or route — use `dev-start` skill instead
- User wants only design tokens extracted (no component) — handle inline
- No Figma URL is available — ask user for one before proceeding

## Inputs

- Figma URL (with `node-id` query param)
- Optional: target component name (PascalCase). If omitted, derive from Figma node name.

---

## Steps

### 0. Frame Type Classification

Before writing any code, decide which kind of frame this is — it determines the story strategy. If unsure, call `get_screenshot(frame-node-id)` and look before deciding.

| Type | What it looks like | Stories needed |
|------|--------------------|----------------|
| **A — Single component** | One component, different states (hover, disabled, …) | Default + each state + Mobile |
| **B — Variant grid** | A table of size × state × type combinations | VisualMatrix + Interactive (both required) |
| **C — Composite** | Multiple different components placed together | One Composite story matching the frame layout |

### 1. Figma Fetch + Drill

Follow `.claude/rules/figma-fetch.md` (`{slug}` = `{component-slug}`) — **check cache first** per `.claude/rules/figma-cache.md` Step F0:
- Run `get_design_context`, `get_variable_defs`, `get_screenshot`, `get_metadata` in parallel.
- Drill every `INSTANCE` and complex `FRAME` child individually; for variant components sample **every** variant cell, not just the default.
- Download every image asset to `public/{component-slug}/`; never substitute (see asset rules).

Record the completeness count before Step 3:

```
Sub-components found: N (instances: A, complex frames: B, variant cells: C)
```

### 2. Code Connect Gate (before writing code)

Check whether the Figma node is already mapped to a codebase component:

```
get_code_connect_suggestions(node-id)
  → mapping exists  → import the mapped component, SKIP generation
  → no mapping      → continue to Step 3
```

This prevents duplicate generation. After the Step 9 commit, register the new component in Code Connect (default; skip only if registration fails):

```
get_code_connect_suggestions(node-id) → send_code_connect_mappings(...)
```

### 3. Token Mapping

Map every Figma variable to a `@theme inline` token in `src/app/global.css` per `.claude/rules/figma-pre-code-gate.md` Gate A and `.claude/rules/styling.md`. Do not re-state the token formula here — those rules own it.

- Token mapping follows `.claude/rules/figma-pre-code-gate.md` Gate A. ✅ Exact → project token. ⚠️ Close → nearest, record deviation. ❌ No match → stop and report to user (Gate A owns the no-match policy for final vs. draft designs).

### 4. Component Generation

Verify completeness first: `Sub-components from Step 1: N → N mapped to implementation or marked TODO`. Abort if the count differs with no explanation.

Write to `src/components/...` (`common/ui/`, `pages/`, or a domain folder by nature). Apply CLAUDE.md + `.claude/rules/styling.md`:

- `cn()` for all `className` — no template-literal classNames.
- Custom tokens only — no arbitrary spacing/sizing values, no base Tailwind scale.
- Exported TypeScript props interface.
- No hardcoded colors / hex.
- If the component renders backend data → optional fields with `?`, and apply **the backend edge-case gate (Step 6)**.

```typescript
import { cn } from '@/lib/utils';

interface {ComponentName}Props {
  // ...
}

export function {ComponentName}({ ... }: {ComponentName}Props) {
  return <div className={cn('flex flex-col gap-150 p-200 rounded-200', ...)}>...</div>;
}
```

After write, run **in order** — abort (blocker D2) if typecheck fails:

```bash
yarn lint:fix
yarn prettier:fix
yarn typecheck
```

### 5. Storybook Stories

A story is the **visual-verify target** for this skill, so a Default story (Type A/C) or VisualMatrix (Type B) is generated to enable Step 7 even when the user did not ask for "storybook". When the user **did** ask, produce the full set for the frame type.

**Type A:** Default + one story per Figma state + Mobile viewport.

**Type C:** one `Composite` story placing all components with the frame's real layout/spacing.

**Type B — VisualMatrix (required):** reproduce the variant grid pixel-for-pixel.
1. Absolute positioning, not flex/gap — each cell has its own width/height.
2. Normalize Figma coords to (0,0): subtract the frame's top-left from every child.
3. Coordinate-table pattern (name axes by what varies per direction):

```typescript
const COL_BASE_X: Record<SizeKey, number> = { /* normalized x per size column */ };
const STATE_DX: Record<SizeKey, Record<StateKey, number>> = { /* x offset per state */ };
const ROW_DY: Record<RowKey, number> = { /* y offset per row type */ };
const BLOCK_BASE_Y: Record<BlockKey, number> = { /* y start per major block */ };

const cells = BLOCK_KEYS.flatMap((block) =>
  ROW_KEYS.flatMap((row) =>
    COL_KEYS.flatMap((col) =>
      STATE_KEYS.map((state) => ({
        block, row, col, state,
        x: COL_BASE_X[col] + STATE_DX[col][state],
        y: BLOCK_BASE_Y[block] + ROW_DY[row],
      })))));
```

4. Match the container to the Figma frame size (`width`/`height` from metadata, `overflow: auto` if wider than viewport).
5. Simulate interaction states **statically** with `!important` overrides on cva classes (CSS `:hover` shows only one at a time):

```typescript
const STATE_OVERRIDE: Record<BlockKey, Record<StateKey, string>> = {
  primary:   { default: '', hover: '!bg-fill-brand-default-hover', pressed: '!bg-fill-brand-default-pressed', disabled: '' },
  secondary: { default: '', hover: '!bg-...', pressed: '!bg-...', disabled: '' },
};
```

6. Disable grid-axis controls (`argTypes: { size: { table: { disable: true } }, ... }`).

**Type B — Interactive (required alongside VisualMatrix):** the `!important` overrides bypass the real `hover:`/`focus-within:`/`active:` chain. Interactive verifies the real chain with no overrides:

```typescript
export const Interactive: Story = {
  render: () => (
    <div className="flex gap-200 p-200">
      <Component />
      <Component disabled />
    </div>
  ),
};
```

If story generation fails (missing types, etc.) → continue with component only + warn (degrade D3), but note that visual-verify then needs a temporary mount.

### 5b. Form-field Traps (required for input / textarea / select)

When the component is a form field, check each explicitly:

1. **Container height ≠ input box height.** A symbol height usually includes the helper-text row + gap: `input_box_height = symbol_height − helper_height − container_gap`. For textareas skip `min-h`, use the `rows` attribute.
2. **Trailing icon padding is asymmetric.** Right icon usually cuts right padding ~4px (12→8). If `pl ≠ pr`, encode as a cva variant: `hasTrailingIcon: { true: 'pr-100', false: 'pr-150' }`.
3. **Helper text token consistency.** Sample helper color in all states; if 4/5 use Subtlest and 1 uses Default, treat the outlier as a Figma bug — implement Subtlest, note it.
4. **Static grid overrides aren't real interactions.** Interactive story verifies the real chain.
5. **Don't copy Figma typos** (`Disableed`, `Hoverr`) — map to correctly spelled project tokens.

### 6. Backend Edge-Case Gate (only if the component renders API data)

Skip for pure design-system components (Button, Icon). Otherwise enforce every item of `.claude/rules/backend-edge-case-gate.md`: `?? index` keys, enum `in` guards, loading/error/empty states, mutation `onError`/`onSettled` + 401 handling via `analyzeError`, Zod+transformer for forms, and a DTO cross-check against the live swagger (`https://test-api.zeroone.it.kr/v3/api-docs`). Mismatch → abort. Missing hook → `// TODO` + suggest `yarn generate:api` / `swagger-api-to-hook` skill.

### 7. Visual Verification (pixel + token hex)

**Before running:** confirm Storybook is up: `lsof -i:6006`. If not, start with `yarn storybook`. If the story does not yet exist, temporarily mount the component on a scratch route.

Run the full loop in `.claude/rules/figma-visual-verify.md` against the Storybook target (`http://localhost:6006/iframe.html?id=<story-id>`). Both must pass:
- **Pixel:** Chrome/Playwright screenshot ↔ fresh Figma `get_screenshot`, all checklist rows.
- **Token hex:** every color/spacing token resolved against `global.css` equals the Figma value.

Loop until zero ❌. Soft cap 2 iterations; if ❌ remain, list every residual explicitly at the verify gate — never hide one.

### 8. Verify Gate

**Pause.** Print:

```
✓ Component: src/components/.../{ComponentName}.tsx
✓ Story:     src/components/.../{ComponentName}.stories.tsx (+ VisualMatrix/Interactive for Type B)
✓ Visual:    pixel ✅  + token-hex ✅  (N iterations)
{any residual ❌, token deviations, or TODOs}

Reply OK to commit, or describe a mismatch to fix.
```

Wait for user OK.

### 9. Commit

```bash
git add src/components/.../{ComponentName}.tsx {story file if any}
git commit -m "feat : {ComponentName} 구현 — {WHY: 구현 이유}"
```

Korean commit, `feat : <subject>` ≤50 chars, WHY-focused (not WHAT). List token deviations in the body.

### 10. Stop

Print: `Run /pr to open PR against develop.` Do **not** auto-create a PR.

## Blockers

| ID | Condition | Action |
|----|-----------|--------|
| D1 | Token mapping has no match | Final design → stop + report; draft → nearest + record deviation |
| D2 | `yarn typecheck` fails | **Abort**, report errors |
| D3 | Storybook story generation fails | Continue with component only + warn; verify via temporary mount |
| D4 | Component renders API data but DTO mismatches live swagger | **Abort**, report field-level diff |
| D5 | No browser tool for verification | Path B hand-off (`figma-visual-verify.md`) — never silently skip |

## Final_Checklist

- [ ] Frame type classified (Step 0)
- [ ] All Figma properties read; assets downloaded, none substituted
- [ ] All INSTANCE + complex FRAME + variant cells drilled (figma-fetch)
- [ ] Code Connect map checked before generation (Step 2)
- [ ] Sub-component count matches implementation count
- [ ] `cn()` only, no arbitrary values, no base Tailwind scale
- [ ] Form-field traps checked (if applicable)
- [ ] Backend edge-case gate enforced (if rendering API data)
- [ ] `yarn lint:fix && yarn prettier:fix && yarn typecheck` pass
- [ ] Visual verify: pixel ✅ + token-hex ✅, zero ❌ (or residuals surfaced)
- [ ] Interactive elements: aria-label, role, tabIndex, keyboard navigation checked (if applicable)
- [ ] User confirmed before commit
- [ ] Single commit on current branch (no PR); output instructs `/pr`
