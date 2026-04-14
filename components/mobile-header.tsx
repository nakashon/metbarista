"use client";
import Link from "next/link";
import { Coffee } from "lucide-react";
import { ConnectionDot } from "./connection-dot";

/**
 * Lightweight mobile top bar — shown only on mobile (md: hidden).
 * Displays the mbrista logo + connection dot without full navbar.
 * Desktop uses the full Navbar component instead.
 */
export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-12 bg-[#111]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F5C444]/15 text-[#F5C444]">
          <Coffee className="h-3 w-3" />
        </div>
        <span className="font-semibold text-sm text-[#f5f0ea] tracking-tight">mbrista</span>
      </Link>
      <ConnectionDot />
    </header>
  );
}
