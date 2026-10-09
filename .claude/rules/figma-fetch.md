# Figma Fetch Rules

Shared by the `design-to-dev`, `dev-start`, and `extract-common-component` skills. Apply during the Figma fetch + sub-node drill phase of any Figma-to-code work.

`{slug}` below = `{route-slug}` for page work (`dev-start`) and `{component-slug}` for component work (`design-to-dev`, `extract-common-component`). Assets always land under `public/{slug}/`.

---

## Step F0. Cache Check (run before F1)

→ **Full protocol:** `.claude/rules/figma-cache.md`

Parse the Figma URL to extract `fileKey` and `nodeId`, then `Read docs/Figma/{slug}.cache.json`:

- **Cache hit** (valid `schemaVersion`, matching `fileKey`/`nodeId`, ≤7 days old) → load cached data, skip F1 and F2, proceed to F3 using cached `root.metadata`.
- Cached `frames[*]` maps to F3 sub-section results — skip any `get_design_context` call for a nodeId already in the frames tree.
- **Cache miss or invalid** → proceed to F1. After F1–F3 complete, write cache per `figma-cache.md`.

---

## Step F1. Figma Fetch

Run **in parallel**:

- `mcp__claude_ai_Figma__get_design_context(nodeId, fileKey)` — layout, transforms, typography, effects, hierarchy
- `mcp__claude_ai_Figma__get_variable_defs(nodeId, fileKey)` — design tokens
- `mcp__claude_ai_Figma__get_screenshot(nodeId, fileKey)` — reference image (save the URL for the visual-verify step)
- `mcp__claude_ai_Figma__get_metadata(nodeId, fileKey)` — full child tree for the Step F3 drill

Follow `.claude/rules/figma-design.md` exhaustively. After receiving results:

- If `get_design_context` output appears truncated (ends mid-property or contains `...`) → flag for re-call in Step F3.

---

## Step F2. Figma Asset URL Lifecycle

> "The best way to ensure your images are always available is to download them to your codebase and reference those local files instead." — Figma official

**CRITICAL:** Figma MCP asset URLs (`https://www.figma.com/api/mcp/asset/<uuid>`) are **session-scoped**. Each call to `get_design_context` returns a unique set of signed URLs — the same logical asset gets a different UUID every session. URLs from a previous session or plan document **will not load** in a new session.

**Rule:** Immediately after Step F1 (or any `get_design_context` call), download all image assets to `public/{slug}/`:

```bash
mkdir -p public/{slug}/
curl -s -o public/{slug}/{asset-name}.svg "<figma-mcp-asset-url>"
# verify: file command should show SVG or PNG, not HTML error
file public/{slug}/*.svg
```

Use local paths (`/class/sphere.svg`) in all generated code. **Never hardcode Figma MCP URLs in source files.**

When implementing from a cross-session plan that contains hardcoded Figma asset URLs:

1. Re-call `get_design_context` immediately — do not reuse plan URLs
2. Download fresh assets to `public/` before writing any code
3. Replace all Figma URLs in the plan with local `/public/` paths

### Asset Substitution Prohibition

**NEVER substitute a Figma image asset with any of the following** (see `.claude/rules/figma-asset-download.md` + `.claude/rules/no-lucide-icon-substitution.md`):

| Prohibited substitution        | Example (DO NOT do this)                                     |
| ------------------------------ | ------------------------------------------------------------ |
| HTML text characters           | `<`, `/`, `>` for a code-bracket icon                        |
| Hand-crafted inline SVG shapes | `<rect>` + `<path>` approximating a chat bubble illustration |
| CSS-only reconstructions       | `border-radius: 50%` for an orbit ellipse image              |
| Custom SVG path drawings       | `M16 2 L17.5 14...` for a sparkle that exists as an asset    |
| lucide-react glyph             | `<CircleCheck />` for a custom designed check icon           |

**Why:** Substitutions differ in visual weight, gradient detail, shape fidelity, and exact geometry. Even "simple" icons must be downloaded — the designer's intent is in the rendered file.

