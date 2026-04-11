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
    <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#0c0a09]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 flex h-[52px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8944a]/15 text-[#e8944a] group-hover:bg-[#e8944a]/25 transition-colors">
            <Coffee className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-[#f5f0ea] tracking-tight">mbrista</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                pathname.startsWith(href)
                  ? "bg-[#e8944a]/10 text-[#e8944a]"
                  : "text-[#f5f0ea]/45 hover:text-[#f5f0ea] hover:bg-white/[0.04]"
              )}>
              <Icon className="h-3.5 w-3.5" />{label}
            </Link>
          ))}
        </nav>

        <ConnectionDot />
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center overflow-x-auto gap-0.5 px-4 pb-2 scrollbar-none">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all shrink-0",
              pathname.startsWith(href)
                ? "bg-[#e8944a]/10 text-[#e8944a]"
                : "text-[#f5f0ea]/40 hover:text-[#f5f0ea] hover:bg-white/[0.04]"
            )}>
            <Icon className="h-3 w-3" />{label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
