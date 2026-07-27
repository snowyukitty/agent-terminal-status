# ADR 0001: Identity-first command adapters

- Status: Accepted
- Date: 2026-07-27

## Context

The immediate problem is workspace confusion across parallel Claude Code
sessions. Claude Code can execute a status command and provides current
workspace JSON, but its plugin format cannot currently install the main status
line. Windows command routing may pass through Git Bash and mangle unquoted
backslash paths.

The project also has a broader identity-layer direction, but only one agent
integration has been validated. A framework would encode untested abstractions.

## Decision

Version 0.1 is two small, behaviorally equivalent command adapters:

- PowerShell 5.1 for a no-extra-runtime Windows default;
- Python 3.9+ for macOS, Linux, and portable use.

Both follow the same narrow pipeline:

```text
Claude JSON -> current cwd -> bounded Git identity -> status identity -> renderer
```

The normalized status identity contains cwd, display path, optional branch, and
machine. Collection and rendering are separate functions, but they remain in
one file per adapter.

The default renderer is path-first, monochrome, and one line. It caps output at
96 terminal cells, shortens the path in the middle, and drops an automatic
branch before an automatic host when width is scarce.

Before measuring or rendering, both adapters replace Unicode control (`Cc`),
format (`Cf`), surrogate (`Cs`), line-separator (`Zl`), and
paragraph-separator (`Zp`) characters with spaces. Workspace identity is a
safety signal, so preventing invisible direction overrides and hidden line
breaks takes precedence over preserving those formatting code points.

Git is optional. Calls use `git -C`, disable optional locks, avoid worktree
state scans, and have a 150 ms default timeout. Failure omits branch but never
the current directory.

Installation copies the adapter into Claude's user configuration and updates
settings atomically. Existing status lines require explicit force and are
retained as rollback state. Uninstall validates that state before using it; if
metadata is unavailable or incomplete, it warns that the previous value cannot
be reconstructed rather than silently implying a successful rollback.

## Why this is the smallest useful shape

- PowerShell avoids requiring Python, Node.js, `jq`, WSL, or a package manager
  on Windows.
- Python avoids Bash parser and utility differences across macOS and Linux.
- Two standalone files are easy to inspect, copy manually, and remove.
- A repository-relative cwd distinguishes monorepo subfolders without exposing
  a long absolute path.
- Leaving dirty state out keeps Git work bounded and the default calm.

## Alternatives considered

### Bash plus `jq`

Simple on many Unix systems, but adds an optional dependency and is not a
first-class Windows path. Quoting through Git Bash is also the known Windows
failure mode.

### Node.js or a package framework

It would improve packaging and shared implementation, but adds a runtime and
substantially more supply-chain and installation surface than the first feature
needs.

### Claude Code plugin

Preferred in principle, but plugin defaults do not currently support the main
`statusLine` key. A plugin would not eliminate settings setup.

### Hooks

Hooks are useful event sources but not persistent UI. They would introduce
state storage and synchronization without solving rendering.

### Require Starship or another existing formatter

This is a good option for users who already want a rich prompt framework. It
does not meet the zero-config, identity-only, safely removable product target.

### Rich modular dashboard in 0.1

Existing projects already serve this use case. Model, cost, context, dirty
state, and coordination signals would make it harder to learn whether persistent
workspace identity alone solves the problem.

## Consequences

Positive:

- installation and output are inspectable;
- current-directory identity survives missing Git and malformed payloads;
- Windows is supported without an additional runtime;
- the prototype produces useful native-product evidence.

Costs:

- shared behavior is duplicated across PowerShell and Python;
- PowerShell process startup is materially slower;
- configuration is environment-based rather than a schema;
- adapter installation cannot be delegated to Claude's plugin manager.

## Revisit when

Reconsider the architecture after any of these:

- a second agent integration needs the same collectors and renderer;
- behavioral drift between the two adapters becomes costly;
- Claude plugins support main status-line settings;
- real hardware shows unacceptable PowerShell startup latency;
- richer Git state needs caching or freshness metadata.

At that point, extract only the contracts demonstrated by tests and real use.
