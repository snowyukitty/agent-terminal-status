/** Cloudflare Worker entry point for the agent-terminal-status website. */
import handler from "vinext/server/app-router-entry";

type AssetsEnvironment = {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
};

const securityHeaders = {
  "Content-Security-Policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const fontAssets = new Map([
  ["/font-assets/Geist-Variable.woff2", "/fonts/Geist-Variable.woff2"],
  ["/font-assets/GeistMono-Variable.woff2", "/fonts/GeistMono-Variable.woff2"],
]);

export default {
  async fetch(
    request: Request,
    environment: AssetsEnvironment,
    context: ExecutionContext,
  ) {
    const url = new URL(request.url);
    const fontAsset = fontAssets.get(url.pathname);
    const response =
      fontAsset && environment?.ASSETS
        ? await environment.ASSETS.fetch(
            new Request(new URL(fontAsset, request.url), {
              headers: request.headers,
              method: request.method,
            }),
          )
        : await handler.fetch(request, environment, context);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }

    if (
      response.status === 200 &&
      fontAsset
    ) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Content-Type", "font/woff2");
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
