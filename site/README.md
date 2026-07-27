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
```

`npm test` builds the production output and verifies rendered HTML, core copy,
accessibility markers, fixed-origin metadata, security headers, portable asset
paths, self-hosted font MIME and cache policy, canonical repository links, and
the absence of starter or persistence scaffolding. Production builds first
remove only the site's resolved `dist` and `.vinext` generated directories so
deleted or renamed assets cannot survive from an earlier build or cache.

## Structure

- `app/page.tsx` — product content and semantic layout
- `app/globals.css` — responsive visual system
- `app/CopyCommand.tsx` — small clipboard enhancement
- `public/` — favicon, crawler files, compact social preview, and self-hosted
  Geist variable fonts
- `public/_headers` — security and immutable cache policy for edge-served assets
- `worker/index.ts` — matching response security for server-rendered routes
- `tests/rendered-html.test.mjs` — production-render checks

The two Geist font files come from the official `geist` 1.7.2 package and are
distributed under the SIL Open Font License included beside them. Keeping them
local removes a build-time network dependency and prevents build-machine paths
from entering the deployed CSS.

`.openai/hosting.json` intentionally contains only the public, non-secret Sites
project identifier and null logical bindings. Credentials and runtime values
are never stored there.

The repository's root [README](../README.md) remains the canonical installation
and technical reference.
