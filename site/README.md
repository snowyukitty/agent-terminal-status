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
accessibility markers, canonical repository links, and the absence of starter
or persistence scaffolding.

## Structure

- `app/page.tsx` — product content and semantic layout
- `app/globals.css` — responsive visual system
- `app/CopyCommand.tsx` — small clipboard enhancement
- `public/` — favicon and social preview
- `tests/rendered-html.test.mjs` — production-render checks

The repository's root [README](../README.md) remains the canonical installation
and technical reference.
