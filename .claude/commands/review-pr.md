---
description: Review a PR — collect CodeRabbit comments with validity judgment, independent severity-rated review, integrated fix plan, and a recommended commit message.
argument-hint: [pr-number | pr-url]
version: 1.0.0
---

# /review-pr — PR Integrated Review Command

Target PR: `$ARGUMENTS` (number or URL).

Input a PR number or URL to handle the following in one step:
1. Collect CodeRabbit comments + **validity judgment**
2. Independent review of changed code + **severity classification**
3. Integrated fix plan
4. Recommended commit message

> This command outputs a plan only. Say "fix it" after confirming to execute the fixes.

## Usage

```
/review-pr <PR number>
/review-pr <GitHub PR URL>
```

---

## Execution Order

### Step 1 — Collect PR Metadata + Comments

```bash
# PR basic info
gh pr view <number> --json number,title,headRefName,baseRefName,additions,deletions,changedFiles

# Changed file list
gh pr diff <number> --name-only

# CodeRabbit review comments (inline)
gh api repos/{owner}/{repo}/pulls/<number>/comments \
  --jq '.[] | {path, line: .original_line, body, user: .user.login}'

# General reviews (overall comments)
gh pr view <number> --json reviews \
  --jq '.reviews[] | select(.author.login | test("coderabbitai")) | .body'
```

Auto-detect owner/repo with `gh repo view --json owner,name`.

---

### Step 2 — Read Changed Files

Read changed source files via `git diff origin/develop...HEAD -- <file>` or the Read tool.
Skip files inside `src/api/openapi/` — they are auto-generated.

---

### Step 3 — CodeRabbit Comment Validity Judgment

Judge each comment by the following criteria:

#### ✅ Accept — real issue, fix needed

| Condition | Example |
|-----------|---------|
| Runtime error possibility | Optional field not guarded, duplicate undefined key |
| Type safety violation | `as` assertion, missing `in` guard, `!` non-null assertion |
| Security vulnerability | XSS, unvalidated input, sensitive data exposure |
| CLAUDE.md explicit pattern violation | `onSettled` misuse, missing queryKey invalidation, `cn()` not used |
| Missing accessibility | clickable div/li without role/tabIndex/onKeyDown |
| Tailwind convention violation | arbitrary values (`p-[4px]`), base scale (`p-4`, `rounded-lg`) |
| Hardcoded color | `#181d27` → `text-text-strong`, etc. |

#### ⚠️ Conditional — decide after checking context

| Condition | Judgment basis |
|-----------|----------------|
| Performance optimization suggestion (useMemo/useCallback) | Decide after verifying actual render bottleneck |
| Code structure improvement (abstraction, separation) | Reject if reuse frequency is only once |
| Accessibility improvement (aria-label, etc.) | Check if already sufficient given UI context |

#### ❌ Reject — CodeRabbit misidentification, conflicts with this project's conventions

| Condition | Reason |
|-----------|--------|
| Custom tokens like `p-200`, `rounded-100` flagged as wrong values | Project-specific tokens, not Tailwind base scale — see `.claude/agents/tailwind-convention-reviewer.md` for full token list |
| Suggestion to modify `src/api/openapi/` files | Regenerated files, cannot be modified |
| Simple removal of type assertion `as` without providing alternative | Should replace with `in` guard pattern — simple removal causes compile errors |
| Variable name/file name casing change suggestion | Project convention (camelCase, kebab-case) already followed |
| Comments labeled `nitpick`/`style`/`cosmetic` | No impact on functionality/safety |
| Already intentional patterns (early return, guard clause) | Read code to understand intent before judging |

---

### Step 4 — Independent Code Review

Read the changed files directly to find issues **missed by both CodeRabbit and specialized agents** (`openapi-safety-reviewer`, `tanstack-query-reviewer`, `tailwind-convention-reviewer`).

> Items already covered by agents (optional field guards, useMutation callbacks, Tailwind conventions) — refer to agent results; do not duplicate checks here.

Only review areas agents don't cover:

- Returning `undefined` from server components (should use `notFound()` / `throw`)
- Missing error handling (mutation with no global handler and no `onError`)
- Wrong conditional branches or unhandled edge cases (goal achievement)
- Security: `dangerouslySetInnerHTML`, unvalidated user input, sensitive data exposure
- Duplicate logic (same or nearly identical code in 2+ places)
- Unused imports / unreachable code

