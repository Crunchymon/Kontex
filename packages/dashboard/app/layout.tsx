import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontex — Institutional memory for AI-native teams",
  description:
    "The ledger of intelligence: vector-searchable shared context behind a human approval gate, accessible from any LLM."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-on-background antialiased">{children}</body>
    </html>
  );
}
