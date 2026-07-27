/** Cloudflare Worker entry point for the agent-terminal-status website. */
import handler from "vinext/server/app-router-entry";

import appleTouchIconData from "./static/apple-touch-icon.png?inline";
import faviconData from "./static/favicon.ico?inline";
import faviconSvg from "./static/favicon.svg?raw";
import geistFontData from "./static/Geist-Variable.woff2?inline";
import geistMonoFontData from "./static/GeistMono-Variable.woff2?inline";
import geistLicense from "./static/LICENSE-Geist.txt?raw";
import icon192Data from "./static/icon-192.png?inline";
import icon512Data from "./static/icon-512.png?inline";
import icon512MaskableData from "./static/icon-512-maskable.png?inline";
import ogImageData from "./static/og.jpg?inline";
import robotsText from "./static/robots.txt?raw";
import manifestText from "./static/site.webmanifest?raw";
import sitemapText from "./static/sitemap.xml?raw";

type AssetsEnvironment = {
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
};

type EmbeddedAsset = {
  body: ArrayBuffer;
  cacheControl: string;
  contentType: string;
};

const immutable = "public, max-age=31536000, immutable";
const shortCache = "public, max-age=3600";
const deliveryAssetPrefix = "/delivery/assets/";
const securityHeaders = {
  "Content-Security-Policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function decodeInlineAsset(dataUrl: string): ArrayBuffer {
  const separator = dataUrl.indexOf(",");
  if (separator < 0 || !dataUrl.slice(0, separator).endsWith(";base64")) {
    throw new Error("Expected a base64-encoded inline asset.");
  }

  const binary = atob(dataUrl.slice(separator + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function encodeTextAsset(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

function binaryAsset(
  dataUrl: string,
  contentType: string,
  cacheControl = shortCache,
): EmbeddedAsset {
  return {
    body: decodeInlineAsset(dataUrl),
    cacheControl,
    contentType,
  };
}

function textAsset(
  value: string,
  contentType: string,
  cacheControl = shortCache,
): EmbeddedAsset {
  return {
    body: encodeTextAsset(value),
    cacheControl,
    contentType,
  };
}

const embeddedAssets = new Map<string, EmbeddedAsset>([
  [
    "/font-assets/Geist-Variable.woff2",
    binaryAsset(geistFontData, "font/woff2", immutable),
  ],
  [
    "/font-assets/GeistMono-Variable.woff2",
    binaryAsset(geistMonoFontData, "font/woff2", immutable),
  ],
  [
    "/font-assets/LICENSE-Geist.txt",
    textAsset(geistLicense, "text/plain; charset=utf-8"),
  ],
  ["/apple-touch-icon.png", binaryAsset(appleTouchIconData, "image/png")],
  ["/favicon.ico", binaryAsset(faviconData, "image/x-icon")],
  [
    "/favicon.svg",
    textAsset(faviconSvg, "image/svg+xml; charset=utf-8"),
  ],
  ["/icon-192.png", binaryAsset(icon192Data, "image/png")],
  ["/icon-512.png", binaryAsset(icon512Data, "image/png")],
  [
    "/icon-512-maskable.png",
    binaryAsset(icon512MaskableData, "image/png"),
  ],
  ["/og.jpg", binaryAsset(ogImageData, "image/jpeg")],
  ["/robots.txt", textAsset(robotsText, "text/plain; charset=utf-8")],
  [
    "/site.webmanifest",
    textAsset(manifestText, "application/manifest+json; charset=utf-8"),
  ],
  [
    "/sitemap.xml",
    textAsset(sitemapText, "application/xml; charset=utf-8"),
  ],
]);

function deliveredAssetPath(pathname: string): string | undefined {
  if (!pathname.startsWith(deliveryAssetPrefix)) {
    return undefined;
  }

  const relativePath = pathname.slice(deliveryAssetPrefix.length);
  const segments = relativePath.split("/");
  if (
    !relativePath ||
    relativePath.includes("%") ||
    relativePath.includes("\\") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return undefined;
  }
  return `/assets/${relativePath}`;
}

function embeddedResponse(asset: EmbeddedAsset, method: string): Response {
  return new Response(method === "HEAD" ? null : asset.body.slice(0), {
    headers: {
      "Cache-Control": asset.cacheControl,
      "Content-Length": String(asset.body.byteLength),
      "Content-Type": asset.contentType,
    },
  });
}

export default {
  async fetch(
    request: Request,
    environment: AssetsEnvironment,
    context: ExecutionContext,
  ) {
    const url = new URL(request.url);
    const assetMethod = request.method === "GET" || request.method === "HEAD";
    const embeddedAsset = embeddedAssets.get(url.pathname);
    const deliveredAsset = deliveredAssetPath(url.pathname);
    let response: Response;

    if (assetMethod && embeddedAsset) {
      response = embeddedResponse(embeddedAsset, request.method);
    } else if (
      assetMethod &&
      (url.pathname.startsWith("/fonts/") ||
        url.pathname.startsWith("/assets/"))
    ) {
      // These are backing-store paths, not the website's delivery interface.
      // Sites may still expose generated /assets files before Worker routing;
      // every browser-visible reference uses /delivery/assets instead.
      response = new Response("Not found", { status: 404 });
    } else if (assetMethod && deliveredAsset && environment?.ASSETS) {
      const backingUrl = new URL(deliveredAsset, request.url);
      backingUrl.search = url.search;
      response = await environment.ASSETS.fetch(
        new Request(backingUrl, {
          headers: request.headers,
          method: request.method,
        }),
      );
      if (response.status === 200) {
        const deliveredHeaders = new Headers(response.headers);
        deliveredHeaders.set("Cache-Control", immutable);
        response = new Response(response.body, {
          headers: deliveredHeaders,
          status: response.status,
          statusText: response.statusText,
        });
      }
    } else {
      response = await handler.fetch(request, environment, context);
    }

    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(securityHeaders)) {
      headers.set(name, value);
    }
    if (
      embeddedAsset &&
      url.pathname.startsWith("/font-assets/") &&
      url.pathname.endsWith(".woff2")
    ) {
      headers.set(
        "Link",
        '</font-assets/LICENSE-Geist.txt>; rel="license"',
      );
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