---

### Step 5 — Integrated Issue List (by severity)

Combine CodeRabbit accepted items + independent review items and classify:

| Severity | Criteria |
|----------|---------|
| 🔴 CRITICAL | Security vulnerability, runtime crash, data loss |
| 🟠 HIGH | Type safety violation, useMutation misuse, missing queryKey, unguarded optional |
| 🟡 MEDIUM | Missing accessibility, Tailwind convention violation, hardcoded color |
| 🟢 LOW | Readability, dead code, duplicate removal |

---

### Step 6 — Write Fix Plan

Provide before/after code specifically for CRITICAL/HIGH (required) and MEDIUM (recommended).

**CodeRabbit suggestion policy:**
- Never copy CodeRabbit's suggested code verbatim without evaluation.
- Treat their suggestion as one candidate. Always check if a project-idiomatic alternative exists.
- If multiple approaches are viable, list them using headings (not a table) with reasoning for each, then state the chosen approach.

**Alternative comparison format** (use when 2+ viable approaches exist):

```
### [HIGH] foo.tsx:42 — unguarded optional key

**Before:**
  key={item.missionId}

#### Option A — index fallback (CodeRabbit suggestion)
  key={item.missionId ?? index}
  → Simplest. Safe when order is stable and missionId is a unique identifier.

#### Option B — filter before render
  {items.filter(item => item.missionId != null).map(item => <div key={item.missionId}>...)}
  → Eliminates undefined entries entirely. Use when undefined items should not render.

**Chosen: Option A** — missionId is always populated after the guard at the data-fetch layer; index fallback is sufficient.
```

If only one approach exists, skip the comparison and show a plain before/after.

LOW items are listed only in the "Notes" section. Before/after code not needed.

---

### Step 7 — Recommend Commit Message

Generate a commit message based on the main items in the fix plan.
Commit convention: `fix :` (mainly bug fixes) or `refactor :` (mainly convention cleanup).
Under 50 characters, Korean, "WHY"-focused.

Example:
```
fix : optional key 미가드 및 onSettled 콜백 오용 수정
```

---

## Output Format

```
## /review-pr #<number> — <PR title>

Branch: <head> → <base> | Changed files: N | CodeRabbit comments: N

---

## 1. CodeRabbit Validity Judgment

| # | Source | File:Line | Comment Summary | Verdict | Reason |
|---|--------|----------|----------------|---------|--------|
| 1 | CodeRabbit | foo.tsx:42 | unguarded optional key | ✅ Accept | undefined key → DOM reuse error |
| 2 | CodeRabbit | bar.tsx:15 | using p-4 | ✅ Accept | need project token p-200 |
| 3 | CodeRabbit | baz.tsx:88 | add useMemo | ⚠️ Conditional | render bottleneck unclear |
| 4 | CodeRabbit | qux.tsx:30 | rename variable | ❌ Reject | camelCase convention already followed |

---

## 2. Independent Review Findings

| # | File:Line | Issue | Severity |
|---|----------|-------|---------|
| A | hook.ts:88 | router.push in onSettled | 🟠 HIGH |

---

## 3. Integrated Issues (by severity)

### 🔴 CRITICAL
None

### 🟠 HIGH
| # | File:Line | Content | Source |
|---|----------|---------|--------|
| 1 | foo.tsx:42 | unguarded optional key | CodeRabbit |
| 2 | hook.ts:88 | onSettled callback misuse | Independent review |

### 🟡 MEDIUM
...

### 🟢 LOW (Notes)
...

---

## 4. Fix Plan

### [HIGH-1] foo.tsx:42 — unguarded optional key

**Before:**
  key={item.missionId}

#### Option A — index fallback (CodeRabbit suggestion)
  key={item.missionId ?? index}
  → Safe when missionId is unique; index prevents duplicate key on undefined.

#### Option B — filter undefined entries before render
  {items.filter(i => i.missionId != null).map(i => <div key={i.missionId}>...)}
  → Removes undefined items entirely. Only use if undefined items should not appear.

**Chosen: Option A** — items already guaranteed non-null by data-fetch guard; index fallback sufficient.

### [HIGH-2] hook.ts:88 — onSettled callback misuse
...

---

## 5. Recommended Commit Message

fix : optional key 미가드 및 onSettled 콜백 오용 수정

---

Ready to apply fixes?
- HIGH and above only: "fix HIGH"
- Including MEDIUM: "fix up to MEDIUM"
- All: "fix all"
```

