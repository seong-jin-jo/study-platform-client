---
description: Run quality checks, generate a commit message, and commit in one step. Use to commit finished work without standalone lint/prettier cleanup commits.
version: 1.0.0
---

# /commit — Commit Command

Handles quality checks → commit message generation → commit execution in one step.
Structurally prevents the pattern of standalone "prettier fix" or "lint cleanup" commits.

## Execution Order

### Step 1 — Quality Checks

```bash
yarn lint:fix
yarn prettier:fix
```

If lint:fix or prettier:fix modified files:
- Report the list of modified files
- Include the modifications in staged files

Then run `yarn typecheck` — **skip only if the changes are purely UI/styling with zero TypeScript type modifications**.
If typecheck fails, **stop immediately** — fix type errors before proceeding with commit.

### Step 2 — Analyze Changes

```bash
git diff --staged
git diff HEAD  # if nothing is staged
```

If no staged files, suggest which changed files to stage.
However, **pre-exclude** these files from the suggestion list:
- `.env`, `.env.*` — credential risk
- `src/api/openapi/` — auto-generated files

```
No staged files found. Add the following files?
- src/components/foo.tsx
- src/hooks/useBar.ts
[Y/n]
```

### Step 2.5 — Group staged files when 3+ files are staged

When **3 or more files** are staged, do not commit them all at once.

**Grouping rules (apply in this priority order):**

1. **Config/rules** — `.claude/`, `CLAUDE.md`, `*.config.*`, `global.css` (token-only changes)
2. **Infrastructure** — `src/api/client/`, `src/lib/`, `src/config/`
3. **Types** — `src/types/`, `src/api/openapi/` (if present), `global.css` (token additions alongside type changes)
4. **API hooks** — `src/hooks/queries/`, `src/features/*/api/`
5. **Feature logic** — `src/features/*/model/`, `src/features/*/store/`
6. **UI — shared** — `src/components/common/`, `src/components/ui/`
7. **UI — page/feature** — `src/app/`, `src/components/pages/`, `src/features/*/components/`

**Dependency ordering**: always commit lower-numbered groups first (infra before hooks before UI).

**Grouping output format:**

```
Staged files detected (N files). Proposed commit groups:

  Group 1 (chore/infra): 2 files
    src/api/client/axios.ts
    src/config/query-client.ts

  Group 2 (types): 1 file
    src/types/api/course.types.ts

  Group 3 (feat/UI): 3 files
    src/app/(landing)/class/[id]/page.tsx
    src/app/(landing)/class/vibe-intro/home/page.tsx
    src/components/common/ui/button.tsx

Proceed with grouped commits? [Y/n]
```

- `Y` or Enter → commit each group sequentially (Step 3–4 per group)
- `n` → fall back to single commit for all staged files
- Edit group boundaries if user requests

### Step 3 — Generate Commit Message

For each group (or the single batch if not grouped), generate a commit message matching project conventions.

Commit type prefix rules:
- `fix :` — fix existing behavior, bug fixes
- `feat :` — add new feature
- `refactor :` — structural improvement without behavior change
- `style :` — CSS/Tailwind changes
- `chore :` — config, dependencies, type declarations
- `docs :` — documentation files only

When types are mixed within a group, use the dominant type. Add a subtitle when helpful:
```
fix : 비회원 미션 탭 접근 시 로그인 리다이렉트 방지
  └ openapi-safety-reviewer 지적 사항 반영
```

### Step 4 — Confirm and Execute Commit (per group)

For each group, show the proposed message and ask for confirmation:

```
[Group 1/3] Commit message:
  chore(api): v5 마이그레이션 - 구버전 호환 위해 인스턴스 분리

Proceed? [Y/n/edit]
```

- `Y` or Enter → execute commit, move to next group
- `n` → skip this group
- Other text → replace message with that text and re-confirm

## Usage

```
/commit                        → commit with staged changes
/commit "additional hint"      → include hint in message generation
```

## Notes

- Never use `--no-verify` (do not bypass pre-commit hooks)
- If `.env` or credential files are in staged, **warn and stop**
- If `src/api/openapi/` files are in staged, warn (auto-generated files)
- Files modified by lint:fix are included in the current commit, not split into a separate commit
- Never run `git push` without explicit user confirmation — commit is local-only
