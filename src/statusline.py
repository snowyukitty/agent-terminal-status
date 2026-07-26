#!/usr/bin/env python3
"""Quiet workspace identity status line for terminal coding agents."""

from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Optional

VERSION = "0.1.0"
DEFAULT_MAX_WIDTH = 96
DEFAULT_GIT_TIMEOUT_MS = 150


@dataclass(frozen=True)
class GitIdentity:
    root: str
    branch: Optional[str]


@dataclass(frozen=True)
class StatusIdentity:
    cwd: str
    path: str
    branch: Optional[str]
    machine: str


def _safe_cwd() -> str:
    try:
        return os.getcwd()
    except OSError:
        return str(Path.home())


def parse_payload(payload: str, fallback_cwd: Optional[str] = None) -> tuple[dict, str]:
    """Return parsed Claude status data and its best current-directory value."""
    data: dict = {}
    if payload.strip():
        try:
            candidate = json.loads(payload)
            if isinstance(candidate, dict):
                data = candidate
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    workspace = data.get("workspace")
    if not isinstance(workspace, dict):
        workspace = {}

    candidates = (
        workspace.get("current_dir"),
        data.get("cwd"),
        workspace.get("project_dir"),
        fallback_cwd,
        _safe_cwd(),
    )
    cwd = next(
        (str(value) for value in candidates if isinstance(value, (str, os.PathLike)) and str(value)),
        ".",
    )
    return data, cwd


def _slash_path(value: str) -> str:
    normalized = value.replace("\\", "/")
    if normalized.startswith("//"):
        prefix = "//"
        normalized = prefix + re.sub(r"/+", "/", normalized[2:])
    else:
        normalized = re.sub(r"/+", "/", normalized)

    if normalized not in ("/", "//") and not re.fullmatch(r"[A-Za-z]:/", normalized):
        normalized = normalized.rstrip("/")
    return normalized or "/"


def _case_insensitive_path(value: str) -> bool:
    return os.name == "nt" or bool(re.match(r"^[A-Za-z]:/", value)) or value.startswith("//")


def _relative_child(child: str, parent: str) -> Optional[str]:
    child_value = _slash_path(child)
    parent_value = _slash_path(parent)
    comparison_child = child_value.casefold() if _case_insensitive_path(child_value) else child_value
    comparison_parent = parent_value.casefold() if _case_insensitive_path(parent_value) else parent_value

    if comparison_child == comparison_parent:
        return ""

    prefix = comparison_parent.rstrip("/") + "/"
    if comparison_child.startswith(prefix):
        return child_value[len(parent_value.rstrip("/")) + 1 :]
    return None


def _git_timeout_ms(env: Mapping[str, str]) -> int:
    try:
        value = int(env.get("ATS_GIT_TIMEOUT_MS", str(DEFAULT_GIT_TIMEOUT_MS)))
    except (TypeError, ValueError):
        value = DEFAULT_GIT_TIMEOUT_MS
    return max(25, min(value, 2_000))


def _run_git(
    git: str,
    cwd: str,
    arguments: list[str],
    env: Mapping[str, str],
) -> Optional[subprocess.CompletedProcess[str]]:
    process_env = dict(env)
    process_env["GIT_OPTIONAL_LOCKS"] = "0"
    command = [git, "-c", "core.quotepath=false", "-C", cwd, *arguments]
    try:
        return subprocess.run(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=_git_timeout_ms(env) / 1_000,
            check=False,
            env=process_env,
        )
    except (OSError, subprocess.SubprocessError):
        return None


