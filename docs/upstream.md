# Claude Code upstream evidence packet

Prepared: **2026-07-28**.

## Do not file a new issue

Equivalent requests already exist:

- [#70132 — Display current working directory in CLI prompt](https://github.com/anthropics/claude-code/issues/70132)
- [#73162 — Show project/codebase identity by default](https://github.com/anthropics/claude-code/issues/73162)
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
identity layer" issue would fragment the strongest immediate request. After a
fresh duplicate and thread review, a focused
[engineering-evidence comment](https://github.com/anthropics/claude-code/issues/70132#issuecomment-5098948504)
was posted to #70132 on 2026-07-28, with cross-references to #73162 for default
project identity, #74344 for monorepo behavior, and #79794 for linked
worktrees.

In the pre-comment snapshot that day, #70132, #73162, #81298, and #74344 were
open with no comments or reactions. Immediately after the contribution,
#70132 remained open and unlocked with that one substantive comment; its
`stale` label from 2026-07-21 was still present. The other three requests
remained open without the label. The repository's public
[lifecycle code](https://github.com/anthropics/claude-code/blob/main/scripts/issue-lifecycle.ts)
marks inactive issues stale and its
[sweep](https://github.com/anthropics/claude-code/blob/main/scripts/sweep.ts)
closes a stale issue after 14 days, but explicitly skips closure when a human
adds a comment after the stale label or the issue reaches ten thumbs-up
reactions.

That mechanism does not justify a keepalive. Do not add a second comment merely
to change lifecycle state. Recheck the threads and labels before any future
contribution; if #70132 has closed, evaluate #73162, #74344, and the
then-current duplicate landscape instead of mechanically opening another
request.

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

## Posted comment and follow-up rule

The 2026-07-28
[comment on #70132](https://github.com/anthropics/claude-code/issues/70132#issuecomment-5098948504)
records the tested engineering result: actual repository-relative cwd was more
useful than Git root alone, the path survives narrow widths and collector
failures, and a native segment could avoid external-process costs. It links the
public prototype, tests, measurements, visual guide, and focused related
issues.

The comment explicitly says, “This is engineering prototype evidence, not a
prevalence or real-use claim.” Preserve that boundary. The next upstream action
is to wait: answer a maintainer question if one arrives, or add a future
follow-up only when R1-R4 provide genuinely new human evidence. Re-read the
live thread and duplicate landscape immediately before doing either.

## Evidence gate

The technical prototype gate is complete: renderer and installer tests,
Windows PowerShell 5.1 and PowerShell 7 coverage, Git and non-Git edge cases,
complete-process latency measurements, duplicate research, a sanitized public
repository and demo, and the focused engineering-evidence comment are all
available.

Human observations are tracked once in the canonical
[public release evidence gate](release-evidence.md):

- R1 supplies the week of regular multi-session use;
- R2 supplies real Claude Code screenshots on Windows and POSIX;
- R3 supplies SSH, WSL, and container observations;
- R4 supplies the hostname-visibility decision from real use.

Do not duplicate their completion state here. They are gates for a public
release and for any future real-use claim, not retroactive prerequisites for
the already posted, narrowly scoped engineering comment.

- [x] Re-read the live duplicate threads and labels before the 2026-07-28
  engineering-evidence comment.
- [ ] Re-read them again before any future upstream comment or proposal.

Until R1-R4 are complete, this document does not claim broad real-use evidence
or public-release readiness.
