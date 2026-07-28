import type { Metadata } from "next";
import { CopyCommand } from "../CopyCommand";
import { guides, type GuideContent } from "./content";

const repositoryUrl =
  "https://github.com/snowyukitty/agent-terminal-status";
const windowsInstall = `git clone ${repositoryUrl}.git; cd agent-terminal-status; powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\install.ps1`;
const posixInstall = `git clone ${repositoryUrl}.git && cd agent-terminal-status && sh scripts/install.sh`;

export const metadata: Metadata = {
  title: "How it works — A field guide in three languages",
  description:
    "Explore how agent-terminal-status turns Claude Code context into one safe, width-aware workspace identity line—in English, Japanese, and Traditional Chinese.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    type: "article",
    url: "/docs",
    title: "The one-line compass for coding agents",
    description:
      "A visual, three-language guide to workspace identity, Unicode safety, terminal width, privacy, and reversible installation.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "agent-terminal-status workspace identity line",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The one-line compass for coding agents",
    description:
      "How one quiet line keeps a terminal full of agents oriented.",
    images: ["/og.jpg"],
  },
};

function Journey({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-journey">
      <header className="guide-section-heading">
        <p>{guide.journey.eyebrow}</p>
        <h3>{guide.journey.title}</h3>
        <span>{guide.journey.intro}</span>
      </header>
      <ol className="journey-track">
        {guide.journey.steps.map((step, index) => (
          <li key={step.code}>
            <div className="journey-node" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="journey-copy">
              <div className="journey-meta">
                <span>{step.label}</span>
                <code>{step.code}</code>
              </div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Principles({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-principles">
      <header className="guide-section-heading">
        <p>{guide.principles.eyebrow}</p>
        <h3>{guide.principles.title}</h3>
      </header>
      <div className="guide-principle-grid">
        {guide.principles.items.map((item) => (
          <article key={item.marker}>
            <span>{item.marker}</span>
            <h4>{item.title}</h4>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function WidthTheatre({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-width">
      <header className="guide-section-heading">
        <p>{guide.width.eyebrow}</p>
        <h3>{guide.width.title}</h3>
        <span>{guide.width.intro}</span>
      </header>
      <div className="width-stage">
        <div className="width-stage-top">
          <span>renderer / same identity</span>
          <span>terminal cells</span>
        </div>
        {guide.width.cases.map((example) => (
          <article key={example.columns}>
            <div className="width-ruler">
              <strong>{example.columns}</strong>
              <span>{example.label}</span>
            </div>
            <code>{example.output}</code>
            <p>{example.note}</p>
          </article>
        ))}
      </div>
      <p className="width-caption">
        <span aria-hidden="true">↳</span>
        {guide.width.caption}
      </p>
    </section>
  );
}

function Rollback({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-rollback">
      <header className="guide-section-heading">
        <p>{guide.rollback.eyebrow}</p>
        <h3>{guide.rollback.title}</h3>
        <span>{guide.rollback.intro}</span>
      </header>
      <ol className="rollback-track">
        {guide.rollback.phases.map((phase) => (
          <li key={phase.number}>
            <span>{phase.number}</span>
            <h4>{phase.title}</h4>
            <p>{phase.body}</p>
          </li>
        ))}
      </ol>
      <aside className="honest-warning">
        <span className="honest-warning-mark" aria-hidden="true">
          !
        </span>
        <div>
          <strong>{guide.rollback.warningTitle}</strong>
          <p>{guide.rollback.warningBody}</p>
        </div>
      </aside>
    </section>
  );
}

function Privacy({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-privacy">
      <header className="guide-section-heading">
        <p>{guide.privacy.eyebrow}</p>
        <h3>{guide.privacy.title}</h3>
        <span>{guide.privacy.intro}</span>
      </header>
      <div className="privacy-grid">
        {guide.privacy.facts.map((fact, index) => (
          <article key={fact.title}>
            <span aria-hidden="true">
              {["↘", "○", "⌁"][index]}
            </span>
            <h4>{fact.title}</h4>
            <p>{fact.body}</p>
          </article>
        ))}
      </div>
      <div className="alias-note">
        <div className="alias-example" aria-hidden="true">
          <span>hostname.local</span>
          <i>→</i>
          <strong>public-alias</strong>
        </div>
        <div>
          <h4>{guide.privacy.aliasTitle}</h4>
          <p>{guide.privacy.aliasBody}</p>
          <code>ATS_MACHINE=public-alias</code>
          <code>ATS_SHOW_HOST=never</code>
        </div>
      </div>
    </section>
  );
}

function QuickStart({ guide }: { guide: GuideContent }) {
  return (
    <section
      className="guide-section guide-quick-start"
      id={`${guide.id}-quick-start`}
    >
      <header className="guide-section-heading">
        <p>{guide.quickStart.eyebrow}</p>
        <h3>{guide.quickStart.title}</h3>
        <span>{guide.quickStart.intro}</span>
      </header>
      <div className="guide-install-grid">
        <article className="guide-install-card guide-install-windows">
          <div>
            <strong>{guide.quickStart.windowsTitle}</strong>
            <span>PowerShell 5.1+</span>
          </div>
          <p>{guide.quickStart.windowsBody}</p>
          <CopyCommand
            command={windowsInstall}
            label={guide.quickStart.windowsLabel}
            copyText={guide.quickStart.copyText}
            copiedText={guide.quickStart.copiedText}
          />
        </article>
        <article className="guide-install-card">
          <div>
            <strong>{guide.quickStart.posixTitle}</strong>
            <span>Python 3.9+</span>
          </div>
          <p>{guide.quickStart.posixBody}</p>
          <CopyCommand
            command={posixInstall}
            label={guide.quickStart.posixLabel}
            copyText={guide.quickStart.copyText}
            copiedText={guide.quickStart.copiedText}
          />
        </article>
      </div>
      <p className="guide-after-install">{guide.quickStart.after}</p>
    </section>
  );
}

function Boundaries({ guide }: { guide: GuideContent }) {
  return (
    <section className="guide-section guide-boundaries">
      <header className="guide-section-heading">
        <p>{guide.boundaries.eyebrow}</p>
        <h3>{guide.boundaries.title}</h3>
        <span>{guide.boundaries.intro}</span>
      </header>
      <ul>
        {guide.boundaries.items.map((item, index) => (
          <li key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{item}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Guide({ guide }: { guide: GuideContent }) {
  const headingId = `${guide.id}-title`;

  return (
    <article
      className={`guide-article guide-panel guide-panel-${guide.id}`}
      id={`guide-${guide.id}`}
      lang={guide.lang}
      aria-labelledby={headingId}
    >
      <header className="guide-intro">
        <p>{guide.eyebrow}</p>
        <h2 id={headingId}>{guide.title}</h2>
        <div>
          <span>{guide.lede}</span>
          <blockquote>{guide.thesis}</blockquote>
        </div>
      </header>
      <Journey guide={guide} />
      <Principles guide={guide} />
      <WidthTheatre guide={guide} />
      <Rollback guide={guide} />
      <Privacy guide={guide} />
      <QuickStart guide={guide} />
      <Boundaries guide={guide} />
      <section className="guide-close">
        <p>{guide.close.title}</p>
        <h3>{guide.close.body}</h3>
        <div>
          <a
            className="button button-light"
            href={`#${guide.id}-quick-start`}
          >
            {guide.close.install}
          </a>
          <a className="guide-source-link" href={repositoryUrl}>
            {guide.close.source} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </article>
  );
}

export default function DocsPage() {
  return (
    <>
      <a className="skip-link" href="#docs-main">
        Skip to the guide
      </a>

      <header className="site-header docs-header">
        <a className="brand" href="/" aria-label="agent-terminal-status home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-label">agent-terminal-status</span>
        </a>
        <nav aria-label="Guide navigation">
          <a href="/">Home</a>
          <a href="/#install">Install</a>
          <a href="#guide" aria-current="page">
            Guide
          </a>
          <a className="nav-github" href={repositoryUrl}>
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main className="docs-main" id="docs-main">
        <section className="docs-hero">
          <div className="docs-orbit" aria-hidden="true">
            <span>cwd</span>
            <span>git</span>
            <span>width</span>
          </div>
          <div className="docs-hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              A field guide · 3 languages · 1 invariant
            </p>
            <h1>
              The one-line compass
              <br />
              for coding agents.
            </h1>
            <p>
              Follow one status line from Claude&apos;s JSON payload to a safe,
              width-aware workspace identity—and see why the path always gets
              the last word.
            </p>
            <div className="docs-language-badges" aria-label="Available languages">
              <span lang="en">English</span>
              <span lang="ja">日本語</span>
              <span lang="zh-Hant">繁體中文</span>
            </div>
          </div>

          <div className="compass-console" aria-label="Workspace identity example">
            <div className="compass-console-top">
              <span>orientation / active</span>
              <i aria-hidden="true" />
            </div>
            <div className="compass-map" aria-hidden="true">
              <span className="map-repo">repo</span>
              <span className="map-path">docs / research</span>
              <span className="map-agent">agent</span>
            </div>
            <div className="compass-readout">
              <span>YOU ARE HERE</span>
              <code>
                agent-terminal-status/docs/research · feature/identity ·
                snowy-atlas
              </code>
            </div>
            <div className="compass-rule">
              <span>location</span>
              <strong>always</strong>
              <span>branch + host</span>
              <strong>adaptive</strong>
            </div>
          </div>
        </section>

        <section className="language-library" id="languages">
          <header>
            <p className="kicker">Choose a voice, keep the same truth</p>
            <h2>Three doors into the same little machine.</h2>
            <p>
              Each guide is written for its language—not stacked through a
              translation filter. Open one; the complete HTML remains
              available to browsers, readers, and search engines.
            </p>
          </header>
          <fieldset className="language-selector">
            <legend className="visually-hidden">Choose guide language</legend>
            {guides.map((guide) => (
              <input
                aria-controls={`guide-${guide.id}`}
                className="language-radio"
                defaultChecked={guide.id === "en"}
                id={`docs-language-${guide.id}`}
                key={guide.id}
                name="docs-language"
                type="radio"
              />
            ))}
            <div className="language-tabs">
              {guides.map((guide) => (
                <label
                  className="language-tab"
                  htmlFor={`docs-language-${guide.id}`}
                  key={guide.id}
                  lang={guide.lang}
                >
                  <span className="language-code">{guide.shortLabel}</span>
                  <span className="language-summary-copy">
                    <strong>{guide.languageName}</strong>
                    <small>{guide.summary}</small>
                  </span>
                  <span className="language-toggle" aria-hidden="true">
                    ↘
                  </span>
                </label>
              ))}
            </div>
            <div className="guide-panels" id="guide">
              {guides.map((guide) => (
                <Guide guide={guide} key={guide.id} />
              ))}
            </div>
          </fieldset>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>agent-terminal-status</span>
        </div>
        <p>
          <span lang="en">One quiet line</span>
          <span aria-hidden="true"> · </span>
          <span lang="ja">静かな一行</span>
          <span aria-hidden="true"> · </span>
          <span lang="zh-Hant">安靜的一行</span>
        </p>
        <div className="footer-links">
          <a href="/">Home</a>
          <a href={`${repositoryUrl}/blob/main/README.md`}>Reference</a>
          <a href={repositoryUrl}>GitHub ↗</a>
        </div>
      </footer>
    </>
  );
}
