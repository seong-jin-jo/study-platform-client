# Figma Asset Download (Images & Fonts)

When a Figma node contains a raster image, vector graphic, icon, or a **custom (non-system) font**, the asset must be **downloaded from the real source first** and used verbatim. Never recreate, trace, approximate, or substitute it in code.

## Why this rule exists

Recreating an asset in code instead of downloading the real file is the single most expensive class of Figma-implementation bug, because it fails *silently*:

- A hand-redrawn SVG (re-traced path, simplified curve) looks "close" in a screenshot but loses seams, stroke texture, and exact geometry. CSS tweaks (rotation, inset, scale) then get stacked on top to "fix" the mismatch — band-aids over a wrong source file. The cause is upstream; no geometry tweak resolves it.
- A substituted font (nearest Google Font, system fallback) shifts metrics, weight, and letterform — invisible until compared side-by-side with the design.
- `preserveAspectRatio="none"` + a non-square viewBox in a square container distorts with no error and no review signal.

The fix is always the same: **get the real asset, drop it in, use it as-is.** Decide geometry only after the correct file renders.

## Trigger — load this rule when ANY of these is detected

- `get_design_context` / `get_metadata` response references an image fill, exported asset URL (`figma.com/api/mcp/asset/...`), or vector/boolean node intended as a graphic.
- A node uses a font family that is **not** a guaranteed system font (i.e. a custom/brand/display font — e.g. `Corinthia`, `Pretendard`, any foundry font).
- The user provides a downloaded asset path (`.svg`, `.png`, `.woff2`, `.otf`, `.ttf`) and asks to "use this".
- A previously-rendered asset looks wrong/simplified vs the design (suspect a recreated or stale file before touching CSS).

If none of these apply (pure layout, color tokens, system fonts only), this rule does not apply — skip it.

## Procedure — download BEFORE writing render code

### Images / SVG / icons

1. In the current MCP session, call `get_screenshot` (or read the asset URL from `get_design_context`) for the specific child node — asset URLs are session-scoped and expire, so fetch fresh, never reuse a URL from a plan file.
2. Download immediately into `public/{route-slug}/`:
   ```bash
   curl -s -o "public/{route-slug}/{name}.svg" "<current-session-asset-url>"
   file "public/{route-slug}/{name}.svg"   # MUST say SVG/PNG, not HTML (HTML = expired/failed)
   ```
3. For SVG, before referencing it, verify the header per `svg-assets.md`: check `viewBox` ratio and `preserveAspectRatio`. A non-square viewBox + `preserveAspectRatio="none"` in a square container is a distortion trap — fix the container or the file, do not ship it.
4. Reference the real file (`<Image src="/{route-slug}/{name}.svg">` or inline `<svg>`). Do not redraw the path by hand.

### Custom fonts

1. Identify the exact font family + weights + styles from the Figma node (do not assume — read every weight/style used).
2. Obtain the real font file(s) — `.woff2` preferred. Get them from the design handoff / foundry / the project's existing font directory. Never silently swap in a "close enough" Google/system font.
3. Place under the project's font location (`public/fonts/` or the established path) and wire via `next/font/local` (or the existing font-loading mechanism), not a CDN guess.
4. If the real font file cannot be obtained, **stop and ask the user** — leave a `TODO` and report. Do not pick a substitute font on your own.

## Hard prohibitions

- Do **not** re-trace or hand-author an SVG path to imitate a Figma vector when an exportable asset exists.
- Do **not** substitute a custom/brand font with a system or Google font without explicit user approval.
- Do **not** reuse asset URLs from a plan or prior session (they expire — see `figma-pre-code-gate.md` Gate D).
- Do **not** stack CSS transforms (rotate/scale/negative-inset) to compensate for a wrong or recreated asset. Replace the asset instead.
- Do **not** mark the task complete until the **real** asset renders — bust the `next/image` cache with a cache-ignoring reload when verifying, since it keys on src URL and serves stale optimized copies.

## Relationship to other rules

- `svg-assets.md` — `preserveAspectRatio` / viewBox checks for any SVG (run after download).
- `no-lucide-icon-substitution.md` — sibling rule: don't swap a custom Figma icon for a lucide glyph.
- `figma-pre-code-gate.md` — Gate D (asset URL lifetime) and the download-before-coding gate.
- `figma-design.md` — Step 5 (download assets immediately) in the inspection pass.

## Triggering Conditions

Apply whenever an image/graphic asset or a custom font is detected in a Figma node, or when the user hands over an asset file to use. Does not apply to layout-only / color-token-only / system-font-only work.