---

## Fix Execution Steps (after user approval)

After the user approves the fix scope:

### 1. Full Pattern Scan

Before fixing each issue type, grep the entire `src/` to **check if the same pattern exists in other files**.
Fix discovered similar patterns together.

| Bug type | Scan method |
|---------|------------|
| Unguarded optional key | Search `key={item\.\w+}` pattern → verify if optional field |
| onSettled misuse | Search files containing `onSettled` → verify `router.push`/success toast |
| Missing queryKey invalidation | Check related query hooks in same domain → identify affected queryKeys |
| Hardcoded colors | Search `#[0-9a-fA-F]{3,6}` globally |
| Base Tailwind scale | Search classes like `p-4`, `rounded-lg`, `shadow-md` globally |
| Enum type assertion | Search `as [A-Z]\w+` pattern → find cases without `in` guard |

### 2. Execute Fixes

Fix in issue number order. Reference the patterns below.

### 3. Validate

```bash
yarn typecheck
yarn lint
```

### 4. Report Results

```
## Fix Complete
- [HIGH] foo.tsx:42 — unguarded optional key (+ bar.tsx:88 similar pattern fixed together)
- [MEDIUM] baz.tsx:15 — p-4 → p-200 token replacement

## Skipped
- qux.tsx:30 — camelCase convention already followed (CodeRabbit misidentification)
```

Fix principles:
- Never modify `src/api/openapi/` files (auto-generated)
- Do not improve code outside the planned scope
- Announce changes that alter behavior in advance

### 5. Suggest `/doc` after fix complete

Immediately after reporting fix results, adjust the recommendation strength by condition:

**When security/auth/performance-related fixes are included → strongly recommend:**
```
Fixes complete.
⚠️ Security/auth/performance changes are included. Strongly recommend running /doc.
→ Run "/doc" then add official doc citations with "/ref".
```

**Other general fixes → suggest:**
```
Fixes complete. Would you like to document these changes in docs/?
→ Run "/doc" to auto-generate documentation.
```

> **Note**: `/doc` analyzes committed changes via `git diff`. After fixing, first commit with `/commit`, then run `/doc` for accurate documentation.

---

## Fix Pattern Reference

### Optional field guard

```tsx
// ❌ risk of duplicate key
key={item.missionId}

// ✅ index fallback
key={item.missionId ?? index}

// ❌ non-null assertion
fn(item.id!)

// ✅ early return inside function
const handleClick = (id: number | undefined) => {
  if (!id) { showToast('정보를 불러올 수 없습니다.', 'error'); return; }
  router.push(`...?id=${id}`);
};
```

### Enum type assertion

```tsx
// ❌ risk of runtime undefined
const studyType = type as StudyType;

// ✅ in guard + fallback
const studyType = type && type in STUDY_TYPE_LABELS ? (type as StudyType) : undefined;
{studyType ? STUDY_TYPE_LABELS[studyType] : '스터디'}
```

### useMutation callback

```tsx
// ❌ success-only logic in onSettled
onSettled: () => { router.push('/list'); showToast('완료'); }

// ✅ role separation
onSuccess: () => { showToast('완료'); router.push('/list'); },
onError:   () => { showToast('실패', 'error'); },
onSettled: () => { setOpen(false); }, // UI cleanup only
```

### Color token / Tailwind scale replacement

For HEX → semantic token mapping, and base Tailwind scale → project token mapping,
see `.claude/agents/tailwind-convention-reviewer.md`.

---

## Notes

- Auto-detect repo owner/name with `gh` CLI. Ask user if detection fails.
- If no CodeRabbit comments, proceed with independent review only.
- For ambiguous judgments, mark as "⚠️ Conditional" and state the reasoning.
- Clearly explain rejected items — "why this comment doesn't apply to this project."
