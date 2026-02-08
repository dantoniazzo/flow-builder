import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow Builder",
  description: "Visual workflow automation builder with AI assistance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
