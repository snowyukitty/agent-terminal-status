import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const productionOrigin =
  "https://agent-terminal-status.gldtestuser.chatgpt.site";
const immutable = "public, max-age=31536000, immutable";

async function render({
  pathname = "/",
  headers = {},
  assetResponse,
} = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://request-origin.invalid${pathname}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async (request) =>
          assetResponse?.(request) ?? new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function textBuildArtifacts(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await textBuildArtifacts(path)));
    } else if (/\.(?:css|html|js|json|txt|xml)$/i.test(entry.name)) {
      results.push(path);
    }
  }
  return results;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssVariable(css, name) {
  const value = css.match(
    new RegExp(`${escapeRegex(name)}\\s*:\\s*(#[0-9a-f]{6})`, "i"),
  )?.[1];
  assert.match(value ?? "", /^#[0-9a-f]{6}$/i, `Invalid CSS variable ${name}`);
  return value;
}

function cssColor(css, selector) {
  const escapedSelector = escapeRegex(selector);
  const declaration = css.match(
    new RegExp(`${escapedSelector}\\s*\\{[^}]*\\bcolor:\\s*([^;]+);`, "s"),
  )?.[1].trim();
  assert.ok(declaration, `Missing color for ${selector}`);

  const variable = declaration.match(/^var\((--[^)]+)\)$/)?.[1];
  const value = variable ? cssVariable(css, variable) : declaration;
  assert.match(value ?? "", /^#[0-9a-f]{6}$/i, `Invalid color for ${selector}`);
  return value;
}

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = [1, 3, 5].map((index) => {
      const value = Number.parseInt(color.slice(index, index + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("server-renders the complete product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>agent-terminal-status — Know where your agent is working<\/title>/i,
  );
  assert.match(html, /One quiet line\./);
  assert.match(html, /Zero workspace doubt\./);
  assert.match(html, /Install in 30 seconds/);
  assert.match(html, /Windows PowerShell 5\.1/);
  assert.match(html, /git clone https:\/\/github\.com\/snowyukitty\/agent-terminal-status/);
  assert.match(html, /workspace\.current_dir/);
  assert.match(html, /href="\/docs"/);
  assert.match(html, /Skip to content/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(
    html,
    /https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/og\.jpg/,
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/"/,
  );
  assert.match(
    html,
    /href="https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/favicon\.svg"/,
  );
  assert.match(
    html,
    /href="https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/site\.webmanifest"/,
  );
  assert.match(html, /(?:href|src)="\/delivery\/assets\//);
  assert.doesNotMatch(html, /(?:href|src)="\/assets\//);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("server-renders the complete four-language field guide", async () => {
  const response = await render({ pathname: "/docs" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>How it works — A field guide in four languages · agent-terminal-status<\/title>/i,
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/docs"/,
  );
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/og\.jpg"/,
  );
  assert.match(html, /A field guide · 4 languages · 1 invariant/);
  assert.match(html, /id="guide-en"[^>]*lang="en"/);
  assert.match(html, /id="guide-es"[^>]*lang="es"/);
  assert.match(html, /id="guide-ja"[^>]*lang="ja"/);
  assert.match(html, /id="guide-zh-hant"[^>]*lang="zh-Hant"/);
  assert.match(
    html,
    /id="guide-en"[\s\S]*id="guide-es"[\s\S]*id="guide-ja"[\s\S]*id="guide-zh-hant"/,
  );
  assert.match(html, /Five careful moves, then quiet\./);
  assert.match(html, /Cinco pasos cuidadosos y, después, silencio\./);
  assert.match(html, /五つの慎重な動作。そのあとは静かに。/);
  assert.match(html, /五個謹慎步驟，然後安靜下來。/);
  assert.match(html, /workspace\.current_dir/);
  assert.match(html, /git -C &lt;cwd&gt;/);
  assert.match(html, /150 ms/);
  assert.match(html, /Cc · Cf · Cs · Zl · Zp/);
  assert.match(html, /name="docs-language"/);
  assert.equal((html.match(/name="docs-language"/g) ?? []).length, 4);
  assert.match(html, /<legend class="visually-hidden">Choose guide language<\/legend>/);
  assert.match(html, /type="radio"/);
  assert.match(html, /aria-controls="guide-es"/);
  assert.match(html, /aria-controls="guide-zh-hant"/);
  assert.match(html, /for="docs-language-es"/);
  assert.match(html, /for="docs-language-ja"/);
  assert.match(
    html,
    /<label class="language-tab" for="docs-language-es" lang="es">/,
  );
  assert.match(
    html,
    /<label class="language-tab" for="docs-language-ja" lang="ja">/,
  );
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="#guide"/);
  assert.match(html, /<button[^>]*>コピー<\/button>/);
  assert.match(html, /<button[^>]*>Copiar<\/button>/);
  assert.match(html, /<button[^>]*>複製<\/button>/);
  assert.match(html, /Skip to the guide/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /(?:href|src)="\/assets\//);
  assert.doesNotMatch(html, /(?:href|src)="\/fonts\//);
});

test("metadata origin is fixed even with untrusted forwarding headers", async () => {
  const response = await render({
    headers: {
      host: "evil.example",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
    },
  });
  const html = await response.text();

  assert.match(html, new RegExp(`${productionOrigin.replaceAll(".", "\\.")}/`));
  assert.doesNotMatch(html, /evil\.example/);

  const docsResponse = await render({
    pathname: "/docs",
    headers: {
      host: "evil.example",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
    },
  });
  const docsHtml = await docsResponse.text();
  assert.match(
    docsHtml,
    new RegExp(`${productionOrigin.replaceAll(".", "\\.")}/docs`),
  );
  assert.doesNotMatch(docsHtml, /evil\.example/);
});

test("applies security headers and immutable font caching", async () => {
  const page = await render();
  assert.equal(
    page.headers.get("content-security-policy"),
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  );
  assert.equal(
    page.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("x-frame-options"), "DENY");

  const font = await render({
    pathname: "/font-assets/Geist-Variable.woff2",
  });
  assert.equal(font.status, 200);
  assert.equal(
    font.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(font.headers.get("content-type"), "font/woff2");
  assert.equal(font.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    font.headers.get("link"),
    '</font-assets/LICENSE-Geist.txt>; rel="license"',
  );
  assert.ok((await font.arrayBuffer()).byteLength > 60_000);

  const fontLicense = await render({
    pathname: "/font-assets/LICENSE-Geist.txt",
  });
  assert.equal(fontLicense.status, 200);
  assert.match(
    fontLicense.headers.get("content-type") ?? "",
    /^text\/plain\b/i,
  );
  assert.match(await fontLicense.text(), /SIL OPEN FONT LICENSE Version 1\.1/);

  const missingFont = await render({ pathname: "/font-assets/missing.woff2" });
  assert.equal(missingFont.status, 404);
  assert.notEqual(
    missingFont.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );

  let directFontReachedAssets = false;
  const directFont = await render({
    pathname: "/fonts/Geist-Variable.woff2",
    assetResponse: () => {
      directFontReachedAssets = true;
      return new Response("unexpected");
    },
  });
  assert.equal(directFont.status, 404);
  assert.equal(directFontReachedAssets, false);
  assert.equal(directFont.headers.get("x-content-type-options"), "nosniff");

  const stylesheet = await render({
    pathname: "/delivery/assets/index-contenthash.css",
    assetResponse: (request) => {
      assert.equal(
        new URL(request.url).pathname,
        "/assets/index-contenthash.css",
      );
      return new Response("body {}", {
        headers: { "content-type": "text/css" },
      });
    },
  });
  assert.equal(stylesheet.status, 200);
  assert.equal(stylesheet.headers.get("content-type"), "text/css");
  assert.equal(
    stylesheet.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(stylesheet.headers.get("x-content-type-options"), "nosniff");

  let directAssetReachedBinding = false;
  const directAsset = await render({
    pathname: "/assets/index-contenthash.css",
    assetResponse: () => {
      directAssetReachedBinding = true;
      return new Response("unexpected");
    },
  });
  assert.equal(directAsset.status, 404);
  assert.equal(directAssetReachedBinding, false);

  for (const pathname of [
    "/.vite/manifest.json",
    "/_headers",
    "/.assetsignore",
  ]) {
    const internalAsset = await render({ pathname });
    assert.equal(internalAsset.status, 404);
    assert.equal(
      internalAsset.headers.get("x-content-type-options"),
      "nosniff",
    );
  }

  for (const [pathname, contentType] of [
    ["/favicon.svg", /^image\/svg\+xml/],
    ["/og.jpg", /^image\/jpeg/],
    ["/site.webmanifest", /^application\/manifest\+json/],
    ["/robots.txt", /^text\/plain/],
    ["/sitemap.xml", /^application\/xml/],
  ]) {
    const publicAsset = await render({ pathname });
    assert.equal(publicAsset.status, 200);
    assert.match(publicAsset.headers.get("content-type") ?? "", contentType);
    assert.equal(publicAsset.headers.get("x-frame-options"), "DENY");
    assert.notEqual(publicAsset.headers.get("cache-control"), immutable);
  }
});

test("keeps small informational text at AA contrast", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const terminalBackground = cssVariable(css, "--terminal");
  const paperBackground = cssVariable(css, "--paper");

  assert.ok(
    contrastRatio(cssColor(css, ".status-row .sep"), terminalBackground) >= 4.5,
    "terminal separators must meet WCAG AA contrast",
  );
  assert.ok(
    contrastRatio(cssColor(css, ".principle em"), paperBackground) >= 4.5,
    "principle labels must meet WCAG AA contrast",
  );
});

test("build output is portable and routes assets through the Worker", async () => {
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  const artifacts = await textBuildArtifacts(dist);
  const [contents, layout, packageJson, wranglerConfig] = await Promise.all([
    Promise.all(artifacts.map((path) => readFile(path, "utf8"))),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
  ]);
  const bundle = contents.join("\n");
  const wrangler = JSON.parse(wranglerConfig);
  const styles = (
    await Promise.all(
      artifacts
        .filter((path) => path.endsWith(".css"))
        .map((path) => readFile(path, "utf8")),
    )
  ).join("\n");

  assert.equal(
    JSON.parse(packageJson).scripts.build,
    "node build/clean-dist.mjs && vinext build && node build/finalize-dist.mjs",
  );
  assert.doesNotMatch(
    bundle,
    /file:\/\/|(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]|\/home\/runner\/work\//im,
  );
  assert.doesNotMatch(layout, /next\/font|fonts\.googleapis\.com/i);
  assert.match(styles, /\/font-assets\/Geist-Variable\.woff2/);
  assert.match(styles, /\/font-assets\/GeistMono-Variable\.woff2/);
  assert.doesNotMatch(styles, /url\(["']?\/fonts\//);
  assert.equal(wrangler.assets?.binding, "ASSETS");
  assert.equal(wrangler.assets?.run_worker_first, true);

  await Promise.all([
    access(new URL("../worker/static/Geist-Variable.woff2", import.meta.url)),
    access(new URL("../worker/static/GeistMono-Variable.woff2", import.meta.url)),
    access(new URL("../worker/static/LICENSE-Geist.txt", import.meta.url)),
    assert.rejects(
      access(new URL("../dist/client/fonts/Geist-Variable.woff2", import.meta.url)),
    ),
    assert.rejects(
      access(new URL("../dist/client/fonts/GeistMono-Variable.woff2", import.meta.url)),
    ),
    assert.rejects(access(new URL("../dist/client/favicon.svg", import.meta.url))),
    assert.rejects(access(new URL("../dist/client/og.jpg", import.meta.url))),
    assert.rejects(
      access(new URL("../dist/client/assets/_vinext_fonts", import.meta.url)),
    ),
  ]);
  assert.deepEqual((await readdir(join(dist, "client"))).sort(), ["assets"]);
});

test("keeps the shipped site frontend-only and free of starter residue", async () => {
  const [page, docsPage, docsContent, layout, css, packageJson, hosting, viteConfig, worker] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/docs/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/docs/content.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
      readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    ]);

  assert.match(page, /agent-terminal-status/);
  assert.match(page, /CopyCommand/);
  assert.match(layout, /themeColor:\s*"#111712"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /focus-visible/);
  assert.match(
    css,
    /#docs-language-en:checked\s*~\s*\.guide-panels\s+\.guide-panel-en/,
  );
  assert.match(
    css,
    /#docs-language-es:checked\s*~\s*\.guide-panels\s+\.guide-panel-es/,
  );
  assert.doesNotMatch(
    css,
    /\.language-radio\s*\{[^}]*display:\s*none/s,
    "Language radios must remain keyboard-focusable without JavaScript",
  );
  assert.match(css, /\.brand-label\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.site-header nav > a[^}]*display:\s*none/s);
  assert.doesNotMatch(
    `${page}\n${docsPage}\n${docsContent}\n${layout}\n${packageJson}\n${viteConfig}\n${worker}`,
    /codex-preview|_sites-preview|react-loading-skeleton|drizzle|site-creator|vinext-starter/i,
  );
  assert.deepEqual(JSON.parse(hosting), {
    project_id: "appgprj_6a666cda52ec8191828ccc5806b870b1",
    d1: null,
    r2: null,
  });

  await Promise.all([
    assert.rejects(access(new URL("../app/chatgpt-auth.ts", import.meta.url))),
    assert.rejects(access(new URL("../db/index.ts", import.meta.url))),
    assert.rejects(access(new URL("../drizzle/meta/_journal.json", import.meta.url))),
    assert.rejects(access(new URL("../drizzle.config.ts", import.meta.url))),
    assert.rejects(access(new URL("../public/favicon-head.html", import.meta.url))),
  ]);
});

test("ships compact social and crawler assets", async () => {
  const socialImage = new URL("../worker/static/og.jpg", import.meta.url);
  const imageStats = await stat(socialImage);
  const sitemap = await readFile(
    new URL("../worker/static/sitemap.xml", import.meta.url),
    "utf8",
  );

  assert.ok(imageStats.size < 200_000, `og.jpg is ${imageStats.size} bytes`);
  assert.match(
    sitemap,
    /<loc>https:\/\/agent-terminal-status\.gldtestuser\.chatgpt\.site\/docs<\/loc>/,
  );
  await Promise.all([
    access(new URL("../worker/static/robots.txt", import.meta.url)),
    access(new URL("../worker/static/sitemap.xml", import.meta.url)),
  ]);
});

test("public links use the canonical repository", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const repositoryUrl = "https://github.com/snowyukitty/agent-terminal-status";

  assert.match(page, new RegExp(repositoryUrl.replaceAll("/", "\\/")));
  assert.doesNotMatch(page, /PUBLIC URL REQUIRED|example\.com\/agent-terminal-status/);
});
