---
description: Chain quality checks, browser verify, commit, and doc in one pipeline. Use to finalize a completed feature end to end.
version: 1.0.0
---

# /ship — Feature Complete Pipeline

Chains quality checks → browser verify → commit → doc in one step.
Replaces the manual "lint:fix → prettier:fix → typecheck → 크롬 확인 → /commit → /doc" sequence.

## Execution Order

### Step 1 — Quality Checks

```bash
yarn lint:fix
yarn prettier:fix
```

Report any files modified by the above. Then:

```bash
yarn typecheck
```

If typecheck fails → **stop immediately**. Fix type errors before continuing.
Skip typecheck only for pure CSS/Tailwind changes with zero TypeScript modifications.

### Step 2 — Browser Verify (conditional)

Inspect `git diff HEAD --name-only` (or staged files) for UI-touching changes:
- Any file under `src/components/`, `src/app/`, `src/features/` with `.tsx` extension → **UI change detected**.

If UI change detected, ask:

```
UI changes detected. Verify in Chrome before committing? [Y/n]
```

- `Y` or Enter → invoke `staging-verify` skill targeting localhost:3000 for the changed pages.
- `n` → skip browser verify.

If no UI changes → skip this step silently.

### Step 3 — Commit

Follow the same logic as `/commit`:

1. Check staged files. If none, auto-stage changed files (excluding `.env*`, `src/api/openapi/`).
2. Generate a commit message following project convention:
   - `feat :` / `fix :` / `refactor :` / `style :` / `chore :` / `docs :`
   - Korean summary under 50 chars, WHY-focused.
3. Show message and confirm:
   ```
   Commit message:
     feat : 스터디카드 enum 가드 적용

   Proceed? [Y/n/edit]
   ```
4. Execute commit (never `--no-verify`).

### Step 4 — Documentation

Run `/doc` logic automatically:
- Analyze commit messages and diffs to determine type (bugfix / feature).
- Generate `docs/bugfix-{name}.md` or `docs/feature-{name}.md`.
- Print: `Document created: docs/<filename>.md`

After doc creation, output:
```
Add official references to the document?
→ Reply "yes" or run "/ref <topic>"
```

## Optional Arguments

- `/ship "hint"` — pass hint to commit message generation
- `/ship --no-verify-ui` — skip Step 2 browser verify entirely; when used, add reason to commit body (e.g. `no-ui: 인터랙션 없는 레이아웃 변경`)
- `/ship --no-doc` — skip Step 4 documentation

## Full Success Output

```
✓ lint:fix — 2 files fixed
✓ prettier:fix — clean
✓ typecheck — no errors
✓ browser verify — /home desktop+mobile OK
✓ committed: feat : 스터디카드 enum 가드 적용
✓ docs/feature-study-card-enum-guard.md created
```

## Notes

- Never use `--no-verify` on commit.
- If commit fails due to a pre-commit hook error, fix the issue and re-run `/ship` — do not amend.
- `/ship` does **not** create a PR. Run `/pr` separately after `/ship`.
