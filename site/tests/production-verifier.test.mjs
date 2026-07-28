import assert from "node:assert/strict";
import test from "node:test";

const productionOrigin =
  "https://agent-terminal-status.gldtestuser.chatgpt.site";
const immutable = "public, max-age=31536000, immutable";
const securityHeaders = {
  "content-security-policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};
const publicContentTypes = new Map([
  ["/apple-touch-icon.png", "image/png"],
  ["/favicon.ico", "image/x-icon"],
  ["/favicon.svg", "image/svg+xml"],
  ["/icon-192.png", "image/png"],
  ["/icon-512.png", "image/png"],
  ["/icon-512-maskable.png", "image/png"],
  ["/og.jpg", "image/jpeg"],
  ["/site.webmanifest", "application/manifest+json"],
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "application/xml"],
]);
const blockedPaths = new Set([
  "/fonts/Geist-Variable.woff2",
  "/fonts/GeistMono-Variable.woff2",
  "/fonts/LICENSE-Geist.txt",
  "/font-assets/Missing.woff2",
  "/.vite/manifest.json",
  "/_headers",
  "/.assetsignore",
]);

function response(body, { status = 200, contentType, cacheControl, link } = {}) {
  const headers = new Headers(securityHeaders);
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }
  if (link) {
    headers.set("link", link);
  }
  return new Response(body, { status, headers });
}

function recordingFetch(requests) {
  return async (input, options) => {
    const requestUrl = new URL(
      input instanceof Request ? input.url : String(input),
    );
    assert.equal(requestUrl.origin, productionOrigin);
    requests.push({ options, url: requestUrl });

    if (requestUrl.pathname === "/") {
      return response(
        [
          `<link rel="canonical" href="${productionOrigin}/">`,
          '<link rel="stylesheet" href="/delivery/assets/site.css">',
          '<script src="/delivery/assets/site.js"></script>',
          '<script src="/delivery/assets/other.js"></script>',
        ].join(""),
        { contentType: "text/html" },
      );
    }

    if (requestUrl.pathname === "/docs") {
      return response(
        [
          `<link rel="canonical" href="${productionOrigin}/docs">`,
          '<link rel="stylesheet" href="/delivery/assets/site.css">',
          '<link rel="stylesheet" href="/delivery/assets/docs.css">',
          '<script src="/delivery/assets/site.js"></script>',
          '<script src="/delivery/assets/other.js"></script>',
          '<script src="/delivery/assets/docs.js"></script>',
          '<article id="guide-en" lang="en">workspace.current_dir · git -C · 150 ms</article>',
          '<article id="guide-es" lang="es">Cinco pasos cuidadosos y, después, silencio.</article>',
          '<article id="guide-ja" lang="ja">五つの慎重な動作</article>',
          '<article id="guide-zh-hant" lang="zh-Hant">五個謹慎步驟</article>',
        ].join(""),
        { contentType: "text/html" },
      );
    }

    if (requestUrl.pathname === "/delivery/assets/site.css") {
      return response(
        [
          '@font-face{src:url("/font-assets/Geist-Variable.woff2")}',
          '@font-face{src:url("/font-assets/GeistMono-Variable.woff2")}',
        ].join(""),
        { cacheControl: immutable, contentType: "text/css" },
      );
    }

    if (requestUrl.pathname === "/delivery/assets/docs.css") {
      return response(".guide { display: block; }", {
        cacheControl: immutable,
        contentType: "text/css",
      });
    }

    if (
      requestUrl.pathname === "/delivery/assets/site.js" ||
      requestUrl.pathname === "/delivery/assets/other.js" ||
      requestUrl.pathname === "/delivery/assets/docs.js"
    ) {
      return response("export {};", {
        cacheControl: immutable,
        contentType: "text/javascript",
      });
    }

    if (
      requestUrl.pathname === "/font-assets/Geist-Variable.woff2" ||
      requestUrl.pathname === "/font-assets/GeistMono-Variable.woff2"
    ) {
      return response(new Uint8Array(60_001), {
        cacheControl: immutable,
        contentType: "font/woff2",
        link: '</font-assets/LICENSE-Geist.txt>; rel="license"',
      });
    }

    if (requestUrl.pathname === "/font-assets/LICENSE-Geist.txt") {
      return response("SIL OPEN FONT LICENSE Version 1.1", {
        contentType: "text/plain",
      });
    }

    const publicContentType = publicContentTypes.get(requestUrl.pathname);
    if (publicContentType) {
      return response("asset", { contentType: publicContentType });
    }

    if (
      blockedPaths.has(requestUrl.pathname) ||
      requestUrl.pathname === "/assets/site.css"
    ) {
      return response("Not found", { contentType: "text/plain", status: 404 });
    }

    throw new Error(`Unexpected production request: ${requestUrl.pathname}`);
  };
}

