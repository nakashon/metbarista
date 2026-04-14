"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, History, Layers, Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// 5 tabs for mobile — most-used actions next to the machine
const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/profiles",  label: "Profiles",  icon: Layers },
  { href: "/live",      label: "Live",       icon: Radio },
  { href: "/history",   label: "Shots",      icon: History },
  { href: "/community", label: "Community",  icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    // Safe area padding for iPhone home bar; hidden on md+ (desktop uses top navbar)
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#111]/90 backdrop-blur-xl border-t border-white/[0.06] pb-safe">
      <div className="flex items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-all active:scale-95",
                active ? "text-[#F5C444]" : "text-[#f5f0ea]/40"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              <span className="text-[10px] font-medium tracking-wide leading-none">{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#F5C444]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
