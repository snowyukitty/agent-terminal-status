# Contributing

Thanks for helping make coding-agent workspaces easier to identify.

The best contributions are small, testable, and tied to a recurring workflow
problem. Before adding a field, ask whether it prevents confusion, whether its
source is reliable, and what should happen when it is missing or slow.

## Development setup

There are no project dependencies to install.

- Python 3.9 or newer exercises the portable adapter and installer.
- Windows PowerShell 5.1 exercises the first-class Windows adapter.
- PowerShell 7 is also tested where available.
- Git is optional at runtime but required for Git scenario tests.

Run:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\run.ps1
pwsh -NoProfile -File .\tests\run.ps1
python .\scripts\demo.py
```

On macOS or Linux, run the Python suite and smoke-test the shell wrapper:

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
sh scripts/install.sh --config-dir /tmp/ats-claude-test
/tmp/ats-claude-test/agent-terminal-status/uninstall.sh
```

Use a disposable `--config-dir` or `-ConfigDir` when testing installers. Do not
point tests at a real Claude configuration.

## Change guidelines

- Keep the default path-first, monochrome, compact, and dependency-light.
- Preserve parity between `src/statusline.py` and `src/statusline.ps1` when
  behavior is shared.
- Put a deadline around external commands and degrade to useful path identity.
- Add tests for spaces, non-ASCII text, missing values, and narrow widths when
  touching parsing or rendering.
- Treat install and uninstall changes as data-migration code: preserve unrelated
  settings, refuse ambiguous replacement, and make reruns safe.
- Keep code, comments, logs, documentation, and fixtures in English.
- Do not include real home paths, hostnames, account names, credentials, or
  private repository names in fixtures or screenshots.

For a significant product or architecture change, add a concise decision note
under `docs/decisions/`. Record the evidence, the smaller alternatives, and the
condition that would justify revisiting the choice.

## Research and upstream work

Technical claims should link to current primary sources. Search existing
Claude Code issues before preparing upstream material. The repository already
tracks equivalent native-current-directory requests in
[docs/upstream.md](docs/upstream.md); do not create another duplicate.

Prototype evidence is welcome. Claims about latency or compatibility should
include the command, environment, sample size, and observed limitations.

## Pull requests

Keep a pull request focused on one coherent outcome. Include:

- the user problem;
- the behavior change and fallback;
- checks run and their actual results;
- screenshots or demo output for visible changes;
- performance measurements when the render path changes.

By contributing, you agree that your contribution is licensed under the MIT
License in this repository.
