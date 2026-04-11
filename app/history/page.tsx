"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { getHistory } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import { ShotCard } from "@/components/shot-card";
import type { ShotEntry } from "@/lib/types";

export default function HistoryPage() {
  const [shots, setShots] = useState<ShotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSavedIp()) { setLoading(false); return; }
    getHistory()
      .then(setShots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <div className="p-8 text-center text-muted-foreground">{error}</div>;
  if (!shots.length) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <HistoryIcon className="h-10 w-10" />
      <p>No shots found</p>
    </div>
  );

  // Group by date
  const grouped: Record<string, ShotEntry[]> = {};
  for (const shot of shots) {
    const key = format(new Date(shot.time * 1000), "MMMM d, yyyy");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(shot);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shot History</h1>
        <span className="text-sm text-muted-foreground">{shots.length} shots</span>
      </div>

      {Object.entries(grouped).map(([date, group]) => (
        <div key={date}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {date}
          </h2>
          <div className="space-y-2">
            {group.map((shot) => (
              <ShotCard key={shot.id} shot={shot} href={`/shot?id=${shot.id}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
