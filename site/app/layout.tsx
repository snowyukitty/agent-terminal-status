import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteOrigin = new URL(
  "https://agent-terminal-status.gldtestuser.chatgpt.site",
);
const socialImage = new URL("/og.jpg", siteOrigin);

export const metadata: Metadata = {
  metadataBase: siteOrigin,
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
    url: siteOrigin,
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
    description: "A quiet workspace identity line for terminal coding agents.",
    images: [socialImage],
  },
};

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
      <body>{children}</body>
    </html>
  );
}
