"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ShotChart } from "@/components/charts/shot-chart";
import { Loader2, ArrowLeft, Clock, Weight, Gauge, Droplets, Thermometer, Layers } from "lucide-react";
import { getHistory, computeShotStats } from "@/lib/machine-api";
import type { ShotEntry } from "@/lib/types";

function stageBadgeStyle(type: string): string {
  switch (type) {
    case "pressure": return "bg-blue-500/15 text-blue-400";
    case "flow":     return "bg-cyan-500/15 text-cyan-400";
    case "power":    return "bg-violet-400/15 text-violet-400";
    default:         return "bg-white/10 text-[#f5f0ea]/50";
  }
}

function ShotDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [shot, setShot] = useState<ShotEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemp, setShowTemp] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getHistory()
      .then((shots) => setShot(shots.find((s) => s.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20 bg-[#0c0a09] min-h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
    </div>
  );
  if (!shot) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0c0a09] text-[#f5f0ea]/40 text-sm">
      Shot not found
    </div>
  );

  const stats = computeShotStats(shot.data);
  const date = new Date(shot.time * 1000);
  const accent = shot.profile?.display?.accentColor ?? "#e8944a";

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Back */}
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-[#f5f0ea]/40 hover:text-[#f5f0ea] transition-colors -ml-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> History
        </Link>

        {/* Title */}
        <div className="flex items-start gap-3">
          <div className="h-2 w-2 rounded-full mt-2.5 shrink-0" style={{ backgroundColor: accent }} />
          <div>
            <h1 className="text-2xl font-bold text-[#f5f0ea]">{shot.name}</h1>
            <p className="text-sm font-mono text-[#f5f0ea]/40 mt-0.5">
              {format(date, "MMMM d, yyyy · HH:mm")} · #{shot.db_key}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { Icon: Clock,    color: "#e8944a", value: `${stats.durationSec}s`,              label: "Duration"     },
            { Icon: Weight,   color: "#fb923c", value: `${stats.finalWeight.toFixed(1)}g`,   label: "Final Weight" },
            { Icon: Gauge,    color: "#60a5fa", value: `${stats.maxPressure.toFixed(1)} bar`, label: "Max Pressure" },
            { Icon: Droplets, color: "#22d3ee", value: `${stats.maxFlow.toFixed(1)} ml/s`,   label: "Max Flow"     },
          ].map(({ Icon, color, value, label }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 text-center">
              <Icon className="h-4 w-4 mx-auto mb-2" style={{ color }} />
              <p className="text-xl font-bold font-mono text-[#f5f0ea]">{value}</p>
              <p className="text-xs text-[#f5f0ea]/30 mt-0.5 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#f5f0ea]">Extraction Curve</p>
            <button
              onClick={() => setShowTemp((v) => !v)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                showTemp
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-white/[0.08] text-[#f5f0ea]/40 hover:text-[#f5f0ea] hover:border-white/[0.12]"
              }`}
            >
              <Thermometer className="h-3 w-3" /> Temp
            </button>
          </div>
          <ShotChart frames={shot.data} height={300} showTemp={showTemp} />
        </div>

        {/* Profile used */}
        {shot.profile && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#f5f0ea]/30" />
              <p className="text-sm font-semibold text-[#f5f0ea]">Profile Used</p>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[#f5f0ea]">{shot.profile.name}</p>
                <p className="text-sm text-[#f5f0ea]/40 mt-0.5">by {shot.profile.author}</p>
              </div>
              <div className="flex gap-2 text-sm text-[#f5f0ea]/40 font-mono shrink-0">
                <span>{shot.profile.temperature}°C</span>
                <span className="text-[#f5f0ea]/20">·</span>
                <span>{shot.profile.final_weight}g target</span>
              </div>
            </div>

            <div className="space-y-0">
              {shot.profile.stages.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-xs font-mono text-[#f5f0ea]/20 w-4 shrink-0">{i + 1}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${stageBadgeStyle(stage.type)}`}>
                    {stage.type}
                  </span>
                  <span className="text-sm text-[#f5f0ea]/60 flex-1 truncate">{stage.name}</span>
                  <span className="text-xs font-mono text-[#f5f0ea]/25 shrink-0">over {stage.dynamics.over}</span>
                </div>
              ))}
            </div>

            <Link
              href={`/profile?id=${shot.profile.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-3 py-1.5 text-xs font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] hover:border-white/[0.20] transition-all"
            >
              View Full Profile →
            </Link>
          </div>
        )}

        {/* Raw JSON */}
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 transition-colors flex items-center gap-1"
          >
            {showRaw ? "▾" : "▸"} Raw shot data ({shot.data.length} frames)
          </button>
          {showRaw && (
            <pre className="mt-2 bg-[#0c0a09] border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-[#f5f0ea]/50 overflow-auto max-h-64">
              {JSON.stringify(shot.data.slice(0, 5), null, 2)}
              {"\n... and "}{shot.data.length - 5}{" more frames"}
            </pre>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ShotPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20 min-h-screen bg-[#0c0a09]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
      </div>
    }>
      <ShotDetailContent />
    </Suspense>
  );
}
