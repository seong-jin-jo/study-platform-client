# `.claude/rules/`

Project-local context files loaded raw into Claude Code via `@` references
(see `CLAUDE.md`). Each rule is plain Markdown — the whole body becomes session
context.

## No frontmatter on rules

Rules intentionally carry **no YAML frontmatter**. Claude Code has no official
frontmatter spec for rule files (only skills and commands do), and because rules
are `@`-loaded raw, any YAML block would only add per-session context tokens with
zero functional benefit. Keep rules as pure Markdown.

`figma-verification.md` is retained but self-marked `DEPRECATED` in favor of
`figma-visual-verify.md`; kept for its Path B fallback protocol.

## Versioning: skills & commands only

`version` is **not** an official Claude Code frontmatter field — it is a harmless
repo-local metadata convention, kept only on versioned artifacts:

- **Skills** (`.claude/skills/*/SKILL.md`) and **commands** (`.claude/commands/*.md`)
  carry `version: X.Y.Z` (no `v` prefix). Baseline is `1.0.0`; bump one patch when
  an artifact's file is actually modified, none when it stays byte-identical.
- **Rules** carry no version — they are unversioned project-local context.
- The `v`-prefixed form (`v1.0.0`) is reserved for production release records
  (`docs/ops/version-management.md`), a separate concern from these internal
  metadata versions.

Symlinked `next-*` skills point at upstream `.agents/skills/` and are out of
scope — do not add versions or edit them here.

## Rolling back a skill or command

Skills and commands are git-committed, so git history is the restore mechanism —
the `version:` frontmatter is only a change *marker*, not a lookup key (it is not
tied to a git tag). To roll one artifact back to a prior state:

```bash
# find the sha that last had the version you want
git log --oneline -- .claude/skills/<name>/SKILL.md

# restore that file to the chosen sha (staged, not committed)
git checkout <sha> -- .claude/skills/<name>/SKILL.md
```

Same for commands (`.claude/commands/<name>.md`). Because each artifact is a
single self-contained file, a per-file `checkout` rolls back exactly one skill
without touching the rest. Bump the `version:` back down only if the restore is
meant to be the new canonical state; leave it if you are just inspecting an old
revision.
