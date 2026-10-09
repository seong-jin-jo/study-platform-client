"""PreToolUse hook: force code discovery through the codegraph CLI.

Two enforcement branches, both scoped to CLAUDE_PROJECT_DIR (the mono root when
opened there, so client + mvp backend are both covered). Empty env var =>
fail open (everything passes through).

1. Grep / Glob TOOL  -> denied when their path/cwd is inside scope.
2. Bash COMMAND      -> denied only for clear discovery sweeps in scope:
     - ripgrep (`rg ...`, recurses by default)
     - recursive grep (`grep -r` / `-R` / `--recursive`)
     - file-name find (`find ... -name/-iname/-path/-regex`)
   Allowed (NOT a sweep): piped grep (`codegraph files | grep x` — the grep is
   after `|`, a stdin filter), and plain single-file grep (`grep p file`).
"""
import json
import os
import re
import sys

SCOPE_PREFIX = os.environ.get("CLAUDE_PROJECT_DIR", "")

TOOL_REASON = (
    "Grep/Glob are disabled in study-platform. Use the codegraph CLI for "
    "discovery instead:\n"
    '  codegraph query "<symbol>"          # find a symbol/definition\n'
    "  codegraph files | grep <keyword>     # list files (pipe grep is fine)\n"
    '  codegraph callers "<symbol>"         # who calls it\n'
    '  codegraph callees "<symbol>"         # what it calls\n'
    '  codegraph impact "<symbol>"          # blast radius\n'
    "Reading a known file with the Read tool is allowed; piping CLI output "
    "through grep in Bash is allowed (that is not the Grep tool)."
)

BASH_REASON = (
    "Recursive grep / ripgrep / find sweeps are disabled in study-platform. "
    "Use the codegraph CLI for discovery:\n"
    '  codegraph query "<symbol>"           # find a symbol/definition\n'
    "  codegraph files | grep <keyword>      # list files (pipe grep is fine)\n"
    '  codegraph callers/callees "<symbol>"  # call graph\n'
    "Allowed: piping codegraph/other output through grep (`... | grep x`), "
    "and plain single-file grep (`grep pattern file`)."
)


def deny(reason: str) -> int:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            }
        )
    )
    return 0


# Each pattern marks a recursive / filesystem-wide discovery sweep. Short single
# -file grep (`grep p file`) and pipe-grep (`... | grep x`) are NOT here — they
# stay allowed. Tested against the matrix in this hook's verification block.
SWEEP_PATTERNS = (
    # ripgrep & drop-in equivalents — all recurse the cwd by default
    r"(^|\s)(rg|ag|ack|ugrep)(\s|$)",
    # git grep — recursive by default, no -r needed
    r"(^|\s)git\s+grep\b",
    # recursive grep: short bundle containing r/R (-r, -rn, -nr, -R) OR --recursive
    r"(^|\s)grep\b[^|]*(\s-[a-zA-Z]*[rR]|\s--recursive)",
    # file-name find
    r"(^|\s)find\s.*-(?:i?name|path|regex)\b",
    # fd — recursive find by default
    r"(^|\s)fd(\s|$)",
)


def is_sweep(primary: str) -> bool:
    """True if the primary command is a recursive discovery sweep."""
    return any(re.search(p, primary) for p in SWEEP_PATTERNS)


# A filesystem walker (`find`/`fd`/`ls -R`) piped into grep/rg/xargs-grep is a
# discovery sweep even though pipe-grep is normally allowed — here the producer
# walks the tree, not codegraph. `codegraph files | grep` is unaffected (its
# producer is codegraph), and a bare `find -type f` (no grep consumer) too.
_WALK_PRODUCER = re.compile(r"(^|\s)(find|fd)(\s|$)|(^|\s)ls\s+-[a-zA-Z]*R")
_PIPED_GREPPER = re.compile(r"\|\s*(xargs\s+(-\S+\s+)*)?(grep|egrep|fgrep|rg)\b")


def is_piped_walk_grep(command: str) -> bool:
    """True if a tree walker feeds a piped grep across the whole command."""
    return bool(_WALK_PRODUCER.search(command) and _PIPED_GREPPER.search(command))


def main() -> int:
    if not SCOPE_PREFIX:
        return 0

    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input") or {}
    cwd = data.get("cwd") or ""

    if tool_name in ("Grep", "Glob"):
        target = tool_input.get("path") or cwd or ""
        if str(target).startswith(SCOPE_PREFIX):
            return deny(TOOL_REASON)
        return 0

    if tool_name == "Bash":
        command = tool_input.get("command") or ""
        # Enforce when working inside scope, or when an in-scope path is named.
        if not str(cwd).startswith(SCOPE_PREFIX) and SCOPE_PREFIX not in command:
            return 0
        primary = command.split("|", 1)[0]  # pipe-grep is a stdin filter — allow
        if is_sweep(primary) or is_piped_walk_grep(command):
            return deny(BASH_REASON)
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
