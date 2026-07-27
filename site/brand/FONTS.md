# Font provenance

The website self-hosts two files from the official
[`geist` 1.7.2 package](https://www.npmjs.com/package/geist), sourced from
Vercel's [`geist-font`](https://github.com/vercel/geist-font) repository:

| File | SHA-256 |
| --- | --- |
| `Geist-Variable.woff2` | `a369fcf5628ea2aa4e1b9e2ec6a5b3624e365bda588e1f0f2f12b564f728fbb8` |
| `GeistMono-Variable.woff2` | `fba8f577f38a2bbcbe818efa6348dd58f36303a10b8737c42fefad275be563ab` |

They are distributed under the SIL Open Font License copied to
`worker/static/LICENSE-Geist.txt`. The files are committed so production builds
do not fetch fonts or depend on build-machine paths.
