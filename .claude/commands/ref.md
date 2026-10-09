---
description: Run the reference-backed-dev agent to attach trusted-source citations to a fix or explanation.
argument-hint: [question or task]
version: 1.0.0
---

Run the `reference-backed-dev` agent.

Process $ARGUMENTS.

## Examples

```
/ref login is not working, help me identify the cause
/ref improve accessToken refresh logic to be exp-claim based
/ref explain how SameSite=Lax defends against CSRF
/ref find documentation for staleTime 60-second setting rationale
```

Trust source priority, forbidden sources, link validation (mandatory: verify every URL before citing — discard 404/soft-404 and find an alternative page), and citation format: see `.claude/agents/reference-backed-dev.md`.
