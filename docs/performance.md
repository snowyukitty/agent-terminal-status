# Performance

Snapshot: **2026-07-27**. These are local measurements, not universal claims.

## Result

Complete-command latency includes process startup, JSON parsing, Git probing,
rendering, and output. Three 25-sample batches on the same reference machine
showed the following p95 ranges across Git and non-Git scenarios:

| Adapter | Observed p95 range | Interpretation |
| --- | ---: | --- |
| Python 3.12 | 63–66 ms | Stable across the measured batches |
| Windows PowerShell 5.1 | 279–306 ms | Startup cost is material and varies between runs |
| PowerShell 7.6 | 332–369 ms | Slower in this packaged environment |

These ranges are a reference, not a service-level objective. One independent
repeat recorded a 4.1 s maximum for PowerShell 7 even though that batch's p95
was 369 ms. Tail spikes matter because Claude Code cancels an in-flight status
command when a newer update arrives.

The configured Windows default remains Windows PowerShell 5.1 because it is
present on supported Windows installations and adds no runtime dependency.
Python was substantially faster on this host. PowerShell 7 is not preferred
merely because it is newer.

Git and non-Git measurements were close. The normal branch case performs one
bounded `git rev-parse`; fresh PowerShell process startup dominates this
reference measurement.

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

Claude Code debounces rapid status updates by 300 ms and cancels a running
status command if a newer update arrives, according to its
[status-line documentation](https://code.claude.com/docs/en/statusline#how-status-lines-work).
The debounce interval batches triggers; it is not a script execution budget.
Cancellation frequency and tail latency are therefore more meaningful than
whether a single p95 falls above or below 300 ms.

## Budget and next experiments

Current reference targets:

- Python adapter p95 below 100 ms;
- Git timeout no higher than 150 ms by default;
- always render cwd identity even after a Git timeout.
- measure Windows tail latency and real-session cancellation before claiming a
  fixed process budget.

Before adding dirty state, remote calls, or coordination signals, benchmark the
complete command again. If Windows startup becomes visibly disruptive on common
hardware, first test whether Claude's provided workspace fields can safely
reduce Git work. `workspace.repo` does not include the local repository root, so
it cannot replace root discovery without another reliable boundary signal.
After that, evaluate a small signed native binary or an opt-in Python adapter
rather than adding caches that can make identity stale.
