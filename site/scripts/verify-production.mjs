import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const defaultOrigin =
  "https://agent-terminal-status.gldtestuser.chatgpt.site";
const origin = new URL(process.argv[2] ?? process.env.SITE_ORIGIN ?? defaultOrigin);
const immutable = "public, max-age=31536000, immutable";
const productionProbe = randomUUID();
const securityHeaders = {
  "content-security-policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function url(pathname) {
  return new URL(pathname, origin);
}

function probe(pathname) {
  const target = url(pathname);
  target.searchParams.set("production-smoke", productionProbe);
  return `${target.pathname}${target.search}`;
}

function assertSecurityHeaders(response, pathname) {
  for (const [name, expected] of Object.entries(securityHeaders)) {
    assert.equal(
      response.headers.get(name),
      expected,
      `${pathname} has an unexpected ${name} header`,
    );
  }
}

async function fetchOk(pathname, options) {
  const response = await fetch(url(pathname), options);
  assert.equal(response.status, 200, `${pathname} returned ${response.status}`);
  return response;
}

const forwardingPage = await fetchOk("/", {
  headers: {
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "http",
  },
});
assertSecurityHeaders(forwardingPage, "/");
const forwardingHtml = await forwardingPage.text();
assert.match(
  forwardingHtml,
  new RegExp(`<link rel="canonical" href="${origin.origin}/"`),
);
assert.doesNotMatch(forwardingHtml, /evil\.example/);

const pageProbePath = probe("/");
const page = await fetchOk(pageProbePath);
assertSecurityHeaders(page, pageProbePath);
const html = await page.text();
assert.match(html, new RegExp(`<link rel="canonical" href="${origin.origin}/"`));

const docsProbePath = probe("/docs");
const docsPage = await fetchOk(docsProbePath);
assertSecurityHeaders(docsPage, docsProbePath);
assert.match(docsPage.headers.get("content-type") ?? "", /^text\/html\b/i);
const docsHtml = await docsPage.text();
assert.match(
  docsHtml,
  new RegExp(`<link rel="canonical" href="${origin.origin}/docs"`),
);
for (const [id, lang] of [
  ["en", "en"],
  ["es", "es"],
  ["ja", "ja"],
  ["zh-hant", "zh-Hant"],
]) {
  assert.match(
    docsHtml,
    new RegExp(`id="guide-${id}"[^>]*lang="${lang}"`),
  );
}
assert.match(docsHtml, /Cinco pasos cuidadosos y, después, silencio\./);
assert.match(docsHtml, /workspace\.current_dir/);
assert.match(docsHtml, /git -C/);
assert.match(docsHtml, /150 ms/);

