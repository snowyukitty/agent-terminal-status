/** Cloudflare Worker entry point for the agent-terminal-status website. */
import handler from "vinext/server/app-router-entry";

const securityHeaders = {
  "Content-Security-Policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export default {
  async fetch(...arguments_: Parameters<typeof handler.fetch>) {
    const [request] = arguments_;
    const response = await handler.fetch(...arguments_);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }

    if (
      response.status === 200 &&
      new URL(request.url).pathname.endsWith(".woff2")
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
