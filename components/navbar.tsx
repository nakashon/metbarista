"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Gauge, History, Layers, Users, GitCompare, Radio, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionDot } from "./connection-dot";

const NAV_LINKS = [
  { href: "/dashboard",  label: "Dashboard", icon: Gauge },
  { href: "/history",    label: "Shots",     icon: History },
  { href: "/profiles",   label: "Profiles",  icon: Layers },
  { href: "/live",       label: "Live Shot", icon: Radio },
  { href: "/compare",    label: "Compare",   icon: GitCompare },
  { href: "/import",     label: "Import",    icon: Upload },
  { href: "/community",  label: "Community", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    // Hidden on mobile — bottom nav takes over. Visible md+.
    <header className="hidden md:block sticky top-0 z-50 border-b border-white/[0.05] bg-[#0c0a09]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 flex h-[52px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5C444]/15 text-[#F5C444] group-hover:bg-[#F5C444]/25 transition-colors">
            <Coffee className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-[#f5f0ea] tracking-tight">MetBarista</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                pathname.startsWith(href)
                  ? "bg-[#F5C444]/10 text-[#F5C444]"
                  : "text-[#f5f0ea]/45 hover:text-[#f5f0ea] hover:bg-white/[0.04]"
              )}>
              <Icon className="h-3.5 w-3.5" />{label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="https://nakashon.com" target="_blank" rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1 text-xs text-[#f5f0ea]/20 hover:text-[#f5f0ea]/50 transition-colors">
            by Asaf Nakash
          </a>
          <a href="https://github.com/nakashon/metbarista" target="_blank" rel="noopener noreferrer"
            title="Star on GitHub"
            className="flex items-center text-[#f5f0ea]/30 hover:text-[#f5f0ea]/70 transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <ConnectionDot />
        </div>
      </div>
    </header>
  );
}
