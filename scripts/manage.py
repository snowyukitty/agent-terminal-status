#!/usr/bin/env python3
"""Install or remove the POSIX Claude Code status-line adapter."""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import stat
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "0.1.0"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent


def default_config_dir() -> Path:
    configured = os.environ.get("CLAUDE_CONFIG_DIR")
    return Path(configured).expanduser() if configured else Path.home() / ".claude"


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8-sig")
    if not raw.strip():
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Cannot modify {path}: invalid JSON ({error}).") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"Cannot modify {path}: the root value must be a JSON object.")
    return value


def write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(prefix=".ats-", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _installed_paths(config_dir: Path) -> dict[str, Path]:
    install_dir = config_dir / "agent-terminal-status"
    return {
        "dir": install_dir,
        "status": install_dir / "statusline.py",
        "manager": install_dir / "manage.py",
        "uninstaller": install_dir / "uninstall.sh",
        "state": install_dir / "install-state.json",
        "settings": config_dir / "settings.json",
    }


def _is_our_command(command: str, installed_command: str = "") -> bool:
    return bool(command) and (
        command == installed_command
        or "/agent-terminal-status/statusline.py" in command.replace("\\", "/")
    )


def install(config_dir: Path, force: bool = False) -> None:
    config_dir = config_dir.expanduser().resolve()
    paths = _installed_paths(config_dir)
    source_status = PROJECT_ROOT / "src" / "statusline.py"
    source_uninstaller = SCRIPT_DIR / "uninstall.sh"
    if not source_status.exists():
        raise RuntimeError(f"Source status line not found at {source_status}.")

    settings = read_json(paths["settings"])
    existing_state = read_json(paths["state"]) if paths["state"].exists() else None
    python = str(Path(sys.executable).resolve()).replace("\\", "/")
    status_path = str(paths["status"]).replace("\\", "/")
    installed_command = f"{shlex.quote(python)} {shlex.quote(status_path)}"
    current = settings.get("statusLine")
    current_command = current.get("command", "") if isinstance(current, dict) else ""
    already_ours = _is_our_command(str(current_command), installed_command)

    if "statusLine" in settings and not already_ours and not force:
        raise RuntimeError(
            "A Claude Code statusLine is already configured. Re-run with --force "
            "to preserve and replace it; uninstall will restore it."
        )

    previous_present = "statusLine" in settings
    previous_value = settings.get("statusLine")
    if already_ours and existing_state:
        previous_present = bool(existing_state.get("previousStatusLinePresent"))
        previous_value = existing_state.get("previousStatusLine")

    paths["dir"].mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_status, paths["status"])
    shutil.copy2(Path(__file__).resolve(), paths["manager"])
    shutil.copy2(source_uninstaller, paths["uninstaller"])
    paths["uninstaller"].chmod(paths["uninstaller"].stat().st_mode | stat.S_IXUSR)

    state = {
        "schemaVersion": 1,
        "installedVersion": VERSION,
        "installedCommand": installed_command,
        "settingsPath": str(paths["settings"]),
        "previousStatusLinePresent": previous_present,
        "previousStatusLine": previous_value,
        "installedAtUtc": datetime.now(timezone.utc).isoformat(),
    }
    settings["statusLine"] = {
        "type": "command",
        "command": installed_command,
        "padding": 0,
    }
    write_json_atomic(paths["state"], state)
    try:
        write_json_atomic(paths["settings"], settings)
    except Exception:
        paths["state"].unlink(missing_ok=True)
        raise

    print(f"Installed agent-terminal-status {VERSION}.")
    print(f"Claude settings: {paths['settings']}")
    print(f"Status command: {paths['status']}")
    if previous_present and not already_ours:
        print("The previous statusLine was preserved and will be restored on uninstall.")
    print("Claude Code reloads settings automatically; interact once to refresh the line.")


def uninstall(config_dir: Path) -> None:
    config_dir = config_dir.expanduser().resolve()
    paths = _installed_paths(config_dir)
    state = None
    settings = None
    if paths["state"].exists():
        try:
            state = read_json(paths["state"])
        except RuntimeError:
            print(
                "Warning: the install state is unreadable; rollback metadata is "
                "unavailable. Project files will still be removed.",
                file=sys.stderr,
            )
    if paths["settings"].exists():
        try:
            settings = read_json(paths["settings"])
        except RuntimeError:
            print(
                "Warning: Claude settings are unreadable and were left untouched. "
                f"Project files will still be removed; repair {paths['settings']} "
                "and remove its statusLine entry if needed.",
                file=sys.stderr,
            )
    settings_changed = False

    if settings is not None:
        current = settings.get("statusLine")
        current_command = current.get("command", "") if isinstance(current, dict) else ""
        installed_command = str(state.get("installedCommand", "")) if state else ""
        if _is_our_command(str(current_command), installed_command):
            if state and state.get("previousStatusLinePresent"):
                settings["statusLine"] = state.get("previousStatusLine")
            else:
                settings.pop("statusLine", None)
            settings_changed = True
        elif current_command:
            print(
                "Warning: Claude statusLine changed after installation; "
                "leaving the current setting untouched.",
                file=sys.stderr,
            )

    if settings_changed and settings is not None:
        write_json_atomic(paths["settings"], settings)

    for name in ("status", "manager", "uninstaller", "state"):
        paths[name].unlink(missing_ok=True)
    try:
        paths["dir"].rmdir()
    except OSError:
        if paths["dir"].exists():
            print(
                f"Warning: kept {paths['dir']} because it contains files not created by this installer.",
                file=sys.stderr,
            )

    print("Uninstalled agent-terminal-status.")
    if settings_changed and state and state.get("previousStatusLinePresent"):
        print("Restored the previous Claude Code statusLine.")
    elif settings_changed:
        print("Removed the agent-terminal-status setting from Claude Code.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="action", required=True)
    install_parser = subparsers.add_parser("install", help="install into Claude user settings")
    install_parser.add_argument("--config-dir", type=Path, default=default_config_dir())
    install_parser.add_argument("--force", action="store_true")
    uninstall_parser = subparsers.add_parser("uninstall", help="remove and restore prior settings")
    uninstall_parser.add_argument("--config-dir", type=Path, default=default_config_dir())
    return parser


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    arguments = build_parser().parse_args(argv)
    try:
        if arguments.action == "install":
            install(arguments.config_dir, arguments.force)
        else:
            uninstall(arguments.config_dir)
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
