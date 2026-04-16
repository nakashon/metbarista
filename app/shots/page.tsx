"use client";

import { useEffect, useState, Suspense, useMemo, lazy } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2, ArrowLeft, Clock, Weight, Gauge, Droplets, Thermometer,
  Layers, NotebookPen, Star, X,
} from "lucide-react";
import { getHistory, computeShotStats } from "@/lib/machine-api";
import { getShotNote } from "@/lib/shot-notes";
import { ShotScoreBadge } from "@/components/shot-report-card";
import { analyzeShot } from "@/lib/shot-analysis";
import type { ShotEntry } from "@/lib/types";

// Lazy-load heavy components (Recharts) — only when detail is open
const ShotChart = lazy(() =>
  import("@/components/charts/shot-chart").then((m) => ({ default: m.ShotChart }))
);
const ShotReportCard = lazy(() =>
  import("@/components/shot-report-card").then((m) => ({ default: m.ShotReportCard }))
);
const ShotNoteEditor = lazy(() =>
  import("@/components/shot-note-editor").then((m) => ({ default: m.ShotNoteEditor }))
);

function stageBadgeStyle(type: string): string {
  switch (type) {
    case "pressure": return "bg-blue-500/15 text-blue-400";
    case "flow":     return "bg-cyan-500/15 text-cyan-400";
    case "power":    return "bg-violet-400/15 text-violet-400";
    default:         return "bg-white/10 text-[#f5f0ea]/50";
  }
}

// ── Shot list item ───────────────────────────────────────────

function ShotListItem({
  shot,
  selected,
  onSelect,
}: {
  shot: ShotEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const stats = computeShotStats(shot.data);
  const date = new Date(shot.time * 1000);
  const accent = shot.profile?.display?.accentColor ?? "#e8944a";
  const [rating, setRating] = useState<number | null>(null);
  const isThrowaway = useMemo(() => analyzeShot(shot).throwaway, [shot]);

  useEffect(() => {
    const saved = getShotNote(shot.time);
    if (saved?.rating) setRating(saved.rating);
  }, [shot.time]);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        isThrowaway ? "opacity-40" : ""
      } ${
        selected
          ? "border-[#e8944a]/30 bg-[#1e1b16]"
          : "border-white/[0.05] bg-[#161210] hover:border-white/[0.10] hover:bg-[#1e1b16]"
      }`}
    >
      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate transition-colors ${selected ? "text-[#e8944a]" : "text-[#f5f0ea]"}`}>
          {shot.name}
        </p>
        <p className="text-xs text-[#f5f0ea]/35 mt-0.5">
          {format(date, "MMM d · HH:mm")} · {formatDistanceToNow(date, { addSuffix: true })}
        </p>
      </div>
      {rating && rating > 0 && (
        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="h-2.5 w-2.5" fill={rating >= s ? "#e8944a" : "none"} stroke={rating >= s ? "#e8944a" : "rgba(245,240,234,0.15)"} />
          ))}
        </div>
      )}
      <ShotScoreBadge shot={shot} size="xs" />
      <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#f5f0ea]/30 shrink-0">
        <span>{stats.durationSec}s</span>
        <span>{stats.finalWeight.toFixed(1)}g</span>
      </div>
    </button>
  );
}

// ── Shot detail panel ────────────────────────────────────────

