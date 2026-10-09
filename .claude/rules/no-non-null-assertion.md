# No Non-Null Assertion Operator (`!`)

Avoid `!` in application code. It silences TypeScript without adding any runtime safety.

## Why

`value!` tells the compiler "trust me, this is never null/undefined" — but if that assumption is wrong, the runtime crash is silent and hard to trace. It's the TypeScript equivalent of a `// TODO: fix this`.

## Fix patterns instead

| Situation | Instead of | Use |
|---|---|---|
| Optional chaining | `obj.a!.b` | `obj.a?.b` with null handling |
| Array result | `arr.find(...)!` | explicit check + early return/throw |
| DOM query | `document.querySelector(...)!` | guard: `const el = ...; if (!el) return;` |
| Conditional render | `data!.field` | `data?.field` or render only when `data` is defined |

## The one accepted exception: OpenAPI `queryFn` content

OpenAPI codegen marks response `content` as optional (`content?: T`) even when the backend always populates it on 2xx. The `@tanstack/query/no-void-query-fn` ESLint rule blocks `queryFn` returning `T | undefined`, and `?? null` cascades `null` into caller types.

In **queryFn only**, `return data.content!;` is acceptable when:
1. The field is `content` on a successful API response wrapper
2. The optional typing is a codegen artifact, not a real backend behavior
3. No `eslint-disable` comment is added (the `!` itself is the signal)

Do not use `!` in mutations, components, or utility functions.
