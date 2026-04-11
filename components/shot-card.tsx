import Link from "next/link";
import { Clock, Weight, Gauge, Droplets } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { ShotEntry } from "@/lib/types";
import { computeShotStats } from "@/lib/machine-api";

interface ShotCardProps {
  shot: ShotEntry;
  href?: string;
  compact?: boolean;
}

export function ShotCard({ shot, href, compact = false }: ShotCardProps) {
  const stats = computeShotStats(shot.data);
  const date = new Date(shot.time * 1000);
  const accent = shot.profile?.display?.accentColor ?? "#e8944a";

  const inner = (
    <div className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#161210] px-4 py-3.5 hover:border-white/[0.10] hover:bg-[#1e1b16] transition-all cursor-pointer">
      <div className="h-1.5 w-1.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: accent }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#f5f0ea] truncate group-hover:text-[#e8944a] transition-colors">{shot.name}</p>
        {!compact && (
          <p className="text-xs text-[#f5f0ea]/35 mt-0.5">
            {format(date, "MMM d, yyyy · HH:mm")} · {formatDistanceToNow(date, { addSuffix: true })}
          </p>
        )}
      </div>
      {!compact && (
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-[#f5f0ea]/40 shrink-0">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{stats.durationSec}s</span>
          <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{stats.finalWeight.toFixed(1)}g</span>
          <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{stats.maxPressure.toFixed(1)}b</span>
          <span className="flex items-center gap-1"><Droplets className="h-3 w-3" />{stats.maxFlow.toFixed(1)}</span>
        </div>
      )}
      <span className="text-xs font-mono text-[#f5f0ea]/20 shrink-0">#{shot.db_key}</span>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
