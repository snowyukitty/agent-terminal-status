#!/usr/bin/env python3
"""Measure complete status-command latency, including process startup."""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = max(0, math.ceil(len(ordered) * fraction) - 1)
    return ordered[index]


def measure(
    name: str,
    command: list[str],
    cwd: Path,
    iterations: int,
    environment: dict[str, str],
) -> dict[str, float | str | int]:
    payload = json.dumps(
        {
            "cwd": str(cwd),
            "workspace": {
                "current_dir": str(cwd),
                "project_dir": str(cwd),
                "added_dirs": [],
            },
            "session_id": "benchmark-session",
        },
        ensure_ascii=False,
    ).encode("utf-8")

    for _ in range(2):
        subprocess.run(
            command,
            input=payload,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=True,
        )

    samples: list[float] = []
    rendered = ""
    for _ in range(iterations):
        started = time.perf_counter_ns()
        result = subprocess.run(
            command,
            input=payload,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            check=False,
        )
        elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000
        if result.returncode != 0 or not result.stdout.strip():
            raise RuntimeError(
                f"{name} failed with exit {result.returncode}: "
                f"{result.stderr.decode('utf-8', errors='replace')}"
            )
        rendered = result.stdout.decode("utf-8", errors="replace").strip()
        samples.append(elapsed_ms)

    return {
        "adapter": name,
        "scenario": "git" if (cwd / ".git").exists() else "non-git",
        "iterations": iterations,
        "p50_ms": round(statistics.median(samples), 1),
        "p95_ms": round(percentile(samples, 0.95), 1),
        "max_ms": round(max(samples), 1),
        "output": rendered,
    }


def commands() -> list[tuple[str, list[str]]]:
    available = [
        ("python", [sys.executable, str(ROOT / "src" / "statusline.py")]),
    ]
    if os.name == "nt":
        powershell = shutil.which("powershell")
        if powershell:
            available.append(
                (
                    "windows-powershell",
                    [
                        powershell,
                        "-NoProfile",
                        "-NonInteractive",
                        "-ExecutionPolicy",
                        "Bypass",
                        "-File",
                        str(ROOT / "src" / "statusline.ps1"),
                    ],
                )
            )
        pwsh = shutil.which("pwsh")
        if pwsh:
            available.append(
                (
                    "powershell-7",
                    [
                        pwsh,
                        "-NoProfile",
                        "-NonInteractive",
                        "-File",
                        str(ROOT / "src" / "statusline.ps1"),
                    ],
                )
            )
    return available


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--iterations", type=int, default=25)
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    arguments = parser.parse_args()
    iterations = max(3, min(arguments.iterations, 500))
    environment = dict(os.environ)
    environment.update(
        {
            "ATS_MACHINE": "benchmark-host",
            "COLUMNS": "96",
            "ATS_GIT_TIMEOUT_MS": "150",
        }
    )

    results: list[dict[str, float | str | int]] = []
    with tempfile.TemporaryDirectory(prefix="ats-benchmark-") as temporary:
        non_git = Path(temporary)
        for adapter, command in commands():
            results.append(measure(adapter, command, ROOT, iterations, environment))
            results.append(measure(adapter, command, non_git, iterations, environment))

    if arguments.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        print(f"{'adapter':<20} {'scenario':<9} {'p50':>9} {'p95':>9} {'max':>9}")
        for result in results:
            print(
                f"{result['adapter']:<20} {result['scenario']:<9} "
                f"{result['p50_ms']:>7.1f}ms {result['p95_ms']:>7.1f}ms "
                f"{result['max_ms']:>7.1f}ms"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
