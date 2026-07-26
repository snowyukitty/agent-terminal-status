# Performance

Snapshot: **2026-07-27**. These are local measurements, not universal claims.

## Result

Complete command latency, including process startup and Git probing:

| Adapter | Scenario | p50 | p95 | Max |
| --- | --- | ---: | ---: | ---: |
| Python 3.12 | Git repository | 62.3 ms | 65.5 ms | 67.8 ms |
| Python 3.12 | Non-Git directory | 60.5 ms | 65.6 ms | 66.5 ms |
| Windows PowerShell 5.1 | Git repository | 279.4 ms | 283.2 ms | 283.4 ms |
| Windows PowerShell 5.1 | Non-Git directory | 274.8 ms | 278.8 ms | 282.3 ms |
| PowerShell 7.6 | Git repository | 337.8 ms | 340.6 ms | 343.4 ms |
| PowerShell 7.6 | Non-Git directory | 335.7 ms | 339.4 ms | 354.4 ms |

The configured Windows default is Windows PowerShell 5.1 because it is present
on supported Windows installations and adds no runtime dependency. Its p95 was
below Claude Code's documented 300 ms update debounce on this machine. Python
was substantially faster. PowerShell 7 startup was slower in this packaged
environment, so the installer does not prefer it merely because it is newer.

Git and non-Git results were nearly identical. The implementation performs one
bounded `git rev-parse` in the normal branch case; process startup dominates
this reference measurement.

## Reference environment

- Windows 11 Pro 64-bit, build 26200
- AMD Ryzen 9 9950X
- Claude Code 2.1.220
- Git 2.55.0.windows.3
- Python 3.12.10
- Windows PowerShell 5.1.26100.8894
- PowerShell 7.6.4

The filesystem was local and warm. Network filesystems, endpoint security,
slower CPUs, cold executable pages, and different PowerShell packaging can
materially change the result.

## Method

Run:

```powershell
python .\scripts\benchmark.py --iterations 25 --json
```

For each adapter and scenario, the benchmark:

1. creates a Claude-like UTF-8 JSON payload;
2. warms the command twice;
3. starts a fresh process for each of 25 samples;
4. captures output and rejects failures or blank renders;
5. reports median, nearest-rank p95, and maximum wall-clock time.

The Git scenario uses this repository at a committed `main` HEAD. The non-Git
scenario uses a fresh temporary directory. `ATS_GIT_TIMEOUT_MS` is the default
150 ms and `COLUMNS` is 96.

Claude Code itself debounces rapid status updates by 300 ms and cancels a
running status command if a newer update arrives, according to its
[status-line documentation](https://code.claude.com/docs/en/statusline#how-status-lines-work).
That makes tail latency more important than an in-process microbenchmark.

## Budget and next experiments

Current reference targets:

- Python adapter p95 below 100 ms;
- default Windows adapter p95 below 300 ms;
- Git timeout no higher than 150 ms by default;
- always render cwd identity even after a Git timeout.

Before adding dirty state, remote calls, or coordination signals, benchmark the
complete command again. If Windows startup becomes visibly disruptive on common
hardware, evaluate a small signed native binary or an opt-in Python adapter
rather than adding caches that can make identity stale.