function ShotDetail({ shot, onClose }: { shot: ShotEntry; onClose: () => void }) {
  const stats = computeShotStats(shot.data);
  const date = new Date(shot.time * 1000);
  const accent = shot.profile?.display?.accentColor ?? "#e8944a";
  const [showTemp, setShowTemp] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-2 w-2 rounded-full mt-2.5 shrink-0" style={{ backgroundColor: accent }} />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#f5f0ea] truncate">{shot.name}</h2>
            <p className="text-sm font-mono text-[#f5f0ea]/40 mt-0.5">
              {format(date, "MMMM d, yyyy · HH:mm")} · #{shot.db_key}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 hover:bg-white/[0.05] transition-all md:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { Icon: Clock,    color: "#e8944a", value: `${stats.durationSec}s`,              label: "Duration"     },
          { Icon: Weight,   color: "#fb923c", value: `${stats.finalWeight.toFixed(1)}g`,   label: "Weight"       },
          { Icon: Gauge,    color: "#60a5fa", value: `${stats.maxPressure.toFixed(1)} bar`, label: "Pressure"     },
          { Icon: Droplets, color: "#22d3ee", value: `${stats.maxFlow.toFixed(1)} ml/s`,   label: "Flow"         },
        ].map(({ Icon, color, value, label }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0c0a09] p-3 text-center">
            <Icon className="h-3.5 w-3.5 mx-auto mb-1.5" style={{ color }} />
            <p className="text-lg font-bold font-mono text-[#f5f0ea]">{value}</p>
            <p className="text-[10px] text-[#f5f0ea]/30 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0c0a09] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#f5f0ea]">Extraction Curve</p>
          <button
            onClick={() => setShowTemp((v) => !v)}
            className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition-all flex items-center gap-1 ${
              showTemp
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-white/[0.08] text-[#f5f0ea]/40 hover:text-[#f5f0ea]"
            }`}
          >
            <Thermometer className="h-3 w-3" /> Temp
          </button>
        </div>
        <Suspense fallback={<div className="h-[280px] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#e8944a]" /></div>}>
          <ShotChart frames={shot.data} height={280} showTemp={showTemp} />
        </Suspense>
      </div>

      {/* Analysis */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#e8944a]" /></div>}>
        <ShotReportCard shot={shot} />
      </Suspense>

      {/* Profile used */}
      {shot.profile && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0c0a09] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[#f5f0ea]/30" />
            <p className="text-sm font-semibold text-[#f5f0ea]">Profile Used</p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-[#f5f0ea] text-sm">{shot.profile.name}</p>
              <p className="text-xs text-[#f5f0ea]/40">by {shot.profile.author}</p>
            </div>
            <div className="flex gap-2 text-xs text-[#f5f0ea]/40 font-mono shrink-0">
              <span>{shot.profile.temperature}°C</span>
              <span className="text-[#f5f0ea]/20">·</span>
              <span>{shot.profile.final_weight}g</span>
            </div>
          </div>
          {shot.profile.stages.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
              <span className="text-xs font-mono text-[#f5f0ea]/20 w-4 shrink-0">{i + 1}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize shrink-0 ${stageBadgeStyle(stage.type)}`}>
                {stage.type}
              </span>
              <span className="text-xs text-[#f5f0ea]/60 flex-1 truncate">{stage.name}</span>
            </div>
          ))}
          <Link
            href={`/profiles?id=${shot.profile.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.10] px-2.5 py-1 text-xs font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] hover:border-white/[0.20] transition-all"
          >
            View Full Profile →
          </Link>
        </div>
      )}

      {/* Notes */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0c0a09] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-3.5 w-3.5 text-[#f5f0ea]/30" />
          <p className="text-sm font-semibold text-[#f5f0ea]">Tasting Notes</p>
        </div>
        <Suspense fallback={null}>
          <ShotNoteEditor timestamp={shot.time} />
        </Suspense>
      </div>

      {/* Raw JSON */}
      <button
        onClick={() => setShowRaw((v) => !v)}
        className="text-xs text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 transition-colors"
      >
        {showRaw ? "▾" : "▸"} Raw data ({shot.data.length} frames)
      </button>
      {showRaw && (
        <pre className="bg-[#0c0a09] border border-white/[0.06] rounded-xl p-3 text-xs font-mono text-[#f5f0ea]/50 overflow-auto max-h-48">
          {JSON.stringify(shot.data.slice(0, 3), null, 2)}
          {"\n... and "}{shot.data.length - 3}{" more"}
        </pre>
      )}
    </div>
  );
}

// ── Main shots page ──────────────────────────────────────────

function ShotsPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("shot") ?? params.get("id"); // support old ?id= links
  const [shots, setShots] = useState<ShotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory()
      .then(setShots)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const selectedShot = useMemo(
    () => (selectedId ? shots.find((s) => s.id === selectedId) : null),
    [selectedId, shots]
  );

  // Group shots by date
  const grouped = useMemo(() => {
    const groups: { date: string; shots: ShotEntry[] }[] = [];
    let currentDate = "";
    for (const shot of shots) {
      const d = format(new Date(shot.time * 1000), "MMMM d, yyyy");
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, shots: [] });
      }
      groups[groups.length - 1].shots.push(shot);
    }
    return groups;
  }, [shots]);

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      router.push("/shots", { scroll: false });
    } else {
      router.push(`/shots?shot=${id}`, { scroll: false });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 min-h-screen bg-[#0c0a09]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0a09] gap-4 px-6">
        <Gauge className="h-8 w-8 text-[#f5f0ea]/20" />
        <p className="text-sm text-[#f5f0ea]/40">{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); getHistory().then(setShots).catch((e) => setError(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false)); }}
          className="rounded-xl border border-white/[0.10] px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0a09] gap-4 px-6">
        <Clock className="h-8 w-8 text-[#f5f0ea]/20" />
        <p className="text-sm text-[#f5f0ea]/40">No shots yet. Pull your first espresso!</p>
        <Link href="/dashboard" className="rounded-xl bg-[#e8944a] px-4 py-2 text-sm font-semibold text-[#0c0a09]">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Mobile: show detail full-screen if selected
  if (selectedShot) {
    return (
      <div className="min-h-screen bg-[#0c0a09]">
        {/* Mobile: full screen detail */}
        <div className="md:hidden max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push("/shots", { scroll: false })}
            className="inline-flex items-center gap-1.5 text-sm text-[#f5f0ea]/40 hover:text-[#f5f0ea] transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Shots
          </button>
          <ShotDetail shot={selectedShot} onClose={() => router.push("/shots", { scroll: false })} />
        </div>

        {/* Desktop: split pane */}
        <div className="hidden md:flex max-w-7xl mx-auto min-h-screen">
          {/* Left: shot list */}
          <div className="w-[340px] shrink-0 border-r border-white/[0.06] overflow-y-auto h-screen sticky top-0 px-4 py-6">
            <h1 className="text-lg font-bold text-[#f5f0ea] mb-4">Shots</h1>
            <div className="space-y-1.5">
              {shots.map((s) => (
                <ShotListItem key={s.id} shot={s} selected={s.id === selectedId} onSelect={() => handleSelect(s.id)} />
              ))}
            </div>
          </div>
          {/* Right: detail */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <ShotDetail shot={selectedShot} onClose={() => router.push("/shots", { scroll: false })} />
          </div>
        </div>
      </div>
    );
  }

  // No shot selected: show list
  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-[#f5f0ea]">Shots</h1>
          <span className="text-xs text-[#f5f0ea]/30 font-mono">{shots.length} total</span>
        </div>
        <div className="space-y-6">
          {grouped.map(({ date, shots: dayShots }) => (
            <div key={date}>
              <p className="text-xs text-[#f5f0ea]/25 uppercase tracking-wider mb-2">{date}</p>
              <div className="space-y-1.5">
                {dayShots.map((s) => (
                  <ShotListItem key={s.id} shot={s} selected={false} onSelect={() => handleSelect(s.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShotsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20 min-h-screen bg-[#0c0a09]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
      </div>
    }>
      <ShotsPageContent />
    </Suspense>
  );
}
