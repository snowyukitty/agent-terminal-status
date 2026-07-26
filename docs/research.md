# Research notes

Research snapshot: **2026-07-27**. Local experiments used Claude Code 2.1.220
on Windows 11.

These findings shaped the 0.1 product and architecture. Links favor official
documentation and public source repositories.

## Claude Code integration surface

### The command status line is the correct first surface

Claude Code's [status-line documentation](https://code.claude.com/docs/en/statusline)
defines a custom row that executes a configured command, sends JSON on standard
input, and displays standard output. It is event-driven: the command runs at
session start, after assistant messages, after compaction, and on permission or
Vim mode changes. Updates are debounced by 300 ms; a new update cancels a still
running command.

The status payload directly provides:

- `workspace.current_dir` and `cwd`, with the former preferred;
- the original `workspace.project_dir`;
- added directories;
- linked-worktree and repository identity;
- session, model, context, cost, agent, PR, and other optional fields.

Claude Code supplies `COLUMNS` and `LINES` to the captured command in version
2.1.153 and later. The status line does not consume API tokens. It temporarily
hides during some UI interactions, so "persistent" still has product-level
limitations outside the adapter's control.

The evidence supports using the provided current directory as authoritative,
then collecting only the Git data needed for display. It does not support
polling transcript files or inferring cwd from the command process.

### Windows needs an explicit adapter

The official [Windows status-line guidance](https://code.claude.com/docs/en/statusline#windows-configuration)
says Claude Code may run the command through Git Bash when installed, otherwise
PowerShell. Unquoted Windows backslashes can be consumed as escape characters.
The documented robust form invokes `powershell` and uses forward slashes in the
script path.

That behavior is also represented by public
[issue #79236](https://github.com/anthropics/claude-code/issues/79236).
The installer therefore writes a quoted forward-slash path, and the PowerShell
source contains ASCII only so Windows PowerShell 5.1 does not misdecode a
UTF-8-without-BOM script. Output encoding is set to UTF-8 at runtime.

### Hooks are lifecycle automation, not persistent identity

Claude Code [hooks](https://code.claude.com/docs/en/hooks) can react to tool,
session, prompt, permission, and other lifecycle events. They are useful future
inputs for task or coordination state, but they do not themselves provide a
continuously visible UI row. Using hooks for 0.1 would add state synchronization
without replacing the status-line renderer.

The status line is also disabled when `disableAllHooks` is true, per the
official troubleshooting guidance.

### A plugin cannot currently install the main status line

The [plugin reference](https://code.claude.com/docs/en/plugins-reference)
states that plugin `settings.json` currently supports only `agent` and
`subagentStatusLine`. A plugin can ship subagent row formatting, but not the
main `statusLine` default.

This rules out a clean Claude plugin for 0.1. A small installer that modifies
user settings reversibly is more honest than presenting a plugin that still
requires manual main-status configuration.

### User settings are the practical default

Claude supports user, project, local, managed, and command-line settings
described in the [settings reference](https://code.claude.com/docs/en/settings).
The status line itself can be configured at user or project scope. Workspace
identity is useful across projects, so the installer targets user settings.
Project-specific aliases can still be supplied through environment
configuration.

## Existing implementations

The ecosystem already contains rich status-line formatters:

- [Starship's Claude Code status line](https://starship.rs/advanced-config/#statusline-for-claude-code)
  has a dedicated profile with model, Git branch, context, and cost modules.
- [ccstatusline](https://github.com/sirmalloc/ccstatusline) offers extensive
  widgets, themes, Git caching, worktree state, and Windows-specific fixes.
- [cc-statusline](https://github.com/chongdashu/cc-statusline) is another
  configurable multi-segment implementation.

These projects validate the integration surface and demand for status data.
They also show that another feature-rich formatter would be weak
differentiation. The smaller opportunity is dependable workspace identity:
path-first output, no font or package-manager dependency, bounded Git work, and
safe rollback.

## Adjacent agent and prompt experiences

OpenAI Codex CLI exposes built-in ordered
[`tui.status_line`](https://learn.chatgpt.com/docs/config-file/config-reference#tui-status-line)
and
[`tui.terminal_title`](https://learn.chatgpt.com/docs/config-file/config-reference#tui-terminal-title)
configuration. This is useful precedent: identity segments can be native,
composable, and separately useful in the footer and terminal tab title.

Starship contributes two other useful principles:

- modules should be composable rather than hard-coded into many layouts;
- expensive repository or remote information should not block the prompt.

For 0.1, those principles become separate collection/render functions and a
strict Git deadline, not a module framework.

## Existing Claude Code requests

A duplicate search found multiple open requests that materially overlap the
native goal:

| Issue | Overlap |
| --- | --- |
| [#70132](https://github.com/anthropics/claude-code/issues/70132) | Exact request for visible current working directory across parallel projects |
| [#81298](https://github.com/anthropics/claude-code/issues/81298) | Exact current project/directory context request |
| [#74344](https://github.com/anthropics/claude-code/issues/74344) | Actual monorepo subfolder instead of only Git root |
| [#1669](https://github.com/anthropics/claude-code/issues/1669) | Long-running cwd confusion and wrong-directory behavior |
| [#80011](https://github.com/anthropics/claude-code/issues/80011) | Keep status information visible during active processing |
| [#74408](https://github.com/anthropics/claude-code/issues/74408) | Emit terminal cwd sequences for tab/window integration |
| [#60097](https://github.com/anthropics/claude-code/issues/60097) | Worktree/cwd identity in Claude Code Desktop |
| [#71582](https://github.com/anthropics/claude-code/issues/71582) | Persistent status in Desktop |
| [#77829](https://github.com/anthropics/claude-code/issues/77829) | Custom status-line parity in the VS Code extension |

On the snapshot date, #70132, #81298, and #74344 were open and had no comments.
The correct upstream action is to strengthen an existing focused issue, not
create another one.

## Public contribution surface

Claude Code's public
[feature-request template](https://github.com/anthropics/claude-code/blob/main/.github/ISSUE_TEMPLATE/feature_request.yml)
requires submitters to search existing requests and keep a request to one
feature. The public repository exposes documentation, plugins, examples,
changelog, and issue workflows, but not the core CLI TUI implementation or a
general contribution guide.

The credible path for this feature is therefore:

1. use the prototype in realistic parallel sessions;
2. publish reproducible demo, compatibility, and performance evidence;
3. add a focused comment to the earliest matching issue;
4. offer implementation details without assuming the private TUI architecture;
5. make a documentation contribution only if maintainers request or accept that
   surface.

A speculative pull request against the public repository is not currently a
credible route.

## Product conclusions

1. **Actual cwd is the invariant.** Use repo-relative context, not only repo
   root or launch directory.
2. **Branch and machine are secondary.** They help disambiguate worktrees and
   remote sessions, but narrow output should sacrifice them before path.
3. **Monochrome is a reliability feature.** It works in logs, screen readers,
   basic fonts, and unknown terminals.
4. **No continuous polling by default.** Identity changes infrequently, and a
   PowerShell process every second would be wasteful.
5. **Bound Git, never path.** If Git is missing or slow, show directory and
   machine immediately.
6. **Treat install as migration.** Existing settings and later edits are user
   data, not replaceable defaults.
7. **Native advocacy should be narrower than the long-term vision.** Ask first
   for visible current directory; let evidence earn richer state.
