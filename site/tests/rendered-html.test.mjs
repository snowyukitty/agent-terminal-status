import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://agent-terminal-status.example/", {
      headers: { accept: "text/html" },
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
    /https:\/\/agent-terminal-status\.example\/og\.png/,
  );
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/agent-terminal-status\.example\/"/,
  );
  assert.match(
    html,
    /href="https:\/\/agent-terminal-status\.example\/favicon\.svg"/,
  );
  assert.match(
    html,
    /href="https:\/\/agent-terminal-status\.example\/site\.webmanifest"/,
  );
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});

test("keeps the shipped site frontend-only and free of starter residue", async () => {
  const [page, layout, css, packageJson, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /agent-terminal-status/);
  assert.match(page, /CopyCommand/);
  assert.match(layout, /themeColor:\s*"#111712"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /focus-visible/);
  assert.doesNotMatch(
    `${page}\n${layout}\n${packageJson}`,
    /codex-preview|_sites-preview|react-loading-skeleton|drizzle/i,
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
  ]);
});

test("public links use the canonical repository", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const repositoryUrl = "https://github.com/snowyukitty/agent-terminal-status";

  assert.match(page, new RegExp(repositoryUrl.replaceAll("/", "\\/")));
  assert.doesNotMatch(page, /PUBLIC URL REQUIRED|example\.com\/agent-terminal-status/);
});
