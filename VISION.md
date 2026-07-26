# Vision

## A workspace identity layer for coding agents

Terminal coding agents make software work more parallel. A developer may have
several sessions open across repositories, subdirectories, branches, worktrees,
containers, and machines. The terminal window still looks familiar, but the
cost of confusing one workspace for another is rising.

`agent-terminal-status` starts with a small invariant:

> The current workspace identity should be visible without asking the agent.

This is not primarily decoration. Persistent identity improves orientation,
reduces wrong-repository actions, makes handoffs easier to verify, and gives
multi-agent workflows a stable place to express increasingly important state.

## Product principles

### Identity before telemetry

The current directory is more fundamental than token counts, cost, or model
names. It answers where an action will land. Repository, worktree, branch, and
machine add disambiguation, but they must not obscure the path.

### Quiet by default

A status line competes with code and conversation for attention. The default
should be one monochrome line with no setup choices. Optional information
should disappear gracefully when space is scarce.

### Reliable signals only

An absent value is better than a misleading one. Collectors need explicit
fallbacks, deadlines, and provenance. State inferred from slow remote APIs does
not belong in the default render path.

### Local and privacy-conscious

Workspace paths and hostnames can be sensitive. Version 0.1 computes everything
locally, makes machine aliases easy, and does not transmit status data.

### Native where possible, adapters where necessary

A native agent footer can be faster and more consistent than a subprocess.
External adapters remain valuable as prototypes, compatibility layers, and a
place to validate product ideas before asking every agent vendor to maintain
them.

### Architecture follows evidence

Two implementations do not yet justify a plugin framework. The project should
extract stable collectors, models, and render contracts only after multiple
agent surfaces demonstrate real shared requirements.

## Possible capability levels

1. **Workspace identity** — actual directory, repository, worktree, branch, and
   machine.
2. **Development state** — dirty tree, conflicts, ahead/behind, environment,
   linked task, and remote/container context.
3. **Agent state** — agent, model, session, permissions, context, and activity.
4. **Coordination state** — parallel agents, ownership, overlap, locks, and
   handoffs.

Each level must earn its place by preventing a recurring mistake or reducing
real cognitive load. Higher levels should normally be opt-in or progressively
disclosed.

## What success looks like

In the near term, developers can install one small status line, immediately see
where Claude Code is operating, and remove it without residue.

In the medium term, usage evidence identifies a compact cross-agent identity
model and the few environment signals that remain valuable every day.

In the long term, terminal agents expose native, interoperable identity surfaces
that make parallel work legible without requiring a separate dashboard.

The project succeeds even if parts of it become unnecessary because agent tools
adopt the behavior natively.
