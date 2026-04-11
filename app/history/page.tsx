"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Coffee, WifiOff, RefreshCw } from "lucide-react";
import { getHistory } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import { ShotCard } from "@/components/shot-card";
import type { ShotEntry } from "@/lib/types";

export default function HistoryPage() {
  const [shots, setShots] = useState<ShotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getHistory().then(setShots).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getSavedIp()) { setLoading(false); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-[#0c0a09]">
      <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-[#f5f0ea]">Shot History</h1>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-4">
        <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <WifiOff className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-[#f5f0ea]">Couldn&apos;t reach your machine</p>
          <p className="text-sm text-[#f5f0ea]/40 mt-1 max-w-xs">Make sure you&apos;re on the same network as your Meticulous.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.10] px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] hover:bg-white/[0.05] transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    </div>
  );
  if (!shots.length) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#0c0a09] gap-3 text-center">
      <Coffee className="h-10 w-10 text-[#e8944a]/30" />
      <p className="text-[#f5f0ea]/40 text-sm">No shots yet — brew something!</p>
    </div>
  );

  const grouped: Record<string, ShotEntry[]> = {};
  for (const shot of shots) {
    const key = format(new Date(shot.time * 1000), "EEEE, MMMM d, yyyy");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(shot);
  }

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold text-[#f5f0ea]">Shot History</h1>
          <span className="text-sm text-[#f5f0ea]/30 font-mono">{shots.length} shots</span>
        </div>

        {Object.entries(grouped).map(([date, group]) => (
          <div key={date} className="space-y-2">
            <h2 className="text-xs font-semibold text-[#f5f0ea]/30 uppercase tracking-widest pb-1">
              {date}
            </h2>
            <div className="space-y-1.5">
              {group.map((shot) => (
                <ShotCard key={shot.id} shot={shot} href={`/shot?id=${shot.id}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
