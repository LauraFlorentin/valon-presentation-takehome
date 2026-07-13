import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "./components/AppNav";

export const metadata: Metadata = {
  title: "Valon Deck Studio",
  description:
    "Draft on-brand Valon presentations from a brief, with voice standards, a deck library, and a brand-check audit trail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:ital,wght@0,500;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="app-header">
          <a className="brand-link" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-wordmark.svg" alt="Valon" />
            <span>Deck Studio</span>
          </a>
          <AppNav />
        </header>
        {children}
      </body>
    </html>
  );
}
