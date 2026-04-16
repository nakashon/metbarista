"use client";

import { useMemo } from "react";
import {
  Target,
  Gauge,
  Droplets,
  Weight,
  Zap,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronUp,
} from "lucide-react";
import type { ShotEntry } from "@/lib/types";
import type { ShotAnalysis, ShotMetric, Suggestion, MetricStatus } from "@/lib/shot-analysis";
import { analyzeShot } from "@/lib/shot-analysis";
import { recordTrend, getRecentTrend, trendDirection } from "@/lib/shot-trend";
import { recordShot, isDialedIn } from "@/lib/barista-stats";
import type { TrendEntry } from "@/lib/shot-trend";

// ── Score ring ───────────────────────────────────────────────

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90 ? "#22c55e" : score >= 70 ? "#e8944a" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-[#f5f0ea]/30 uppercase tracking-wider">score</span>
      </div>
    </div>
  );
}

// ── Metric row ───────────────────────────────────────────────

const METRIC_ICONS: Record<string, typeof Gauge> = {
  weight_accuracy: Weight,
  pressure_tracking: Gauge,
  flow_tracking: Droplets,
  pressure_overshoot: Target,
  channeling_risk: Zap,
  temp_stability: Thermometer,
};

const STATUS_COLORS: Record<MetricStatus, string> = {
  excellent: "#22c55e",
  good: "#e8944a",
  warning: "#f59e0b",
  poor: "#ef4444",
};

