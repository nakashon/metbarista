"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Gauge, History, Layers, Zap, Users, GitCompare, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionDot } from "./connection-dot";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/history", label: "Shots", icon: History },
  { href: "/profiles", label: "Profiles", icon: Layers },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/community", label: "Community", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight text-lg">mbrista</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Connection status */}
        <ConnectionDot />
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center overflow-x-auto gap-1 px-4 pb-2">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0",
              pathname.startsWith(href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
