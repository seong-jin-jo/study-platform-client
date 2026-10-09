---
description: Inspect target code against 13 criteria and report only items needing improvement. Use to review changed files or a given path.
argument-hint: [file-path]
version: 1.0.0
---

Inspect the target code against 13 criteria and report only items that need improvement.
Run without arguments to auto-detect changed files in the current branch.
Use `/review <file-path>` to specify a particular file.

## Inspection Criteria

| # | Criterion | What to check |
|---|-----------|---------------|
| 1 | **Conciseness** | Can the same intent be expressed more briefly? Excessive abstraction, unnecessary wrapping, code that can be expressed directly without intermediate variables |
| 2 | **Potential bugs** | Points that could crash at runtime: missing optional chaining, array bounds, async race conditions, wrong dependency arrays, closure capture errors |
| 3 | **Goal achievement** | Does the code actually do what it's intended to do? Unhandled edge cases, wrong conditional branches, missing state initialization |
| 4 | **Security** | XSS (`dangerouslySetInnerHTML`), unvalidated user input, sensitive data exposure (`console.log`, URL params), missing auth/authorization |
| 5 | **Duplicate code** | Within the current review scope, does the same or nearly identical logic exist in 2+ places? Copy-paste patterns, repeated similar conditions |
| 6 | **Performance** | Unnecessary re-renders (inline object/function creation), excessive `useEffect`, missing caching, duplicate calculations inside loops |
| 7 | **Commonization** | Does the same pattern already exist in the entire codebase (`src/`)? Repeating patterns that can be extracted into shared utils/hooks/components (suggest only after confirming they actually exist) |
| 8 | **Dead code** | Unused imports, variables, types, commented-out code, unreachable branches |
| 9 | **Code smells** | Structural issue detection: God Component (200+ lines JSX or 3+ unrelated features), Props Drilling (3+ levels), Long Props List (7+ props with low cohesion), Feature Envy (directly manipulating other domain data), Data Clumps (always-together props without a dedicated type), Shotgun Surgery (3+ files must be modified for a feature change) |
| 10 | **Component interface** | Semantic alignment between component name and props: `Select` → `value` + `onChange`, `Input` → `value` + `onChange`, `Upload` → `onUpload`, event handlers use `onXxx` pattern, boolean props use `isXxx`/`hasXxx` prefix, controlled components have `value`+`onChange` pair, uncontrolled uses `defaultValue` |
| 11 | **Readability** | Can someone new to the code quickly understand the intent? Do variable/function names clearly convey their role? Magic numbers/unclear conditions, missing explanatory comments for complex logic, functions/blocks over 30 lines need single responsibility review |
| 12 | **Maintainability** | Is there a single point of change for the same feature (SSOT)? Same values/logic spread across multiple files, hardcoded config/magic constants/inline logic that cannot be injected externally, functions that are independently testable |
| 13 | **Extensibility** | Can new features be added with minimal changes to existing code (OCP)? Do hardcoded lists/branches require direct file modification when adding new items? Can config/strategies be injected from outside? |

## Execution Order

1. **Identify target files**
   - If argument provided, read that path with the Read tool
   - Otherwise, run `git diff --name-only HEAD` and select relevant source files

1-A. **Automatic agent delegation** (decide immediately after file classification)

   | Condition | Delegated Agent |
   |-----------|----------------|
   | Files in `src/hooks/queries/` path | Run `tanstack-query-reviewer` agent in parallel |
   | Files importing types from `src/api/openapi/` | Run `openapi-safety-reviewer` agent in parallel |
   | Files in `src/components/`, `src/features/`, `src/app/` containing `className` or `cn(` | Run `tailwind-convention-reviewer` agent in parallel |
   | Files matching `*study-card*`, `*StudyCard*`, or `src/components/home/card/`, `src/components/common/cards/`, `src/components/group-study/schedule/` | Run `study-card-safety-reviewer` agent in parallel |

   If multiple conditions match, run the corresponding agents simultaneously.

   **Agent result → severity conversion:**

   | Agent severity | review output section |
   |---------------|----------------------|
   | HIGH | 🔴 Fix immediately |
   | MEDIUM | 🟡 Improvement recommended |
   | LOW | 🟢 Note |

   Convert agent results using the above rules and merge with the 13-criteria results. If multiple agents report the same issue at the same file/line, use the higher severity and remove duplicates.

2. **Inspect against all 13 criteria in order**
   Scan through the code for each criterion and record problem points.
   If no issues, skip that criterion — **report only criteria with problems**.

3. **Output format**

```
## /review result — <filename>

### 🔴 Fix immediately (bugs/security)
- [Criterion] file:line — problem description → recommended fix direction

### 🟡 Improvement recommended (quality/performance)
- [Criterion] file:line — problem description → recommended fix direction

### 🟢 Note (commonization/conciseness)
- [Criterion] file:line — problem description → recommended fix direction

No issues: [list criteria with no problems]
```

4. **Confirm whether to fix**
   If there are 🔴 items (from 10 criteria or agent HIGH), ask "Fix these?"
   If the user agrees:
   1. Grep `src/` for the same pattern — if similar patterns found, fix together
   2. Implement the fix with minimal changes
   3. Validate with `yarn lint:fix && yarn prettier:fix && yarn typecheck`
   4. After fix completes, suggest "Would you like to document with /doc?"

## Examples

```
/review                                               → auto-detect changed files
/review src/components/common/modals/confirm-modal.tsx → specific file
/review src/hooks/queries/group-study-review-api.ts    → hook file
```


## Grep Patterns for Common Violations

Run on the specific files identified in Step 1 — **not** as codebase-wide sweeps (the codegraph-enforce hook blocks `-r` recursive grep; use single-file grep instead):

```bash
# Unguarded optional fields used as React keys
grep -n 'key={[a-zA-Z]*\.[a-zA-Z]*Id}' <file>

# Unsafe type assertions (as SomeType without in-guard)
grep -n ' as [A-Z][a-zA-Z]*[^,;)]' <file>

# Tailwind arbitrary px values
grep -n '\[[0-9]' <file>

# Zod schemas missing DTO import
grep -n "from '@/types/api/\|from '@/api/openapi/" <file>

# onSettled used for success-only actions
grep -A5 'onSettled' <file>
```

To find which files contain a pattern, use codegraph: `codegraph query "<symbol>"` or `codegraph files | grep <keyword>`.

## Notes

- Do not output criteria with no issues — do not list all criteria
- Fix suggestions follow existing code style and project conventions (Tailwind custom tokens, queryKey factory, etc.)
- Commonization suggestions are only made when similar patterns actually exist in the codebase
- Reference OWASP Top 10 for security checks
- Modifications that change behavior must be announced and confirmed with the user first
- The 3 review agents (mutation-pattern-reviewer, openapi-safety-reviewer, tailwind-convention-reviewer) run automatically — their output is merged into the final result
- `reference-backed-dev` is NOT auto-triggered from `/review` — it activates separately for security/auth/performance changes via `/ref` or after `/doc`