function MetricRow({ metric }: { metric: ShotMetric }) {
  const Icon = METRIC_ICONS[metric.key] ?? Info;
  const color = metric.applicable
    ? STATUS_COLORS[metric.status]
    : "rgba(245,240,234,0.15)";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[#f5f0ea]/80">{metric.label}</span>
          {metric.applicable ? (
            <span className="text-sm font-mono font-medium" style={{ color }}>
              {metric.score}
            </span>
          ) : (
            <span className="text-xs text-[#f5f0ea]/20">N/A</span>
          )}
        </div>
        {metric.applicable && (
          <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${metric.score}%`, backgroundColor: color }}
            />
          </div>
        )}
        <p className="text-xs text-[#f5f0ea]/30 mt-1">{metric.value}</p>
      </div>
    </div>
  );
}

// ── Suggestion card ──────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { bg: string; border: string; icon: typeof AlertTriangle }> = {
  high: { bg: "bg-red-500/5", border: "border-red-500/15", icon: AlertTriangle },
  medium: { bg: "bg-amber-500/5", border: "border-amber-500/15", icon: Info },
  low: { bg: "bg-[#f5f0ea]/[0.02]", border: "border-white/[0.06]", icon: CheckCircle2 },
};

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const style = PRIORITY_STYLES[suggestion.priority] ?? PRIORITY_STYLES.low;
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-3.5`}>
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 shrink-0 mt-0.5 text-[#f5f0ea]/40" />
        <div>
          <p className="text-sm font-medium text-[#f5f0ea]/80">{suggestion.message}</p>
          {suggestion.detail && (
            <p className="text-xs text-[#f5f0ea]/35 mt-1 leading-relaxed">{suggestion.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trend sparkline ──────────────────────────────────────────

function TrendSparkline({ entries }: { entries: TrendEntry[] }) {
  if (entries.length < 2) return null;

  const scores = entries.map((e) => e.overallScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;

  const w = 200;
  const h = 40;
  const padding = 4;

  const points = scores
    .map((s, i) => {
      const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
      const y = h - padding - ((s - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const direction = trendDirection(entries);
  const DirIcon =
    direction === "improving" ? TrendingUp : direction === "declining" ? TrendingDown : Minus;
  const dirColor =
    direction === "improving" ? "#22c55e" : direction === "declining" ? "#ef4444" : "#f5f0ea";
  const dirLabel =
    direction === "improving"
      ? "Improving"
      : direction === "declining"
        ? "Declining"
        : direction === "stable"
          ? "Consistent"
          : "";

  return (
    <div className="flex items-center gap-3">
      <svg width={w} height={h} className="shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke="#e8944a"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = padding + (i / (scores.length - 1)) * (w - padding * 2);
          const y = h - padding - ((s - min) / range) * (h - padding * 2);
          return <circle key={i} cx={x} cy={y} r={2} fill="#e8944a" />;
        })}
      </svg>
      {dirLabel && (
        <div className="flex items-center gap-1" style={{ color: dirColor }}>
          <DirIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{dirLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

interface ShotReportCardProps {
  shot: ShotEntry;
  defaultExpanded?: boolean;
}

export function ShotReportCard({ shot, defaultExpanded = true }: ShotReportCardProps) {
  const analysis = useMemo(() => analyzeShot(shot), [shot]);

  // Record trend for this shot (deduplicates internally) — skip throwaways
  useMemo(() => {
    if (shot.profile && analysis.applicableCount > 0 && !analysis.throwaway) {
      recordTrend(shot.profile, shot.time, analysis);
      recordShot(shot.time, shot.profile.id, shot.profile.name, analysis);
    }
  }, [shot, analysis]);

  const dialedIn = isDialedIn(analysis.overallScore, analysis.applicableCount);

  // Get trend data
  const trendEntries = useMemo(() => {
    if (!shot.profile) return [];
    return getRecentTrend(shot.profile, 10);
  }, [shot.profile]);

  if (analysis.throwaway) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 opacity-50">
        <div className="flex items-center gap-2 text-[#f5f0ea]/40">
          <Info className="h-4 w-4" />
          <div>
            <p className="text-sm font-medium">Flush / warmup shot</p>
            <p className="text-xs text-[#f5f0ea]/25 mt-0.5">{analysis.throwawayReason} — excluded from stats and gamification</p>
          </div>
        </div>
      </div>
    );
  }

  if (analysis.applicableCount === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
        <div className="flex items-center gap-2 text-[#f5f0ea]/30">
          <Info className="h-4 w-4" />
          <p className="text-sm">Not enough data to analyze this shot</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 space-y-5">
      {/* Header: score + summary */}
      <div className="flex items-start gap-5">
        <ScoreRing score={analysis.overallScore} />
        <div className="flex-1 pt-1">
          <h3 className="text-sm font-semibold text-[#f5f0ea]">
            Shot Analysis
            {dialedIn && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-bold">
                🎯 Dialed In!
              </span>
            )}
          </h3>
          <p className="text-xs text-[#f5f0ea]/30 mt-0.5">
            {analysis.applicableCount} of {analysis.totalCount} metrics analyzed
          </p>
          {/* Trend sparkline */}
          {trendEntries.length >= 2 && (
            <div className="mt-3">
              <p className="text-xs text-[#f5f0ea]/25 mb-1.5 uppercase tracking-wider">
                Last {trendEntries.length} shots on this profile
              </p>
              <TrendSparkline entries={trendEntries} />
            </div>
          )}
        </div>
      </div>

      {/* Metrics breakdown */}
      <div>
        {analysis.metrics.map((m) => (
          <MetricRow key={m.key} metric={m} />
        ))}
      </div>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#f5f0ea]/25 uppercase tracking-wider">Suggestions</p>
          {analysis.suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Score badge (for shot cards / dashboard) ─────────────────

export function ShotScoreBadge({ shot, size = "sm" }: { shot: ShotEntry; size?: "sm" | "xs" }) {
  const analysis = useMemo(() => analyzeShot(shot), [shot]);

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]";

  if (analysis.throwaway) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md font-mono ${sizeClasses} text-[#f5f0ea]/20 bg-[#f5f0ea]/[0.04] border border-[#f5f0ea]/[0.06]`}
        title={analysis.throwawayReason}
      >
        flush
      </span>
    );
  }

  if (analysis.applicableCount === 0) return null;

  const score = analysis.overallScore;
  const color =
    score >= 90 ? "#22c55e" : score >= 70 ? "#e8944a" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-mono font-bold ${sizeClasses}`}
      style={{
        color,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}25`,
      }}
    >
      {score}
    </span>
  );
}
