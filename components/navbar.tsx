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
          <span className="font-semibold text-[#f5f0ea] tracking-tight">mbrista</span>
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

        <ConnectionDot />
      </div>
    </header>
  );
}
