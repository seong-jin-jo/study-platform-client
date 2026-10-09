---
description: Explain a framework concept with real code examples from this project. Use when asked what a library API does or how it is used here.
argument-hint: [concept] [--url <docs-url>]
version: 1.0.0
---

Explain the framework concept `$ARGUMENTS`, combined with actual code examples from this project.

## Execution Order

1. Receive the concept name as an argument (e.g., `staleTime`, `queryKey`, `useMutation`, `invalidateQueries`)
2. If `--url` option is provided, read that official documentation with WebFetch.
   If `--url` is not provided, infer the library from the concept name and auto-search official docs with WebSearch:

   | Concept keyword examples | Inferred library | Search query |
   |--------------------------|-----------------|--------------|
   | `staleTime`, `queryKey`, `useMutation`, `invalidateQueries` | TanStack Query | `"tanstack query {concept} docs site:tanstack.com"` |
   | `useState`, `useEffect`, `useRef`, `Suspense` | React | `"{concept} react docs site:react.dev"` |
   | `App Router`, `Server Component`, `middleware`, `layout` | Next.js | `"{concept} nextjs docs site:nextjs.org"` |
   | `generic`, `type guard`, `satisfies`, `infer` | TypeScript | `"{concept} typescript handbook site:typescriptlang.org"` |
   | `p-200`, `rounded-100`, `cn()`, `@theme` | Tailwind CSS | `"{concept} tailwindcss docs site:tailwindcss.com"` |
   | `useStore`, `create`, `persist` | Zustand | `"zustand {concept} docs site:zustand-demo.pmnd.rs"` |
   | `register`, `handleSubmit`, `useForm`, `Controller` | React Hook Form | `"react hook form {concept} site:react-hook-form.com"` |
   | `z.object`, `z.string`, `safeParse`, `refine` | Zod | `"zod {concept} site:zod.dev"` |

   If a keyword spans multiple libraries (e.g., `onError`), search TanStack Query first, then React.
   Extract the official docs URL from search results and read the relevant section with WebFetch.
3. Use Grep to search `src/hooks/queries/` and `src/features/` for actual usage examples of the concept.
4. Explain using the structure below:

```
## {concept name}

### 30-second summary
[One-sentence core definition]

### How it works
[Step-by-step explanation of how it operates. ASCII diagram if needed]

### Usage patterns in this project
[Actual code examples found in src/hooks/queries/ + explanation]

### Decision guide
[Rules for when to use what values/options]
```

## Examples

```
/explain staleTime
/explain queryKey
/explain useMutation
/explain invalidateQueries --url https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
/explain enabled
```

## Notes

- Explanation is possible without an official docs URL. Project code search alone provides sufficiently concrete explanation.
- Focus the explanation level on "how should I use this in this project?" Keep general theory brief, project application examples detailed.
- Also reference the TanStack Query patterns section in CLAUDE.md.