def collect_git(cwd: str, env: Optional[Mapping[str, str]] = None) -> Optional[GitIdentity]:
    """Collect repository root and branch without reading worktree state."""
    environment = os.environ if env is None else env
    git = shutil.which("git", path=environment.get("PATH"))
    if not git:
        return None

    probe = _run_git(
        git,
        cwd,
        ["rev-parse", "--show-toplevel", "--symbolic-full-name", "HEAD"],
        environment,
    )
    if probe is None:
        return None

    lines = [line.strip() for line in probe.stdout.splitlines() if line.strip()]
    if not lines:
        return None

    root = lines[0]
    if not (root.startswith("/") or re.match(r"^[A-Za-z]:[/\\]", root) or root.startswith("\\\\")):
        return None

    ref = lines[1] if len(lines) > 1 else ""
    if ref.startswith("refs/heads/"):
        return GitIdentity(root=root, branch=ref[len("refs/heads/") :])

    symbolic = _run_git(git, cwd, ["symbolic-ref", "--quiet", "--short", "HEAD"], environment)
    if symbolic and symbolic.returncode == 0 and symbolic.stdout.strip():
        return GitIdentity(root=root, branch=symbolic.stdout.strip())

    commit = _run_git(git, cwd, ["rev-parse", "--short=7", "HEAD"], environment)
    if commit and commit.returncode == 0 and commit.stdout.strip():
        return GitIdentity(root=root, branch=f"detached@{commit.stdout.strip()}")

    return GitIdentity(root=root, branch=None)


def _home_path(env: Mapping[str, str], path: str = "") -> str:
    normalized = _slash_path(path)
    if bool(re.match(r"^[A-Za-z]:/", normalized)) or normalized.startswith("//"):
        return env.get("USERPROFILE") or env.get("HOME") or str(Path.home())
    return env.get("HOME") or env.get("USERPROFILE") or str(Path.home())


def display_path(
    cwd: str,
    git: Optional[GitIdentity],
    style: str = "context",
    env: Optional[Mapping[str, str]] = None,
) -> str:
    """Format cwd as repo-relative context, a home-relative full path, or a leaf."""
    environment = os.environ if env is None else env
    normalized_cwd = _slash_path(cwd)
    normalized_style = style.strip().lower()

    if normalized_style == "name":
        leaf = normalized_cwd.rstrip("/").split("/")[-1]
        return leaf or normalized_cwd

    if normalized_style == "context" and git:
        relative = _relative_child(normalized_cwd, git.root)
        if relative is not None:
            root_name = _slash_path(git.root).rstrip("/").split("/")[-1]
            if not root_name:
                root_name = _slash_path(git.root)
            return root_name if not relative else f"{root_name}/{relative}"

    home = _home_path(environment, normalized_cwd)
    home_relative = _relative_child(normalized_cwd, home)
    if home_relative is not None:
        return "~" if not home_relative else f"~/{home_relative}"
    return normalized_cwd


def _mode(value: Optional[str], default: str = "auto") -> str:
    candidate = (value or default).strip().lower()
    return candidate if candidate in {"auto", "always", "never"} else default


def _truthy(value: Optional[str]) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _max_width(env: Mapping[str, str]) -> int:
    values = (env.get("ATS_MAX_WIDTH"), env.get("COLUMNS"))
    width = DEFAULT_MAX_WIDTH
    for candidate in values:
        if not candidate:
            continue
        try:
            width = int(candidate)
            break
        except ValueError:
            continue
    width = max(12, min(width, 512))
    return min(width, DEFAULT_MAX_WIDTH)


def display_width(value: str) -> int:
    """Approximate terminal cells without adding a wcwidth dependency."""
    width = 0
    for character in value:
        codepoint = ord(character)
        if (
            unicodedata.combining(character)
            or unicodedata.category(character) in {"Cf", "Me", "Mn"}
            or codepoint == 0
        ):
            continue
        if codepoint < 32 or 0x7F <= codepoint < 0xA0:
            continue
        width += 2 if unicodedata.east_asian_width(character) in {"F", "W"} else 1
    return width


def _take_prefix_cells(value: str, budget: int) -> str:
    used = 0
    end = 0
    for index, character in enumerate(value):
        character_width = display_width(character)
        if character_width and used + character_width > budget:
            break
        used += character_width
        end = index + 1
    return value[:end]


def _take_suffix_cells(value: str, budget: int) -> str:
    used = 0
    start = len(value)
    for index in range(len(value) - 1, -1, -1):
        character_width = display_width(value[index])
        if character_width and used + character_width > budget:
            break
        used += character_width
        start = index
    return value[start:]


