import { CopyCommand } from "./CopyCommand";

const repositoryUrl =
  "https://github.com/snowyukitty/agent-terminal-status";

const windowsInstall = `git clone ${repositoryUrl}.git; cd agent-terminal-status; powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1`;
const posixInstall = `git clone ${repositoryUrl}.git && cd agent-terminal-status && sh scripts/install.sh`;

const signals = [
  {
    label: "Actual directory",
    value: "repo / nested cwd",
    priority: "always",
    description:
      "The place where the next filesystem or Git action will actually land.",
  },
  {
    label: "Git branch",
    value: "main",
    priority: "adaptive",
    description:
      "Useful worktree context, but the first field to leave when width is scarce.",
  },
  {
    label: "Machine",
    value: "snowy-atlas",
    priority: "adaptive",
    description:
      "A local, SSH, WSL, or container identity—with an alias when privacy matters.",
  },
];

const scenarios = [
  ["Repository root", "agent-terminal-status · main · snowy-atlas"],
  [
    "Nested directory",
    "agent-terminal-status/docs/research · feature/identity · snowy-atlas",
  ],
  ["Detached HEAD", "agent-terminal-status · detached@3f21a7c · snowy-atlas"],
  ["Outside Git", "~/scratch/notes · snowy-atlas"],
  ["Narrow terminal", "agent-term…cs/research · snowy-atlas"],
];

