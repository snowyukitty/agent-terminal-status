# Roadmap

This roadmap separates shipped behavior, evidence-backed next work, and ideas
that still need validation. Dates and version numbers are intentionally not
promises.

## 0.1 checkpoint — workspace identity

Implemented:

- Claude Code command status-line integration;
- actual repository-relative current directory;
- optional Git branch and machine identity;
- Git, non-Git, detached HEAD, and linked-worktree fallbacks;
- adaptive narrow-terminal rendering with Unicode cell widths;
- Windows PowerShell 5.1 adapter with no extra runtime;
- Python adapter for macOS, Linux, and other Python environments;
- reversible, idempotent user-settings installers;
- deterministic demo, benchmark, and cross-platform CI;
- width-invariant rendering across every visibility mode;
- portable, privacy-scanned public website build and demo.

Before calling 0.1 a public release:

Complete R1-R5 in the canonical
[public release evidence gate](docs/release-evidence.md). Unfinished human
evidence does not reopen the engineering checkpoint; use that document's
explicit reopen rule instead of starting another static review round.

## Next — validate development identity

These are credible next experiments, not committed default fields:

- identify linked worktrees explicitly when the folder name is insufficient;
- detect SSH, WSL, Dev Container, and common container contexts;
- add a privacy preset that suppresses or aliases paths and hosts;
- benchmark a single bounded `git status --porcelain=v2 --branch` collector for
  conflict, dirty, ahead, and behind signals;
- test whether one small state glyph prevents mistakes without adding noise;
- add signed release artifacts or a package only when they materially improve
  installation trust and simplicity;
- gather evidence on current-directory changes during long-running sessions and
  whether an optional refresh interval is warranted;
- test whether documented `workspace.repo` / `workspace.git_worktree` fields can
  reduce Git process work without guessing the local repository root.

Acceptance for a new default signal:

1. it prevents a recurring, demonstrated confusion;
2. its source is reliable across supported platforms;
3. it remains useful on a narrow terminal;
4. its p95 collection cost fits the render budget;
5. it has a clear privacy and fallback story.

## Upstream Claude Code

A focused engineering-evidence
[comment](https://github.com/anthropics/claude-code/issues/70132#issuecomment-5098948504)
was posted to the earliest matching request on 2026-07-28 after a fresh
duplicate and thread review. It deliberately claims prototype evidence, not
prevalence or real-use evidence. Do not open a duplicate issue or add a
keepalive comment; follow up only with substantive human observations or in
response to a maintainer. See [docs/upstream.md](docs/upstream.md).

The smallest native proposal should focus on the actual current directory,
using repository-relative context and adaptive shortening. Branch and hostname
should remain existing/optional signals rather than expanding the first request.

## Later — additional agent surfaces

Evaluate integration surfaces before standardizing an adapter API:

- **OpenAI Codex CLI:** study how a workspace-identity preset could complement
  its native configurable `tui.status_line` and `tui.terminal_title`.
- **Gemini CLI:** verify its current extension and footer contracts.
- **Aider:** determine whether prompt, terminal title, or event hooks are the
  least intrusive surface.
- **Other agents:** add only when there is a maintained public integration
  point and a user who can test it.

After a second adapter ships, consider extracting:

- a versioned normalized identity schema;
- collectors with deadlines and freshness metadata;
- renderer presets for plain text and optional color;
- user- and project-scoped configuration;
- an adapter conformance fixture suite.

## Explore only after evidence

- session and task labels;
- model, permission, sandbox, and context-window state;
- linked issue or pull-request identity;
- background-agent activity;
- detecting multiple agents in related worktrees;
- advisory workspace ownership, overlap, or handoff signals;
- optional integration with orchestration systems.

Coordination state is high-value but also high-risk: false ownership or stale
locks can be worse than no indicator. Any experiment needs explicit freshness,
failure, privacy, and recovery semantics before becoming user-facing.

## Explicitly deferred

- a general plugin framework;
- cloud accounts or telemetry;
- a theme marketplace;
- mandatory Nerd Font glyphs;
- continuous polling by default;
- network calls in the status-render path;
- automatic workspace locks or enforcement.