def shorten_middle(value: str, width: int, ascii_only: bool = False) -> str:
    if width <= 0:
        return ""
    if display_width(value) <= width:
        return value

    marker = "..." if ascii_only else "…"
    marker_width = display_width(marker)
    if width <= marker_width:
        return _take_prefix_cells(value, width)

    available = width - marker_width
    left = max(1, available // 2)
    right = max(1, available - left)
    return f"{_take_prefix_cells(value, left)}{marker}{_take_suffix_cells(value, right)}"


def render(identity: StatusIdentity, env: Optional[Mapping[str, str]] = None) -> str:
    """Render one calm line, preserving path identity before optional fields."""
    environment = os.environ if env is None else env
    ascii_only = _truthy(environment.get("ATS_ASCII"))
    separator = " | " if ascii_only else " · "
    branch_mode = _mode(environment.get("ATS_SHOW_BRANCH"))
    host_mode = _mode(environment.get("ATS_SHOW_HOST"))
    width = _max_width(environment)

    path = identity.path or identity.cwd or "?"
    include_branch = bool(identity.branch) and branch_mode != "never"
    include_host = bool(identity.machine) and host_mode != "never"

    def compose(current_path: str) -> str:
        parts = [current_path]
        if include_branch and identity.branch:
            parts.append(identity.branch)
        if include_host and identity.machine:
            parts.append(identity.machine)
        return separator.join(parts)

    line = compose(path)
    if display_width(line) <= width:
        return line

    suffix_parts: list[str] = []
    if include_branch and identity.branch:
        suffix_parts.append(identity.branch)
    if include_host and identity.machine:
        suffix_parts.append(identity.machine)
    suffix_length = display_width(separator.join(["", *suffix_parts])) if suffix_parts else 0
    minimum_path = min(18, max(8, width // 2))
    if suffix_length + minimum_path <= width:
        return compose(shorten_middle(path, width - suffix_length, ascii_only))

    if include_branch and branch_mode == "auto":
        include_branch = False
        line = compose(path)
        if display_width(line) <= width:
            return line

    suffix_length = display_width(separator + identity.machine) if include_host and identity.machine else 0
    if suffix_length + minimum_path <= width:
        return compose(shorten_middle(path, width - suffix_length, ascii_only))

    if include_host and host_mode == "auto":
        include_host = False
        line = compose(path)
        if display_width(line) <= width:
            return line

    suffix_parts = []
    if include_branch and identity.branch:
        suffix_parts.append(identity.branch)
    if include_host and identity.machine:
        suffix_parts.append(identity.machine)
    suffix = separator + separator.join(suffix_parts) if suffix_parts else ""
    path_budget = max(1, width - display_width(suffix))
    final = f"{shorten_middle(path, path_budget, ascii_only)}{suffix}"
    return shorten_middle(final, width, ascii_only)


def build_identity(
    payload: str,
    env: Optional[Mapping[str, str]] = None,
    *,
    fallback_cwd: Optional[str] = None,
    git: Optional[GitIdentity] = None,
    machine: Optional[str] = None,
) -> StatusIdentity:
    environment = os.environ if env is None else env
    _, cwd = parse_payload(payload, fallback_cwd)
    git_identity = collect_git(cwd, environment) if git is None else git
    path_style = environment.get("ATS_PATH_STYLE", "context")
    path = display_path(cwd, git_identity, path_style, environment)
    host = (
        machine
        or environment.get("ATS_MACHINE")
        or environment.get("COMPUTERNAME")
        or environment.get("HOSTNAME")
        or socket.gethostname()
        or "unknown"
    )
    return StatusIdentity(cwd=cwd, path=path, branch=git_identity.branch if git_identity else None, machine=host)


def main() -> int:
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    try:
        payload = sys.stdin.read()
        identity = build_identity(payload)
        print(render(identity))
    except Exception:
        # A status line should degrade to useful identity, never a blank row.
        fallback = _safe_cwd()
        machine = os.environ.get("ATS_MACHINE") or os.environ.get("COMPUTERNAME") or socket.gethostname()
        identity = StatusIdentity(fallback, display_path(fallback, None), None, machine)
        print(render(identity))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
