/**
 * Root Layout
 * 
 * Defines the HTML structure and metadata for the entire application.
 * Uses system fonts for optimal performance and native feel.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sourced | Recipe Suggestions from Products on Sale",
  description: "Discover recipes based on products on sale. Smart cooking made simple.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
