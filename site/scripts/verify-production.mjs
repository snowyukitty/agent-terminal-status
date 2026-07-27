import assert from "node:assert/strict";

const defaultOrigin =
  "https://agent-terminal-status.gldtestuser.chatgpt.site";
const origin = new URL(process.argv[2] ?? process.env.SITE_ORIGIN ?? defaultOrigin);
const immutable = "public, max-age=31536000, immutable";
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

const page = await fetchOk("/", {
  headers: {
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "http",
  },
});
assertSecurityHeaders(page, "/");
const html = await page.text();
assert.match(html, new RegExp(`<link rel="canonical" href="${origin.origin}/"`));
assert.doesNotMatch(html, /evil\.example/);

const stylesheetPath = html.match(/href="([^"]+\.css)"/)?.[1];
assert.ok(stylesheetPath, "The deployed page did not reference a stylesheet.");
const stylesheet = await fetchOk(stylesheetPath);
assertSecurityHeaders(stylesheet, stylesheetPath);
assert.equal(stylesheet.headers.get("cache-control"), immutable);
const css = await stylesheet.text();
assert.match(css, /\/font-assets\/Geist-Variable\.woff2/);
assert.match(css, /\/font-assets\/GeistMono-Variable\.woff2/);
assert.doesNotMatch(css, /url\(["']?\/fonts\//);

for (const filename of [
  "Geist-Variable.woff2",
  "GeistMono-Variable.woff2",
]) {
  const pathname = `/font-assets/${filename}?production-smoke=1`;
  const response = await fetchOk(pathname);
  assertSecurityHeaders(response, pathname);
  assert.match(response.headers.get("content-type") ?? "", /^font\/woff2\b/i);
  assert.equal(response.headers.get("cache-control"), immutable);
  assert.ok(
    Number(response.headers.get("content-length")) > 60_000,
    `${pathname} returned an implausibly small font`,
  );
}

for (const pathname of [
  "/favicon.svg",
  "/og.jpg",
  "/site.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]) {
  const response = await fetchOk(pathname);
  assertSecurityHeaders(response, pathname);
}

for (const pathname of [
  "/fonts/Geist-Variable.woff2",
  "/fonts/GeistMono-Variable.woff2",
  "/font-assets/Missing.woff2",
]) {
  const response = await fetch(url(pathname));
  assert.equal(response.status, 404, `${pathname} returned ${response.status}`);
  assertSecurityHeaders(response, pathname);
  assert.notEqual(response.headers.get("cache-control"), immutable);
}

console.log(`Production delivery verified at ${origin.origin}`);