async function runVerifier(runName) {
  const requests = [];
  const originalFetch = globalThis.fetch;
  const originalOriginArgument = process.argv[2];
  const originalLog = console.log;
  globalThis.fetch = recordingFetch(requests);
  process.argv[2] = productionOrigin;
  console.log = () => {};

  try {
    const verifierUrl = new URL(
      "../scripts/verify-production.mjs",
      import.meta.url,
    );
    verifierUrl.searchParams.set(
      "test-run",
      `${process.pid}-${runName}-${Date.now()}`,
    );
    await import(verifierUrl.href);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    if (originalOriginArgument === undefined) {
      delete process.argv[2];
    } else {
      process.argv[2] = originalOriginArgument;
    }
  }

  return requests;
}

function assertProbeContract(requests) {
  const unprobed = requests.filter(
    ({ url }) => !url.searchParams.has("production-smoke"),
  );
  assert.deepEqual(
    unprobed.map(({ url }) => url.pathname),
    ["/"],
    "Only the forwarding-header document request may omit the probe token",
  );

  const probed = requests.filter(({ url }) =>
    url.searchParams.has("production-smoke"),
  );
  const tokens = new Set(
    probed.map(({ url }) => url.searchParams.get("production-smoke")),
  );
  assert.equal(tokens.size, 1, "One run must share exactly one probe token");
  const [token] = tokens;
  assert.match(
    token,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const deliveryRequests = requests.filter(({ url }) =>
    url.pathname.startsWith("/delivery/assets/"),
  );
  assert.deepEqual(
    deliveryRequests.map(({ url }) => url.pathname).sort(),
    [
      "/delivery/assets/docs.css",
      "/delivery/assets/docs.js",
      "/delivery/assets/other.js",
      "/delivery/assets/site.css",
      "/delivery/assets/site.js",
    ],
  );
  assert.ok(
    deliveryRequests.every(
      ({ url }) => url.searchParams.get("production-smoke") === token,
    ),
    "Every browser-delivered asset must use the run's probe token",
  );

  const backingRequest = requests.find(
    ({ url }) => url.pathname === "/assets/site.css",
  );
  assert.equal(
    backingRequest?.url.searchParams.get("production-smoke"),
    token,
    "The provider backing-route diagnostic must not use a stale cache key",
  );

  const docsRequest = requests.find(({ url }) => url.pathname === "/docs");
  assert.equal(
    docsRequest?.url.searchParams.get("production-smoke"),
    token,
    "The four-language guide must use the run's probe token",
  );

  const rootRequests = requests.filter(({ url }) => url.pathname === "/");
  assert.equal(rootRequests.length, 2);
  const forwardingRequest = rootRequests.find(
    ({ url }) => !url.searchParams.has("production-smoke"),
  );
  const freshDocumentRequest = rootRequests.find(({ url }) =>
    url.searchParams.has("production-smoke"),
  );
  assert.equal(
    forwardingRequest?.options?.headers?.["x-forwarded-host"],
    "evil.example",
  );
  assert.equal(
    freshDocumentRequest?.url.searchParams.get("production-smoke"),
    token,
    "The asset graph must come from a freshly probed document",
  );
  return token;
}

test("production verifier probes every mutable path with one fresh token", async () => {
  const firstToken = assertProbeContract(await runVerifier("first"));
  const secondToken = assertProbeContract(await runVerifier("second"));
  assert.notEqual(firstToken, secondToken, "Independent runs must not reuse tokens");
});