const renderedHtml = `${html}\n${docsHtml}`;
assert.doesNotMatch(renderedHtml, /(?:href|src)="\/assets\//);
const stylesheetPaths = [
  ...new Set(
    [...renderedHtml.matchAll(/href="([^"]+\.css)"/g)].map(
      (match) => match[1],
    ),
  ),
];
assert.ok(
  stylesheetPaths.length > 0,
  "The deployed pages did not reference a stylesheet.",
);
const cssBodies = [];
for (const stylesheetPath of stylesheetPaths) {
  assert.match(stylesheetPath, /^\/delivery\/assets\//);
  const stylesheetProbePath = probe(stylesheetPath);
  const stylesheet = await fetchOk(stylesheetProbePath);
  assertSecurityHeaders(stylesheet, stylesheetProbePath);
  assert.equal(stylesheet.headers.get("cache-control"), immutable);
  assert.match(
    stylesheet.headers.get("content-type") ?? "",
    /^text\/css\b/i,
  );
  cssBodies.push(await stylesheet.text());
}
const css = cssBodies.join("\n");
assert.match(css, /\/font-assets\/Geist-Variable\.woff2/);
assert.match(css, /\/font-assets\/GeistMono-Variable\.woff2/);
assert.doesNotMatch(css, /url\(["']?\/fonts\//);

const scriptPaths = [
  ...new Set(
    [...renderedHtml.matchAll(/\b(?:href|src)="([^"]+\.js)"/g)].map(
      (match) => match[1],
    ),
  ),
];
assert.ok(scriptPaths.length > 0, "The deployed page did not reference scripts.");
for (const scriptPath of scriptPaths) {
  assert.match(scriptPath, /^\/delivery\/assets\//);
  const scriptProbePath = probe(scriptPath);
  const response = await fetchOk(scriptProbePath);
  assertSecurityHeaders(response, scriptProbePath);
  assert.equal(response.headers.get("cache-control"), immutable);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^(?:application|text)\/javascript\b/i,
  );
}

for (const filename of [
  "Geist-Variable.woff2",
  "GeistMono-Variable.woff2",
]) {
  const pathname = probe(`/font-assets/${filename}`);
  const response = await fetchOk(pathname);
  assertSecurityHeaders(response, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^font\/woff2\b/i);
  assert.equal(response.headers.get("cache-control"), immutable);
  assert.equal(
    response.headers.get("link"),
    '</font-assets/LICENSE-Geist.txt>; rel="license"',
  );
  assert.ok(
    (await response.arrayBuffer()).byteLength > 60_000,
    `${pathname} returned an implausibly small font`,
  );
}

const fontLicensePath = probe("/font-assets/LICENSE-Geist.txt");
const fontLicense = await fetchOk(fontLicensePath);
assertSecurityHeaders(fontLicense, fontLicensePath);
assert.match(
  fontLicense.headers.get("content-type") ?? "",
  /^text\/plain\b/i,
);
assert.match(await fontLicense.text(), /SIL OPEN FONT LICENSE Version 1\.1/);

for (const [pathname, contentType] of [
  ["/apple-touch-icon.png", /^image\/png\b/i],
  ["/favicon.ico", /^image\/x-icon\b/i],
  ["/favicon.svg", /^image\/svg\+xml\b/i],
  ["/icon-192.png", /^image\/png\b/i],
  ["/icon-512.png", /^image\/png\b/i],
  ["/icon-512-maskable.png", /^image\/png\b/i],
  ["/og.jpg", /^image\/jpeg\b/i],
  ["/site.webmanifest", /^application\/manifest\+json\b/i],
  ["/robots.txt", /^text\/plain\b/i],
  ["/sitemap.xml", /^application\/xml\b/i],
]) {
  const probePath = probe(pathname);
  const response = await fetchOk(probePath);
  assertSecurityHeaders(response, probePath);
  assert.match(response.headers.get("content-type") ?? "", contentType);
  assert.ok(
    (await response.arrayBuffer()).byteLength > 0,
    `${pathname} returned an empty body`,
  );
}

for (const pathname of [
  "/fonts/Geist-Variable.woff2",
  "/fonts/GeistMono-Variable.woff2",
  "/fonts/LICENSE-Geist.txt",
  "/font-assets/Missing.woff2",
  "/.vite/manifest.json",
  "/_headers",
  "/.assetsignore",
]) {
  const probePath = probe(pathname);
  const response = await fetch(url(probePath));
  assert.equal(response.status, 404, `${probePath} returned ${response.status}`);
  assertSecurityHeaders(response, probePath);
  assert.notEqual(response.headers.get("cache-control"), immutable);
}

const backingStylesheetPath = stylesheetPaths[0].replace(
  /^\/delivery\/assets\//,
  "/assets/",
);
const backingProbePath = probe(backingStylesheetPath);
const backingResponse = await fetch(url(backingProbePath));
assert.ok(
  backingResponse.status === 200 || backingResponse.status === 404,
  `${backingProbePath} returned ${backingResponse.status}`,
);

console.log(
  `Production delivery verified at ${origin.origin} ` +
    `(provider backing route: ${backingResponse.status})`,
);
