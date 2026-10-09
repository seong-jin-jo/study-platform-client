---
description: Analyze current changes and generate a bugfix/feature doc under docs/. Use right after finishing a feature or bug fix.
argument-hint: [type]
version: 1.0.0
---

Analyze the current work's changes and generate a documentation file in the `docs/` folder.

## Execution Order

1. Run `git log develop..HEAD --oneline` and `git diff develop...HEAD` to analyze commit history and changes.
2. If an argument is provided, use that type; otherwise auto-detect from commit messages and code patterns (do not use branch name):
   - `fix:` commit messages / bug fix code patterns (modifying existing code, adding conditions) → **bugfix**
   - `feat:` commit messages / new file/component/hook patterns → **feature**
   - If mixed, use the type with more changes, or ask the user to re-enter as `/doc bugfix` or `/doc feature`
3. Fill in the 3-step structure below based on the changes, and create the file in `docs/`:
   - **1. Problem** — what problem/requirement existed (symptoms, root cause, background)
   - **2. Solution — how & why this approach** — chosen approach and reasoning, key code changes
   - **3. Result** — what changed after the fix/development (behavior changes, UX improvements, new capabilities)
4. **Feature Context outbound (if applicable).** If the changed files map to a feature with a Context Record (`docs/features/<slug>/context.md`), append the generated doc path to its section **6. Outbound Evidence** and add a `<date> | doc | <doc filename>` row to section **7. Changelog**. If none exists, skip silently — do not create one here.
5. Inform the user of the generated file path.

## File Naming Convention

- Bug fix: `docs/bugfix-{feature-name}.md`
- Feature development: `docs/feature-{feature-name}.md`
- `{feature-name}`: kebab-case name describing the change (e.g., `auth-hydration`, `study-filter`)

## Optional Arguments

- `/doc bugfix` — force bugfix documentation type
- `/doc feature` — force feature documentation type
- `/doc guide {topic}` — generate a guide document (`docs/{topic}-guide.md`)
  - Guide structure: **1. Overview** (what, why) → **2. Core Concepts** (terms, principles) → **3. Patterns in this project** (actual code examples) → **4. Decision Guide** (rules for when and how to use)
  - No template — write the 4-step structure directly

## Examples

```
/doc                        → auto-detect
/doc bugfix                 → bugfix documentation
/doc feature                → feature documentation
/doc guide tanstack-query   → create docs/tanstack-query-guide.md
```

## Notes

- If a file with the same name already exists, request confirmation before overwriting
- If there are no changes or type cannot be determined, ask the user to re-enter as `/doc bugfix` or `/doc feature`
- Documents should follow "WHY → HOW & WHY THIS → RESULT" flow, not "WHAT changed"

## Post-Generation Reference Link

After document generation, output the following message:

```
Document created: docs/<filename>.md

Add official references used in this change to the document?
→ Reply "yes" or run "/ref <topic>" to attach MDN/OWASP/official doc citations.
```

For security/auth/performance-related changes, strongly recommend running the `reference-backed-dev` agent immediately.
