#!/usr/bin/env python3
"""Print deterministic examples using the real renderer."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ats_demo_statusline", ROOT / "src" / "statusline.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the status-line renderer.")
statusline = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = statusline
SPEC.loader.exec_module(statusline)


def show(label: str, identity, **environment: str) -> None:
    values = dict(os.environ)
    values.update({"ATS_MACHINE": "snowy-atlas", "COLUMNS": "96"})
    values.update(environment)
    print(f"{label:<12} {statusline.render(identity, values)}")


def main() -> int:
    repo = statusline.StatusIdentity(
        cwd="/home/demo/projects/agent-terminal-status",
        path="agent-terminal-status",
        branch="main",
        machine="snowy-atlas",
    )
    nested = statusline.StatusIdentity(
        cwd="/home/demo/projects/agent-terminal-status/docs/research",
        path="agent-terminal-status/docs/research",
        branch="feature/identity",
        machine="snowy-atlas",
    )
    detached = statusline.StatusIdentity(
        cwd="/home/demo/projects/agent-terminal-status",
        path="agent-terminal-status",
        branch="detached@3f21a7c",
        machine="snowy-atlas",
    )
    non_git = statusline.StatusIdentity(
        cwd="/home/demo/scratch/notes",
        path="~/scratch/notes",
        branch=None,
        machine="snowy-atlas",
    )

    show("repository", repo)
    show("nested cwd", nested)
    show("detached", detached)
    show("non-Git", non_git)
    show("narrow", nested, COLUMNS="36")
    show("ASCII", repo, ATS_ASCII="1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
