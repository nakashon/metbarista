import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const accent = shot.profile?.display?.accentColor ?? "#6b7280";

  const inner = (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/30 overflow-hidden">
      <div className="h-0.5" style={{ backgroundColor: accent }} />
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {shot.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(date, "MMM d, yyyy · HH:mm")} ·{" "}
              <span className="text-muted-foreground/70">
                {formatDistanceToNow(date, { addSuffix: true })}
              </span>
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            #{shot.db_key}
          </Badge>
        </div>

        {!compact && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Stat icon={Clock} label="Duration" value={`${stats.durationSec}s`} />
            <Stat icon={Weight} label="Weight" value={`${stats.finalWeight.toFixed(1)}g`} />
            <Stat icon={Gauge} label="Max P" value={`${stats.maxPressure.toFixed(1)}b`} />
            <Stat icon={Droplets} label="Max F" value={`${stats.maxFlow.toFixed(1)}ml/s`} />
          </div>
        )}

        {compact && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{stats.durationSec}s
            </span>
            <span className="flex items-center gap-1">
              <Weight className="h-3 w-3" />{stats.finalWeight.toFixed(1)}g
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-muted/50 px-2 py-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs font-medium">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
