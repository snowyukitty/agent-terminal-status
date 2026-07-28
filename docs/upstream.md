# Claude Code upstream evidence packet

Prepared: **2026-07-27**.

## Do not file a new issue

Equivalent requests already exist:

- [#70132 — Display current working directory in CLI prompt](https://github.com/anthropics/claude-code/issues/70132)
- [#81298 — Display current working directory/project context](https://github.com/anthropics/claude-code/issues/81298)
- [#74344 — Show working subfolder, not just Git root](https://github.com/anthropics/claude-code/issues/74344)

Related open reports add implementation evidence:

- [#79794 — Linked worktrees show the main worktree's project badge](https://github.com/anthropics/claude-code/issues/79794)
- [#81454 — Usable status-line width is not documented](https://github.com/anthropics/claude-code/issues/81454)
- [#73726 — Terminal width was missing from status command data](https://github.com/anthropics/claude-code/issues/73726)
- [#76988 — Status line does not rerun on terminal resize](https://github.com/anthropics/claude-code/issues/76988)
- [#79433 — Valid custom status lines can silently fall back to the default](https://github.com/anthropics/claude-code/issues/79433)
- [#76411 — Custom status lines do not render in macOS fullscreen TUI mode](https://github.com/anthropics/claude-code/issues/76411)

The public feature template requires a duplicate search. A new broad "workspace
identity layer" issue would fragment the strongest immediate request. The
recommended eventual action is a focused evidence comment on #70132 while it
remains open and relevant, with a cross-reference to #74344 for monorepo
behavior.

The duplicate snapshot was refreshed on 2026-07-27: #70132, #81298, and #74344
were still open with no comments. However, #70132 received the `stale` label on
2026-07-21, while #74344 remained active without it. The repository runs
`sweep.yml`, `auto-close-duplicates.yml`, and related lifecycle automation, so
the earliest issue may close before this packet's evidence gate is satisfied.
Do not post a low-signal comment merely to reset stale state. Recheck the thread
and labels immediately before posting; if #70132 has closed, evaluate #74344
and the then-current duplicate landscape as the narrower fallback.

#74344 was opened on 2026-07-05. If the same roughly 29-day inactivity window
that labeled #70132 applies, it could become stale around 2026-08-03. This is an
estimate, not a posting deadline: stale comments have frequently failed to
prevent closure, so evidence quality remains more important than keeping a
particular thread alive.

Do not submit the draft below until real-use evidence is available.

## Problem

Developers increasingly run several Claude Code sessions across repositories,
monorepo subfolders, branches, worktrees, terminals, and machines. The
conversation can look correct while an action targets the wrong workspace.
Asking for `pwd`, manually renaming every session, or inspecting another prompt
adds friction and can itself become stale.

Directory identity is unusually important because it tells the user where the
next filesystem or Git action will land.

This is not only a hypothetical custom-footer problem. Issue #79794 documents a
current linked-worktree case where Claude Code's own project badge selects the
main worktree name even though session cwd metadata is correct.

## Prototype evidence

`agent-terminal-status` implements the behavior through Claude Code's existing
custom status-line command:

```text
agent-terminal-status/docs/research · feature/identity · snowy-atlas
```

Prototype behavior:

- uses Claude's `workspace.current_dir`, not the command process cwd;
- shows `repo-name/actual/relative/subfolder`;
- falls back cleanly outside Git;
- handles detached HEAD and linked worktrees;
- shortens by terminal cell width, including CJK paths;
- drops branch before machine when narrow;
- performs no network calls;
- bounds Git work to 150 ms and preserves path identity on timeout.
- enforces terminal-cell width across every branch/host visibility mode.

Verification currently includes Python tests plus the same behavioral suite in
Windows PowerShell 5.1 and PowerShell 7. Scenarios cover malformed input,
missing Git, spaces, non-ASCII paths, worktrees, detached HEAD, narrow
terminals, installer rollback, and later user settings edits.

Reference complete-command p95 across repeated batches on one Windows machine:

| Adapter | Observed p95 |
| --- | ---: |
| Python 3.12 | 63–66 ms |
| Windows PowerShell 5.1 | 279–306 ms |

See [performance methodology](performance.md) and the
[deterministic demo](demo.svg).

What this does **not** yet prove:

- prevalence across a broad user sample;
- the best default for hostname visibility;
- real latency on slow endpoints and network-mounted repositories;
- persistence expectations during every active-turn UI state.
- immediate rerendering after terminal resize; today the next event or an
  optional `refreshInterval` is required.
- reliable delivery in every Claude Code TUI mode or release; #79433 and #76411
  track current custom-status regressions that a native identity segment would
  avoid.

## Proposed native experience

Keep the native request narrower than the prototype:

1. Always show the actual current workspace directory in the interactive CLI.
2. Inside Git, render the repository name plus cwd relative to its root.
3. Outside Git, render a home-relative path where possible.
4. Adapt to width by middle-shortening while retaining the directory leaf.
5. Preserve the identity through active processing and temporary UI states.
6. Allow users to disable or replace the segment through existing status/footer
   configuration.

Example:

```text
agent-terminal-status/docs/research
```

Branch already exists as a familiar development signal in many footer designs.
Hostname is valuable for SSH/containers but exposes naming information and is
less universally needed; it should be an optional native segment, not part of
the minimum request.

The native implementation should use Claude Code's internal workspace state and
Git context rather than spawning a status command. That avoids process startup,
trust gates, custom-script disappearance, quoting differences, and settings
conflicts.

## UX cases to attach

Use a compact comparison containing:

1. two repositories with the same task language;
2. two monorepo subfolders on the same branch;
3. main worktree and a linked worktree;
4. local Windows and an SSH/container session;
5. a 40-column terminal;
6. a path with spaces and non-ASCII characters;
7. a non-Git scratch directory.

For each, show the current Claude Code UI and the same session with persistent
identity. Do not include private real paths or hostnames.

## Ready-to-adapt comment for #70132

> I built and tested a small external prototype for this exact workflow. The
> most useful behavior was not just the Git root: it was
> `repo-name/actual/relative/cwd`, sourced from `workspace.current_dir`.
>
> That distinguishes parallel sessions in different monorepo subfolders while
> remaining compact at repository root. Outside Git it falls back to a
> home-relative path. At narrow widths it middle-shortens the path and removes
> optional branch/machine segments first.
>
> The prototype covers Windows PowerShell, macOS/Linux through Python, linked
> worktrees, detached HEAD, non-Git directories, spaces, non-ASCII paths, and
> missing/slow Git. Repeated complete-command batches on one reference machine
> measured Python p95 at 63–66 ms and the no-dependency Windows PowerShell
> adapter at 279–306 ms. These are local ranges, not universal claims.
>
> A native segment could be much smaller and faster because Claude Code already
> owns workspace and Git state. My suggested minimum is: always-visible actual
> cwd, repository-relative when applicable, adaptive middle shortening, and an
> existing config path to disable/replace it. Hostname can remain opt-in.
>
> Prototype, tests, and measurements:
> https://github.com/snowyukitty/agent-terminal-status
>
> Live demo: https://agent-terminal-status.gldtestuser.chatgpt.site
> Related monorepo-subfolder request: #74344.

Keep the posted comment shorter if the issue has evolved. Re-read the full
thread immediately before posting and avoid repeating newer evidence.

## Evidence gate

The technical prototype gate is complete: renderer and installer tests,
Windows PowerShell 5.1 and PowerShell 7 coverage, Git and non-Git edge cases,
complete-process latency measurements, duplicate research, and a sanitized
public repository and demo are all available.

Human observations are tracked once in the canonical
[public release evidence gate](release-evidence.md):

- R1 supplies the week of regular multi-session use;
- R2 supplies real Claude Code screenshots on Windows and POSIX;
- R3 supplies SSH, WSL, and container observations.

Do not duplicate their completion state here. After R1-R3 are complete, perform
one upstream-specific final step:

- [ ] Re-read the live duplicate threads and labels immediately before posting.

Until R1-R3 and the fresh thread review are complete, this document is
preparation, not a claim that an upstream submission is ready.
