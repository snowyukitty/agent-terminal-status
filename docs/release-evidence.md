# Public release evidence

This is the canonical evidence gate for calling version 0.1 a public release.
The engineering checkpoint can be complete while these observations remain
open.

Evidence is observed, not inferred. A passing automated test, deterministic
demo, or simulated payload cannot stand in for a real Claude Code session.
Record negative observations as carefully as successful ones.

## Gate

| ID | Status | Required evidence |
| --- | --- | --- |
| R1 | Open | Regular use spanning at least seven days, with at least three real Claude Code sessions across two or more workspaces. Record the first and last observation, overlapping-session use when available, and every visible failure or confusion. |
| R2 | Open | One real in-product screenshot on Windows and one in a POSIX terminal. Each record includes the Claude Code version, OS, terminal, date, status-line configuration, and a completed privacy review. |
| R3 | Open | One actual Claude Code session in each of SSH, WSL, and a container. Record the expected and observed workspace path and public host alias; a label such as `pass` without the observation is insufficient. |
| R4 | Open | Feedback on hostname visibility in real use. Record when it improved orientation, when it added clutter, any privacy concern, and the resulting `auto` versus opt-in decision without presupposing the answer. |
| R5 | Open | Final revision provenance and live delivery. Record the final Git commit SHA, the matching Sites saved-version source SHA, the production URL, and a successful manually dispatched `Production smoke` run URL after deployment. |

Change a status only when the linked observations satisfy the full row. Keep
the table concise; put observation details in reviewed, sanitized artifacts.

## Observation record

Use this structure for each raw observation:

```text
Gate:
Observed at (UTC):
Claude Code version:
OS and terminal:
Session context:
ATS configuration:
Expected:
Observed:
Result:
Sanitized artifact:
Privacy review:
Limitations or follow-up:
```

For R1, maintain a chronological log rather than reconstructing a week from
memory. For R4, preserve the reason behind each preference; a vote without
context is weak product evidence.

## Private staging boundary

Store raw screenshots, session notes, real hostnames, and real paths under
`.evidence-private/` or outside the repository. That directory is ignored by
Git. Never paste raw evidence into a public issue, pull request, commit,
workflow input, or Actions log.

Prefer privacy at capture time:

- use a public sample repository and a public machine alias;
- close or rename tabs whose titles reveal private projects or users;
- keep unrelated prompts, notifications, tokens, and account details out of
  the frame;
- inspect both visible pixels and file metadata before publication;
- retain the unedited raw observation privately and publish only a reviewed,
  sanitized derivative.

Only sanitized artifacts intended for public evidence belong under
`docs/evidence/`. Do not create that directory until such an artifact exists.

## Engineering freeze and reopen rule

Incomplete R1-R5 evidence is not a software finding and does not trigger
another static review round. Reopen engineering work only when at least one of
these occurs:

- a real session produces reproducible wrong identity, blank output, privacy
  exposure, or install/rollback failure;
- `Production smoke` fails;
- a Claude Code, runtime, dependency, or Sites platform change breaks a tested
  contract;
- the intended final release revision changes runtime behavior.

Hostname preference feedback is product-decision input, not an automatic code
change. Before any future real-use follow-up or new upstream submission,
perform the fresh duplicate and thread review described in
[upstream.md](upstream.md).
