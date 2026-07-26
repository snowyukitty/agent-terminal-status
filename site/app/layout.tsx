import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigin(requestHeaders: Pick<Headers, "get">) {
  const host =
    firstForwardedValue(requestHeaders.get("x-forwarded-host")) ??
    requestHeaders.get("host") ??
    "agent-terminal-status.example";
  const forwardedProtocol = firstForwardedValue(
    requestHeaders.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
        ? "http"
        : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("https://agent-terminal-status.example");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = requestOrigin(await headers());
  const socialImage = new URL("/og.png", origin);

  return {
    metadataBase: origin,
    title: {
      default: "agent-terminal-status — Know where your agent is working",
      template: "%s · agent-terminal-status",
    },
    description:
      "A quiet workspace identity line for Claude Code: actual directory, repository, branch, and machine at a glance.",
    applicationName: "agent-terminal-status",
    keywords: [
      "Claude Code",
      "terminal status line",
      "AI coding agents",
      "workspace identity",
      "Git worktrees",
    ],
    authors: [{ name: "agent-terminal-status contributors" }],
    creator: "agent-terminal-status contributors",
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "32x32" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      url: origin,
      title: "One quiet line. Zero workspace doubt.",
      description:
        "Keep Claude Code's actual project, directory, branch, and machine visible.",
      siteName: "agent-terminal-status",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "agent-terminal-status workspace identity line",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "One quiet line. Zero workspace doubt.",
      description:
        "A quiet workspace identity line for terminal coding agents.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111712",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
