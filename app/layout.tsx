import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mbrista — Meticulous Espresso Control Center",
  description:
    "The open community control plane for Meticulous espresso machines. Browse profiles, monitor shots, share data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/[0.05] py-5 text-center text-xs text-[#f5f0ea]/25">
          mbrista — open source, always free ·{" "}
          <a
            href="https://discord.gg/w48ha2h3"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#f5f0ea]/50 transition-colors"
          >
            Meticulous Discord
          </a>
        </footer>
      </body>
    </html>
  );
}
