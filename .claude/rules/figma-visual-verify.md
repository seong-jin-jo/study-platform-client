# Figma Visual Verification Rules

Shared by the `design-to-dev`, `dev-start`, and `extract-common-component` skills. Run **after** code is generated and lint/typecheck pass. 100% visual fidelity requires **both** a pixel-level screenshot comparison **and** a token hex cross-check — a screenshot match alone is not sufficient.

## Required MCP — fail loud, never skip silently

This rule needs a browser MCP and the Figma MCP. Resolve the browser target in this order, stop at the first that responds:

1. `mcp__chrome-devtools__*` (preferred — already used by `staging-verify`)
2. `mcp__playwright__*`
3. `browser-harness` CLI

If **none** of the three browser tools is reachable AND the Figma MCP is unavailable, do **not** declare the task complete. Print the explicit fallback hand-off from `.claude/rules/figma-verification.md` Path B (code-level audit + checklist for the user) and say plainly that visual verification could not run. A silent skip is prohibited.

---

## Target URL

| Caller | Target |
|--------|--------|
| `design-to-dev`, `extract-common-component` | Storybook iframe: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`. If Storybook is not running, start it: `yarn storybook`. If the component is not yet in a story, temporarily mount it on a scratch route or add a Default story to verify against. |
| `dev-start` | The route under dev: `http://localhost:3000/<route>` |

### Building the Storybook story ID

```
Story ID = kebab-case(meta.title) + '--' + kebab-case(export-name)
Example: title='Common/UI/TextField', export='VisualMatrix'
  → id = 'common-ui-textfield--visual-matrix'
```

If the URL 404s, list the real IDs from `http://localhost:6006/index.json`:

```
Object.keys(json.entries).filter(k => k.includes('<keyword>'))
```

---

## Part 1 — Pixel comparison loop

### Setup

1. **Re-fetch the Figma reference** — never reuse the fetch-phase screenshot, it expires (~7 days, URLs rotate per session). Call `mcp__claude_ai_Figma__get_screenshot(nodeId, fileKey, enableBase64Response: true)` fresh.
2. Navigate the browser tool to the target URL.
3. If the design has hover/focus/active states to verify: trigger them (`hover`/`click`) before screenshotting.

### Comparison checklist (run every iteration)

| Check | Pass condition | What to count/measure |
|-------|---------------|----------------------|
| Spacing between elements | Chrome gaps match Figma gaps via exact token (e.g. `gap-250` not `gap-300`) | Mismatches are usually 4–8px off |
| Padding on interactive items | Hit area matches Figma wrapper padding | Click/hover extent = text + padding |
| Typography | Font size, weight, color, line-height match per element | Compare text nodes explicitly |
| Distinct visual shape count | Chrome count == Figma count per layer type | Count rings, cards, sparkles separately |
| Content fill within containers | Content occupies the same % of its container | Measure content vs container |
| Element overflow | No element bleeds outside its container | Check cards, panels |
| Shape overlap | Absolute shapes do not compound unexpectedly | Each shape reads as distinct |
| Tooltip / overlay position | Appears correctly, not clipped by a parent stacking context | Verify visible over page content |
| Asset integrity | Every Figma `<img src={imgX}>` has a local `/public/` counterpart — no substitution | Audit code vs Figma `const imgX` list |
| Interactive state accuracy | Hover/focus/active match the Figma variant | Trigger each state and screenshot |
| Mobile viewport (375px) | No horizontal scroll, layout matches Figma mobile spec | Resize via `mcp__chrome-devtools__resize_page` → recheck spacing, typography, overflow |

### Say the layout out loud before claiming a match

```
"Figma:    <N> blocks, <R> rows × <C> cols per block"
"Rendered: <same format>"
```
If the two descriptions differ → it is **not** a match. DOM checks prove cells exist, not that the layout matches Figma. Never self-approve on the first pass — always read both images in **one** response, never compare from memory.

### Numeric spot-check (when a value is in doubt)

```javascript
const rect = document.querySelector('<selector>').getBoundingClientRect();
console.log(rect); // top, left, width, height
```
Compare against the Figma `get_design_context` value. Within 2px = pass.

### Iteration loop (mandatory)

```
LOOP:
  1. screenshot → rendered state
  2. compare against Figma reference for ALL checks above + Part 2 hex table
  3. list every ❌
  4. zero ❌ → EXIT → proceed to commit gate
  5. for each ❌: identify root cause → fix code → reload
  6. GOTO 1
```

**Exit condition:** every pixel check AND every hex row pass simultaneously.
**Never exit with any ❌ remaining as "good enough".** Do not hand a known mismatch off as done.
**Soft cap: 2 iterations.** If ❌ remain after 2 passes, do not silently stop — list every remaining ❌ explicitly in the verify-gate summary so the user sees exactly what is unresolved, and ask how to proceed. 100% means the user is told about every residual ❌, never that they are hidden.

---

## Part 2 — Token hex cross-check (required)

Screenshots miss token-level drift. `#d1d2d4` vs `#d5d7da` is only 3 RGB units apart — invisible in a screenshot but the wrong token binding. This is the real 100% gate.

For every color/spacing token the design uses, build this table:

| Variant | Figma value | Project token | Resolved hex/px | Match |
|---------|-------------|---------------|-----------------|-------|
| L Primary Default bg | #f63d68 | `bg-fill-brand-default-default` | #f63d68 | ✓ |
| L Secondary Disabled text | #d5d7da | `text-text-disabled` | #d5d7da | ✓ |
| M/L gap | 6px | `gap-75` | spacing-75 → 6px | ✓ |

Resolve each project token against `global.css` and confirm it equals the Figma value:

```bash
grep -E "^\s*--color-text-disabled|^\s*--spacing-75" src/app/global.css
```

Each ❌ row is a blocker — fix the token binding or get explicit user approval before committing.

What this catches that screenshots miss:
- Two states bound to the same project token where Figma uses two different ones
- Spacing off by a few px (4 vs 6)
- Hover/Pressed wired to the wrong color step (rose-600 vs rose-700)

---

## Root cause reference (pixel ❌)

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Spacing too wide/narrow | Gap token mismatch (`gap-300` vs `gap-250`) | Read Figma `gap-[Xpx]` → exact token |
| Item hit-area/padding wrong | Missing `p-[token]` on wrapper | Add matching padding token |
| Tooltip clipped behind content | Parent has `mix-blend`/`filter`/`transform` → stacking context; `<main>` paints on top | Add `relative z-{n}` to the parent |
| More shapes than Figma | Duplicate element compounding | Remove duplicate |
| Content too small in container | Size from page-level call, not container drill (figma-fetch F3e) | Re-drill container, apply exact px |
| Content bleeds outside container | Missing `overflow-hidden` or oversized | Add `overflow-hidden` or reduce |
| Icon wrong color/shape | Asset substituted instead of downloaded | `curl` the real asset, replace |
| Text typo/case mismatch | Misread Figma text or wrong variant sampled | Re-read the node text verbatim |
| Color looks right but token off | Wrong token binding (hex cross-check ❌) | Re-bind to the token whose resolved hex matches |
