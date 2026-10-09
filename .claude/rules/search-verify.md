# Search Verify — Read Before Concluding

When codegraph surfaces a file as a search result, **Read the file before drawing any conclusion.**

Never conclude "pattern absent" from a snippet alone. Snippets are excerpts — the target pattern may exist elsewhere in the same file.

## Rule

```
codegraph query / codegraph files → result includes a file → Read the file → then conclude
```

Never:
- Judge relevance from snippet only → skip Read → report conclusion
- Run a second search to "confirm" before reading the candidate file

## Why

`codegraph query "as never"` surfaced `parse-oauth-redirect-result.ts` with snippet `): never`.
Snippet looked like a return-type annotation, not a type assertion → skipped Read → ran broken fallback search → reported "없음" → was wrong.

The file contained 5 instances of `return undefined as never;`.

## Applied to

- "Does pattern X exist?" → Read every file codegraph surfaces, then conclude
- "Is this API used anywhere?" → Read callers codegraph returns, then conclude
- Any existence/absence claim based on search results
