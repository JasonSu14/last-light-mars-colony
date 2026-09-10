import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Last Light · Mars Colony",
  description: "You create the crisis. Astra keeps the Mars colony alive. A three-minute survival experiment.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
