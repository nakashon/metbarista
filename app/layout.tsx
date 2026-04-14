import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { MobileHeader } from "@/components/mobile-header";
import { BottomNav } from "@/components/bottom-nav";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "metbarista",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // respect iPhone notch & home bar safe areas
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
        {/* Top navbar — desktop md+ */}
        <Navbar />
        {/* Mobile header — logo + connection dot */}
        <MobileHeader />
        {/* Main content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0">
          {children}
        </main>
        {/* Footer — desktop only */}
        <footer className="hidden md:block border-t border-white/[0.05] py-5 text-center text-xs text-[#f5f0ea]/25">
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
        {/* Bottom nav — mobile/tablet only */}
        <BottomNav />
      </body>
    </html>
  );
}
