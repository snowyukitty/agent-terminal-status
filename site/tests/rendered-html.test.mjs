import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const productionOrigin =
  "https://agent-terminal-status.gldtestuser.chatgpt.site";

async function render(headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://request-origin.invalid/", {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
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
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("metadata origin is fixed even with untrusted forwarding headers", async () => {
  const response = await render({
    host: "evil.example",
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "http",
  });
  const html = await response.text();

  assert.match(html, new RegExp(`${productionOrigin.replaceAll(".", "\\.")}/`));
  assert.doesNotMatch(html, /evil\.example/);
});

test("build output is portable and self-hosts its fonts", async () => {
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  const artifacts = await textBuildArtifacts(dist);
  const [contents, layout] = await Promise.all([
    Promise.all(artifacts.map((path) => readFile(path, "utf8"))),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  const bundle = contents.join("\n");

  assert.doesNotMatch(
    bundle,
    /file:\/\/|(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]|\/home\/runner\/work\//im,
  );
  assert.doesNotMatch(layout, /next\/font|fonts\.googleapis\.com/i);
  assert.match(bundle, /\/fonts\/Geist-Variable\.woff2/);
  assert.match(bundle, /\/fonts\/GeistMono-Variable\.woff2/);

  await Promise.all([
    access(new URL("../dist/client/fonts/Geist-Variable.woff2", import.meta.url)),
    access(new URL("../dist/client/fonts/GeistMono-Variable.woff2", import.meta.url)),
  ]);
});

test("keeps the shipped site frontend-only and free of starter residue", async () => {
  const [page, layout, css, packageJson, hosting, viteConfig, worker] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
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
  assert.match(css, /\.brand-label\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.site-header nav > a[^}]*display:\s*none/s);
  assert.doesNotMatch(
    `${page}\n${layout}\n${packageJson}\n${viteConfig}\n${worker}`,
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
  const socialImage = new URL("../public/og.jpg", import.meta.url);
  const imageStats = await stat(socialImage);

  assert.ok(imageStats.size < 200_000, `og.jpg is ${imageStats.size} bytes`);
  await Promise.all([
    access(new URL("../public/robots.txt", import.meta.url)),
    access(new URL("../public/sitemap.xml", import.meta.url)),
  ]);
});

test("public links use the canonical repository", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const repositoryUrl = "https://github.com/snowyukitty/agent-terminal-status";

  assert.match(page, new RegExp(repositoryUrl.replaceAll("/", "\\/")));
  assert.doesNotMatch(page, /PUBLIC URL REQUIRED|example\.com\/agent-terminal-status/);
});
