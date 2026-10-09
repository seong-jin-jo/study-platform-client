# MCP Servers — study-platform-client

`.mcp.json` registrations and why each exists. Scope note: the mono root also has its own `.mcp.json` (codegraph + context7); when a session opens inside `study-platform-client/`, **this repo's `.mcp.json` is the one loaded** — the two files are per-scope, not duplicates.

| Server | Transport | Purpose |
|---|---|---|
| `codegraph` | stdio (`codegraph serve --mcp`) | Semantic code index — mandatory discovery path (see `.claude/rules/codegraph-usage.md`). Requires the global codegraph CLI + a local `.codegraph/` index (`codegraph sync`). |
| `context7` | http `mcp.context7.com` | Live library/framework docs lookup. |
