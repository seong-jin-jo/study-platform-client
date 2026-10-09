---
description: Analyze the current branch's changes and open a GitHub PR targeting develop. Use when a branch is ready for review.
version: 1.0.0
---

Analyze the current branch's changes and create a GitHub PR targeting the `develop` branch.

## Execution Order

1. Run `git log develop..HEAD --oneline` to get the commit list.
2. Run `git diff develop...HEAD --stat` to identify changed files.
3. Run `git diff develop...HEAD` to read the full raw diff.
4. Derive Problem/Solution **only from what is observable in the diff and commit messages**. Never infer intent beyond what the code change directly shows.
5. Write the PR title and body, then create the PR with `gh pr create`.

## PR Title Rules

- Summarize the key changes in under 50 characters without a prefix (Korean)
- Format: `<key change summary>`

## PR Body Structure

```markdown
## Problem
<!-- What issue/limitation existed before this PR (the "why" this PR is needed) -->

## Solution
<!-- How it was resolved and why this approach was chosen -->

## Changes

### Features (only when new features exist)
| File | Description |

### Bug Fixes (only when bug fixes exist)
| File | Description |

## Result
<!-- What changed from user/developer perspective after the fix -->

## Screenshots (only when UI changes exist)
| Before | After |
|--------|-------|
| -      | -     |

## Breaking Changes (only when breaking changes exist)
- Breaking change description

## Test plan

- [ ] Verification item 1
- [ ] Verification item 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Section Rules

- **Problem**: Ground in the diff — describe what the code shows was missing, broken, or absent before. Quote specific file names or prior behavior visible in the removed lines. Do not speculate about causes not evidenced by the diff.
- **Solution**: Describe what was actually changed (added/removed/modified) and why, as directly readable from the diff. Do not add reasoning or alternatives that are not evident from the code change itself.
- **Result**: Describe observable changes — UX changes, behavioral changes, or what is now possible.
- **Screenshots**: Include only when the PR contains visual/layout changes. Use a Before/After table.
- **Breaking Changes**: Include only when API interfaces, store shapes, or shared contracts change in a way that affects other areas.
- **Changes table**: Include only the sections that apply (Features, Bug Fixes). Omit empty sections.
- If a commit message references an issue number, append `Closes #<number>` after the Test plan.
- **Do not fabricate**: If the diff alone does not make the intent clear, write only what can be directly observed. Leave a `<!-- TODO: fill in context -->` placeholder rather than inventing a narrative.

## gh Command

```bash
gh pr create \
  --base develop \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body>
EOF
)"
```

## Notes

- Base branch is always `develop` (not main)
- If there are uncommitted changes, inform the user in advance
- Derive test plan items directly from the changes — identify cases that need verification
- Output the PR URL after creation

## Examples

```
/pr                             → auto-create PR targeting develop
/pr "non-member access related" → reflect the hint in the title
```
