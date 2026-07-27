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
Worker alone. It verifies the document, generated stylesheet, public assets,
font routes, cache policy, fixed-origin metadata, and the blocked legacy font
paths.

## Structure

- `app/page.tsx` — product content and semantic layout
- `app/globals.css` — responsive visual system
- `app/CopyCommand.tsx` — small clipboard enhancement
- `public/` — favicon, crawler files, compact social preview, and self-hosted
  Geist variable fonts
- `worker/index.ts` — response security plus a small font-asset pass-through
  that normalizes MIME and immutable caching
- `scripts/verify-production.mjs` — read-only deployment smoke test
- `tests/rendered-html.test.mjs` — production-render checks

The two Geist font files come from the official `geist` 1.7.2 package and are
distributed under the SIL Open Font License included beside them. Keeping them
local removes a build-time network dependency and prevents build-machine paths
from entering the deployed CSS. All physical assets run through the Worker
before delivery so its security policy applies consistently. The stylesheet
uses the Worker's `/font-assets/` routes, which fetch the packaged font through
the asset binding and apply the intended MIME and cache policy; the underlying
`/fonts/` paths are not part of the public interface.

The generated Workers configuration deliberately enables
[`assets.run_worker_first`](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first).
This adds one globally distributed Worker hop to physical assets in exchange
for one observable response policy and immutable caching for content-hashed
bundles. Revisit selective routing only if real traffic shows a meaningful
latency or invocation-cost reason.

HSTS remains a hosting-layer decision. The project does not install a
long-lived browser transport pin on a provider-owned subdomain; reconsider it
if the site moves to a custom domain controlled by the project.

`.openai/hosting.json` intentionally contains only the public, non-secret Sites
project identifier and null logical bindings. Credentials and runtime values
are never stored there.

The repository's root [README](../README.md) remains the canonical installation
and technical reference.
