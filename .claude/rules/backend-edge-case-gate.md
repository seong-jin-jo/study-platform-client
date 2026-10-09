# Backend Edge-Case Gate

A per-component checklist enforced **right after generation** and again **right before commit** by the `dev-start`, `design-to-dev`, and `extract-common-component` skills whenever the generated code consumes backend data. The goal is safe consumption of the backend contract for **every** edge case — loading, error, empty, 401, optional fields, unknown enums — not just the happy path.

**No new code or abstractions.** Every requirement below is satisfied by an existing project utility or rule. If a checklist item cannot be satisfied, **abort** and report to the user — do not ship happy-path-only JSX.

## Checklist

```
[ ] List render: every API-list .map() uses key={item.id ?? index}        (backend-data-safety.md)
[ ] BE enum render: `in` guard + fallback, never a bare `as Type`          (backend-data-safety.md)
[ ] Optional fields: `??` / optional chaining; handler guards on optional IDs
[ ] Every useQuery: loading + error + empty states rendered, not just data
[ ] Every useMutation: onError + onSettled; 401 → login modal; analyzeError used  (error-handling.md)
[ ] queryKey convention + `enabled` guard + staleTime 60s default          (api-patterns.md)
[ ] Forms: Zod schema + transformer (toXxxRequest / buildXxxDefaults), DTO imported  (schema-validation.md)
[ ] DTO cross-check: field names / types / optionality / enums vs live swagger; mismatch → abort  (api-live-schema-check.md)
[ ] OpenAPI consumption: createApiInstance() + unwrap data.content
```

## Reuse map (all already exist — do not reinvent)

| Need | Existing source |
|------|-----------------|
| Error classify + Sentry + Korean message | `src/utils/error-handler.ts` — `analyzeError()`, `sendErrorToSentry()`, `ErrorType`, 40+ codes |
| Optional `key` / enum `in` guard / optional-ID handler guard | `.claude/rules/backend-data-safety.md` |
| 401 → login modal, `MutationCache.onError` global net | `.claude/rules/error-handling.md` |
| Zod schema + transformer pattern | `.claude/rules/schema-validation.md`; example `src/types/schemas/interview.schema.ts` (`buildStudyReadyDefaults`) |
| TanStack query/mutation hook shape | `.claude/rules/api-patterns.md` |
| OpenAPI instance | `src/api/client/open-api-instance.ts` — `createApiInstance()` |
| Live schema delta check | `.claude/rules/api-live-schema-check.md` |

## Three-state rendering (the most-missed item)

Generated JSX must not render `data.map(...)` straight off a query. Every `useQuery` needs all three:

```tsx
const { data, isLoading, isError } = useGetThings(params);

if (isLoading) return <Skeleton />;          // loading
if (isError) return <ErrorState />;          // error — message via analyzeError if surfaced
if (!data?.length) return <EmptyState />;    // empty
return data.map((item, index) => <Row key={item.id ?? index} ... />);
```

## 401 login-modal note (current implementation)

`.claude/rules/error-handling.md` describes a **target** store pattern (`src/stores/use-login-modal-store.ts` → `.getState().open()`). That store does **not exist yet** — the login modal is currently component-level `useState` in `src/components/auth/modals/login-modal.tsx`.

Write the gate against the **current** implementation:
- If `use-login-modal-store.ts` exists → use `useLoginModalStore.getState().open()`.
- If it does **not** exist → use the component-level login-modal pattern already wired in the page/layout, or surface the 401 through the existing flow. Do not invent the store.

Re-check existence before recommending either path (`ls src/stores/use-login-modal-store.ts`).

## When the gate fails

| Failure | Action |
|---------|--------|
| DTO field/type/enum mismatch vs live swagger | **Abort** — report field-level diff, await user decision |
| Required hook does not exist | Leave `// TODO: API not found - <name>` + suggest `yarn generate:api <name>` or the `swagger-api-to-hook` skill; do not invent an endpoint |
| A checklist item structurally cannot be met | **Abort** — report which item and why |
