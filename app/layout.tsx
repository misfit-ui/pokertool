import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Global styles

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poker Replayer",
  description: "Import and replay CoinPoker hand histories.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body
        className="bg-zinc-950 text-zinc-50 min-h-screen"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