**Do not reuse existing `/public/` assets from a different Figma context.** The same SVG path can have completely different fill colors per context (e.g., white-filled bracket on dark background vs pink-gradient bracket on light background). Always download fresh for each context.

**Rule:** Every `<img src={imgX}>` / `<Image src={imgX}>` in the Figma output = one downloaded file in `public/{slug}/`. Audit before writing code:

```bash
# Count must match between Figma output const imgX lines and downloaded files
ls -1 public/{slug}/ | wc -l
```

If a URL fails to download (returns HTML error), it has expired — re-call `get_design_context` immediately. Do not fall back to substitution.

---

## Step F3. Sub-node Drill + Variant Sampling

**Do not skip.** Page-level frames (and dense variant components) are too large for a single `get_design_context` call — sections/variants must be drilled individually.

### F3a. Enumerate direct children

From the `get_metadata` result, extract all direct children of the root node:

| Node type                                   | Action                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| Data-bearing (list, grid, card group, form) | `get_design_context` individually                            |
| Complex layout (3+ nested levels)           | `get_design_context` individually                            |
| Variant component instance                  | enumerate all variant cells → `get_design_context` each cell |
| `type === "INSTANCE"`                       | candidate for component-reuse / Code Connect check           |
| Static / decorative (hero text, divider)    | re-use parent call result                                    |

Run all individual `get_design_context` calls in parallel.

### F3b. Variant matrix sampling

For any Component with Variants:

1. Identify all variant dimensions (e.g., `state × size × type`)
2. Call `get_design_context` on **every cell** of the matrix — not just the default
3. Record exact per-cell diffs (color changes, size changes, show/hide layers)

A symbol's name does not tell you which icon it is. `Icon_left=true` only means "icon on the left" — call `get_design_context` on the icon child to see the actual SVG.

Missing a variant cell = that state will not be implemented.

### F3c. Transform capture

For every node (including children):

- Record **exact rotation** in degrees (e.g., `-9.38°`, `+18.03°`) — never round
- Record negative scale (mirror transform)
- Group nodes sharing the same transform — they form a designer-intentional system

### F3d. Truncation recovery

If any `get_design_context` sub-call still appears truncated → call `get_metadata` on that sub-node, drill one level deeper. If `get_design_context` returns more than ~50 KB and MCP hands back a file path, run `grep + sort + uniq -c` on that file to find the most-used tokens instead of reading the whole thing.

### F3e. Visual content sizing within bounded containers

**Never derive rendered size from a page-level screenshot.** At 1920px artboard scale, the page thumbnail compresses all elements.

For any bounded container (card, tile, badge, panel) whose primary visual content is an illustration, icon group, SVG shape, or image:

1. Call `get_design_context` on the **container node directly**
2. Extract the content child's exact `width` and `height` in px
3. Compute fill ratio: `content_width / container_width`

| Fill ratio | Interpretation         | Action                                          |
| ---------- | ---------------------- | ----------------------------------------------- |
| > 0.5      | Primary visual element | Use exact pixel dimensions                      |
| 0.25–0.5   | Secondary decorative   | Use exact dimensions, verify against screenshot |
| < 0.25     | Accent/badge           | May approximate                                 |

### F3f. Recursive Component Instance Walk

After direct children are drilled, traverse each section's own metadata for nested instances.

For each section that returned `INSTANCE` children:

```bash
# Get children of each section node
get_metadata(sectionNodeId, fileKey)
```

For any nested `type === "INSTANCE"` node found:

| Node depth                 | Action                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| Depth 2 (inside a section) | `get_design_context` if not already covered by section drill      |
| Depth 3+                   | Sample one representative instance — note if it repeats a pattern |

**Completeness audit.** After all drills, print:

```
Components found: N (direct sections: A, nested instances: B, variant cells: C)
```

This number becomes the baseline for the component-reuse / sub-component check in the calling skill.