const checks = [
  "Windows PowerShell 5.1",
  "PowerShell 7",
  "Python 3.9+",
  "Git Bash routing",
  "Linked worktrees",
  "Detached HEAD",
  "Non-Git directories",
  "CJK & spaced paths",
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="agent-terminal-status home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>agent-terminal-status</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#install">Install</a>
          <a href="#principles">Principles</a>
          <a href="#roadmap">Roadmap</a>
          <a className="nav-github" href={repositoryUrl}>
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              Workspace identity for coding agents
            </div>
            <h1>
              One quiet line.
              <br />
              Zero workspace doubt.
            </h1>
            <p className="hero-lede">
              Keep Claude Code&apos;s actual project, directory, branch, and
              machine visible—without turning your terminal into a dashboard.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#install">
                Install in 30 seconds
              </a>
              <a className="button button-quiet" href={repositoryUrl}>
                View source <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className="hero-footnote">
              Open source · MIT · No telemetry · No network calls in the render
              path
            </p>
          </div>

          <div className="hero-console" aria-label="Example agent sessions">
            <div className="console-topbar">
              <div className="window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span>parallel-workspaces</span>
              <span className="console-count">03</span>
            </div>
            <div className="session">
              <div className="session-meta">
                <span>01 / local</span>
                <span>Claude Code</span>
              </div>
              <div className="status-row">
                <span className="path">agent-terminal-status</span>
                <span className="sep">·</span>
                <span>main</span>
                <span className="sep">·</span>
                <span>snowy-atlas</span>
              </div>
            </div>
            <div className="session session-active">
              <div className="session-meta">
                <span>02 / worktree</span>
                <span>Claude Code</span>
              </div>
              <div className="status-row">
                <span className="path">payments-api/docs</span>
                <span className="sep">·</span>
                <span>feature/handoff</span>
                <span className="sep">·</span>
                <span>snowy-atlas</span>
              </div>
            </div>
            <div className="session">
              <div className="session-meta">
                <span>03 / ssh</span>
                <span>Claude Code</span>
              </div>
              <div className="status-row">
                <span className="path">api/infra/migrations</span>
                <span className="sep">·</span>
                <span>release</span>
                <span className="sep">·</span>
                <span>build-eu</span>
              </div>
            </div>
            <div className="console-caption">
              <span>cwd is the invariant</span>
              <span className="caption-line" />
              <span>branch + host adapt</span>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Verification summary">
          <div>
            <strong>49</strong>
            <span>cross-runtime checks</span>
          </div>
          <div>
            <strong>65.5 ms</strong>
            <span>Python Git p95</span>
          </div>
          <div>
            <strong>283.2 ms</strong>
            <span>Windows PS Git p95</span>
          </div>
          <div>
            <strong>0</strong>
            <span>runtime dependencies on Windows</span>
          </div>
        </section>

        <section className="section problem-section" id="principles">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div>
              <p className="kicker">The expensive mistake is invisible</p>
              <h2>Parallel agents make location a safety signal.</h2>
            </div>
          </div>
          <div className="problem-grid">
            <p className="problem-statement">
              When several terminals look alike, the wrong repository can feel
              exactly like the right one—until a command lands.
            </p>
            <div className="principle-list">
              {signals.map((signal) => (
                <article key={signal.label} className="principle">
                  <div className="principle-topline">
                    <span>{signal.label}</span>
                    <code>{signal.value}</code>
                    <em>{signal.priority}</em>
                  </div>
                  <p>{signal.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section install-section" id="install">
          <div className="section-heading">
            <span className="section-number">02</span>
            <div>
              <p className="kicker">Install once. Remove cleanly.</p>
              <h2>A safe 30-second setup.</h2>
            </div>
          </div>

          <div className="install-grid">
            <article className="install-card install-windows">
              <div className="install-card-head">
                <span className="os-label">Windows</span>
                <span>PowerShell 5.1+</span>
              </div>
              <h3>No extra runtime.</h3>
              <p>
                Uses the PowerShell already present on Windows. Git is optional;
                quoted forward-slash paths survive Claude Code&apos;s Git Bash
                routing.
              </p>
              <CopyCommand command={windowsInstall} label="Windows install command" />
            </article>

            <article className="install-card">
              <div className="install-card-head">
                <span className="os-label">macOS / Linux</span>
                <span>Python 3.9+</span>
              </div>
              <h3>Small and portable.</h3>
              <p>
                The Python adapter uses only the standard library. It follows
                the same rendering and rollback contract as Windows.
              </p>
              <CopyCommand command={posixInstall} label="macOS and Linux install command" />
            </article>
          </div>

          <div className="rollback-note">
            <span className="rollback-icon" aria-hidden="true">
              ↶
            </span>
            <div>
              <strong>Your existing status line is treated as user data.</strong>
              <p>
                Installation refuses ambiguous replacement. With explicit
                force, it saves the exact previous value; uninstall restores it
                only while the active command is still ours.
              </p>
            </div>
            <a href={`${repositoryUrl}#uninstall`}>Uninstall guide ↗</a>
          </div>
        </section>

        <section className="section behavior-section">
          <div className="section-heading">
            <span className="section-number">03</span>
            <div>
              <p className="kicker">Calm under real conditions</p>
              <h2>Useful identity, graceful fallback.</h2>
            </div>
          </div>

          <div className="behavior-layout">
            <div className="scenario-terminal">
              <div className="scenario-head">
                <span>renderer / fixtures</span>
                <span>96 cols</span>
              </div>
              {scenarios.map(([label, output]) => (
                <div className="scenario-row" key={label}>
                  <span>{label}</span>
                  <code>{output}</code>
                </div>
              ))}
            </div>
            <div className="fallback-copy">
              <p>
                The path always wins. If Git is absent, slow, or detached, the
                renderer still returns a useful location instead of a blank
                row.
              </p>
              <ol className="pipeline">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Read Claude context</strong>
                    <p>
                      Prefer <code>workspace.current_dir</code>, then safe
                      fallbacks.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Collect bounded Git identity</strong>
                    <p>
                      <code>git -C</code>, no optional locks, 150 ms deadline.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Render for available width</strong>
                    <p>
                      CJK-aware middle shortening; optional fields leave first.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="section reality-section">
          <div className="section-heading compact-heading">
            <span className="section-number">04</span>
            <div>
              <p className="kicker">Tested against the awkward parts</p>
              <h2>Built for messy terminals.</h2>
            </div>
          </div>
          <div className="check-grid">
            {checks.map((check, index) => (
              <div key={check}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{check}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="section native-section" id="roadmap">
          <div className="native-copy">
            <p className="kicker">Prototype locally. Advocate narrowly.</p>
            <h2>The best endpoint is native identity.</h2>
            <p>
              This project proves the UX through Claude Code&apos;s existing
              command status line. The upstream proposal stays intentionally
              smaller: make the actual current directory persistently visible,
              repository-relative when possible, and adaptive when narrow.
            </p>
            <div className="native-links">
              <a href={`${repositoryUrl}/blob/main/docs/upstream.md`}>
                Read the evidence packet ↗
              </a>
              <a href={`${repositoryUrl}/blob/main/ROADMAP.md`}>
                Explore the roadmap ↗
              </a>
            </div>
          </div>
          <div className="roadmap-stack" aria-label="Project capability levels">
            <article className="roadmap-current">
              <span>Now / validated</span>
              <h3>Workspace identity</h3>
              <p>cwd · repository · worktree · branch · machine</p>
            </article>
            <article>
              <span>Next / evidence first</span>
              <h3>Development state</h3>
              <p>dirty · conflict · ahead/behind · remote context</p>
            </article>
            <article>
              <span>Explore / opt-in</span>
              <h3>Agent coordination</h3>
              <p>task · ownership · overlap · handoff</p>
            </article>
          </div>
        </section>

        <section className="final-cta">
          <div>
            <span className="eyebrow">Know where the next command lands.</span>
            <h2>Give every agent a visible workspace.</h2>
          </div>
          <div className="final-actions">
            <a className="button button-light" href="#install">
              Install agent-terminal-status
            </a>
            <a className="text-link" href={repositoryUrl}>
              Star on GitHub <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>agent-terminal-status</span>
        </div>
        <p>One quiet line that tells you where your coding agent is working.</p>
        <div className="footer-links">
          <a href={`${repositoryUrl}/blob/main/LICENSE`}>MIT License</a>
          <a href={`${repositoryUrl}/blob/main/CONTRIBUTING.md`}>Contribute</a>
          <a href={repositoryUrl}>GitHub ↗</a>
        </div>
      </footer>
    </>
  );
}
