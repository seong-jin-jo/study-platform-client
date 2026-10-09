"""SessionStart hook: warn (never block) about codegraph index readiness.

Discovery enforcement (codegraph-enforce.py) only helps if the codegraph CLI is
installed and each repo's `.codegraph/codegraph.db` exists and is reasonably
fresh. This hook surfaces that state as SessionStart `additionalContext` so a
missing CLI / missing index / stale index is visible instead of silently
forcing grep-denied sessions into a dead end.

Non-destructive: emits warnings only, never denies. Empty output => all good.
"""
import json
import os
import shutil
import subprocess


def emit(context: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": context,
                }
            }
        )
    )


def main() -> int:
    root = os.environ.get("CLAUDE_PROJECT_DIR", "")
    if not root:
        return 0

    if shutil.which("codegraph") is None:
        emit(
            "[codegraph] CLI not installed. Grep/Glob/Bash discovery sweeps are "
            "force-denied in this repo, but codegraph cannot serve as the "
            "replacement until installed. Set it up:\n"
            "  npm i -g @colbymchenry/codegraph\n"
            "  cd <repo> && codegraph sync   # build the index (per repo)\n"
            "Details: .claude/rules/codegraph-usage.md (Onboarding section)."
        )
        return 0

    warnings = []
    candidates = [
        root,
        os.path.join(root, "study-platform-client"),
        os.path.join(root, "study-platform-mvp"),
    ]
    statuses = []
    for d in candidates:
        cg_dir = os.path.join(d, ".codegraph")
        db = os.path.join(cg_dir, "codegraph.db")
        if not os.path.isdir(cg_dir):
            continue
        if not os.path.isfile(db):
            warnings.append(
                f"{os.path.basename(d) or d}: .codegraph/ exists but no "
                "codegraph.db — run `codegraph sync` in that directory."
            )
            continue
        try:
            out = subprocess.run(
                ["codegraph", "status"],
                cwd=d,
                capture_output=True,
                text=True,
                timeout=5,
            )
            text = (out.stdout or out.stderr or "").strip()
            if text:
                statuses.append(f"{os.path.basename(d) or d}:\n{text}")
        except Exception:
            warnings.append(
                f"{os.path.basename(d) or d}: `codegraph status` failed/timed "
                "out — index may be unhealthy."
            )

    parts = []
    if warnings:
        parts.append("[codegraph] index warnings:\n- " + "\n- ".join(warnings))
    if statuses:
        parts.append("[codegraph] index status:\n" + "\n\n".join(statuses))

    if parts:
        emit("\n\n".join(parts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
