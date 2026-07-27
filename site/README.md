# Project website

The public product page for `agent-terminal-status`.

It is a single responsive page with no database, authentication, analytics, or
application backend. The source uses Next-compatible components so the Sites
build can produce a deployable Cloudflare Worker, but all product content and
interaction remain frontend-only.

## Development

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
npm test
npm run lint
npm run verify:production
```

`npm test` builds the production output and verifies rendered HTML, core copy,
accessibility markers, fixed-origin metadata, security headers, portable asset
paths, the self-hosted font delivery route, canonical repository links, and the
absence of starter or persistence scaffolding. Production builds first remove
only the site's resolved `dist` and `.vinext` generated directories so deleted
or renamed assets cannot survive from an earlier build or cache.

`npm run verify:production` checks the deployed origin rather than the local
Worker alone. It verifies the document, Worker-delivered stylesheet, embedded
public assets, font routes, cache policy, fixed-origin metadata, and the
blocked legacy font and build-internal paths. It also reports whether the
hosting provider exposes the generated asset store directly, without treating
that implementation path as the website's delivery interface.

## Structure

- `app/page.tsx` — product content and semantic layout
- `app/globals.css` — responsive visual system
- `app/CopyCommand.tsx` — small clipboard enhancement
- `worker/static/` — favicon, crawler files, compact social preview, and
  self-hosted Geist variable fonts bundled into the Worker
- `worker/index.ts` — embedded static delivery, generated-asset routing, and
  one response security policy
- `scripts/verify-production.mjs` — read-only deployment smoke test
- `tests/rendered-html.test.mjs` — production-render checks

The two Geist font files come from the official `geist` 1.7.2 package and are
distributed under the SIL Open Font License included beside them. Keeping them
local removes a build-time network dependency and prevents build-machine paths
from entering the deployed CSS. Fonts and stable public files are compiled into
the Worker rather than copied into the provider's public asset directory. The
stylesheet uses `/font-assets/` routes with explicit WOFF2 MIME and immutable
caching. The accompanying license remains available at
`/font-assets/LICENSE-Geist.txt` and is advertised on each font response with
`rel="license"`; the old `/fonts/` paths have no deployed files behind them.

The generated Workers configuration deliberately enables
[`assets.run_worker_first`](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first).
Vite emits browser references under `/delivery/assets/`; the Worker maps that
prefix to the generated, content-hashed `/assets/` backing store and applies
security headers plus immutable caching. This adds one globally distributed
Worker hop to assets the page actually loads in exchange for an observable,
testable response policy.

The Sites deployment layer observed on 2026-07-27 still served a directly
requested generated `/assets/` file before Worker routing despite the generated
`run_worker_first` setting. Those provider storage URLs contain only trusted,
content-hashed build output and are never referenced by rendered HTML. They are
not treated as a security boundary. `npm run verify:production` checks the
browser-visible delivery paths and reports the backing-route status so a
platform behavior change will be visible rather than assumed.

After vinext finishes, `build/finalize-dist.mjs` removes its client manifest,
Pages-only headers file, upload-ignore file, and any legacy font directory.
The build then requires `dist/client` to contain only the generated hashed
`assets/` directory. This prevents build-time metadata from becoming an
accidental public interface.

Production verification is separate from push CI because a push can finish
before a Sites deployment. The `Production smoke` GitHub Actions workflow runs
on demand after deployment and on a weekly schedule, avoiding that race while
keeping the live edge behavior observable.

HSTS remains a hosting-layer decision. The project does not install a
long-lived browser transport pin on a provider-owned subdomain; reconsider it
if the site moves to a custom domain controlled by the project.

`.openai/hosting.json` intentionally contains only the public, non-secret Sites
project identifier and null logical bindings. Credentials and runtime values
are never stored there.

The repository's root [README](../README.md) remains the canonical installation
and technical reference.
