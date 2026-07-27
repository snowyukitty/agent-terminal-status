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

function isPackagedAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") ||
    /\.(?:css|ico|jpe?g|js|png|svg|txt|webmanifest|xml)$/i.test(pathname)
  );
}

export default {
  async fetch(
    request: Request,
    environment: AssetsEnvironment,
    context: ExecutionContext,
  ) {
    const url = new URL(request.url);
    const fontAsset = fontAssets.get(url.pathname);
    const assetMethod = request.method === "GET" || request.method === "HEAD";
    let response: Response;

    if (assetMethod && url.pathname.startsWith("/fonts/")) {
      response = new Response("Not found", { status: 404 });
    } else if (assetMethod && fontAsset && environment?.ASSETS) {
      response = await environment.ASSETS.fetch(
        new Request(new URL(fontAsset, request.url), {
          headers: request.headers,
          method: request.method,
        }),
      );
    } else if (
      assetMethod &&
      isPackagedAsset(url.pathname) &&
      environment?.ASSETS
    ) {
      response = await environment.ASSETS.fetch(request);
    } else {
      response = await handler.fetch(request, environment, context);
    }
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

    if (response.status === 200 && url.pathname.startsWith("/assets/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
