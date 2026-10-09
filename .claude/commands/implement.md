---
description: Start implementation immediately, minimizing exploration. Enforces 3-file explore cap, API verification, and the lint/prettier/typecheck gate.
argument-hint: [what to implement]
version: 1.0.0
---

# /implement — Immediate Implementation Command

## Purpose
Minimize the exploration phase and start code implementation immediately.
Prevents the pattern of "spending the whole session just planning."

## Rules (always applied when this command runs)

1. **Max 3 file explorations.** Beyond that, read additional files only when needed during implementation.
2. **Verify API first.** Before implementing, always check for real APIs in:
   - `src/hooks/queries/` — TanStack Query hooks
   - `src/api/` — axios endpoints
   - `src/api/openapi/` — auto-generated types
   If not found, leave a TODO placeholder and inform the user.
3. **Begin implementation immediately after identifying the required files and API contracts.**
4. **Use `cn()`**, no Tailwind arbitrary values, use project tokens only.
5. After implementation, run in order — all must pass to be complete:
   - `yarn lint:fix`
   - `yarn prettier:fix`
   - `yarn typecheck`
6. When all three pass, suggest the next step:
   ```
   Implementation complete.
   - To commit: /commit
   - To create PR directly: /pr
   - Code review first: /review
   ```

## Usage

```
/implement <what to implement>
```

Example:
```
/implement group study review list page (under src/app/(service)/(my)/my-page/reviews/)
```

## Prompt Template

Implement $ARGUMENTS.

Rules:
- Max 3 file explorations. Implementation over exploration.
- Always verify API in src/hooks/queries/, src/api/, src/api/openapi/. If not found, leave TODO.
- Use cn() for className composition. No Tailwind arbitrary values.
- After implementation, run in order: yarn lint:fix → yarn prettier:fix → yarn typecheck.
- All three must pass to be complete. After passing, suggest next step from "/commit", "/pr", "/review". Start writing code now.
