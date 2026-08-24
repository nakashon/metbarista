/**
 * Shot Analysis Engine v4 — barista-focused scoring.
 *
 * Philosophy: The barista's job is to dial in the recipe and repeat it.
 * Score = did you hit your targets + are you consistent?
 *
 * All frame data is trimmed at piston retract ("retracting" status) so
 * weight/flow noise from the retract phase is excluded.
 *
 * Pure functions: ShotEntry in → ShotAnalysis out.
 * No network calls, no side effects — runs entirely in the browser.
 */

import type { ShotEntry, ShotFrame, Profile, ProfileStage } from "./types";

// ── Version ──────────────────────────────────────────────────
export const ANALYSIS_VERSION = 4;

// ── Types ────────────────────────────────────────────────────

export type MetricStatus = "excellent" | "good" | "warning" | "poor";

export interface ShotMetric {
  key: string;
  label: string;
  score: number; // 0-100
  status: MetricStatus;
  value: string; // human-readable summary
  detail?: string;
  applicable: boolean; // false if data was insufficient
  category: "barista" | "machine";
}

export interface Suggestion {
  priority: "high" | "medium" | "low";
  metric: string;
  message: string;
  detail?: string;
}

export interface ShotAnalysis {
  overallScore: number;
  metrics: ShotMetric[];
  suggestions: Suggestion[];
  applicableCount: number;
  totalCount: number;
  analysisVersion: number;
  computedAt: number;
  throwaway: boolean;
  throwawayReason?: string;
}

// ── Constants ────────────────────────────────────────────────

const MIN_BREW_TEMP_C = 70;
const MAX_PLAUSIBLE_WEIGHT_G = 200;

// ── Helpers ──────────────────────────────────────────────────

function statusFromScore(score: number): MetricStatus {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "poor";
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Trim frames at piston retract — everything after "retracting" is noise.
 * Returns only the real extraction frames.
 */
function trimAtRetract(frames: ShotFrame[]): ShotFrame[] {
  const retractIdx = frames.findIndex(
    (f) => typeof f.status === "string" && f.status.toLowerCase().includes("retract")
  );
  return retractIdx > 0 ? frames.slice(0, retractIdx) : frames;
}

/**
 * Compute a stable hash of profile stages for trend keying.
 */
export function profileStageHash(profile: Profile): string {
  const sig = profile.stages
    .map(
      (s) =>
        `${s.type}:${s.dynamics.points.map((p) => p.join(",")).join(";")}:${s.exit_triggers.map((t) => `${t.type}=${t.value}`).join(",")}`
    )
    .join("|");
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    hash = ((hash << 5) - hash + sig.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ── Throwaway Detection ──────────────────────────────────────

function detectThrowaway(frames: ShotFrame[]): { throwaway: boolean; reason?: string } {
  if (frames.length < 5) {
    return { throwaway: true, reason: "Too few data frames" };
  }

  const lastTime = frames[frames.length - 1]?.time ?? 0;
  if (lastTime < 8000) {
    return { throwaway: true, reason: "Shot under 8 seconds — likely a flush" };
  }

  // Scale error (finger press)
  const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w));
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
  if (maxWeight > MAX_PLAUSIBLE_WEIGHT_G) {
    return { throwaway: true, reason: `Weight ${maxWeight.toFixed(0)}g — scale error` };
  }

  // Cold water flush
  const hotFrames = frames.filter((f) => f.time > 3000);
  const temps = hotFrames
    .map((f) => f.sensors?.bar_mid_up)
    .filter((t): t is number => typeof t === "number" && !isNaN(t) && t > 0);
  if (temps.length > 5) {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    if (avgTemp < MIN_BREW_TEMP_C) {
      return { throwaway: true, reason: `Brew temp ${avgTemp.toFixed(0)}°C — flush/warmup` };
    }
  }

  return { throwaway: false };
}

// ── Barista Metrics (scored) ─────────────────────────────────

/** Yield Accuracy — did you hit the weight target in the profile? */
function scoreYield(frames: ShotFrame[], profile?: Profile): ShotMetric {
  const key = "yield_accuracy";
  const label = "Yield";
  const cat: "barista" = "barista";

  if (!profile?.final_weight || profile.final_weight <= 0) {
    return { key, label, score: 0, status: "poor", value: "No target weight in profile", applicable: false, category: cat };
  }

  const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
  if (!weights.length) {
    return { key, label, score: 0, status: "poor", value: "No weight data", applicable: false, category: cat };
  }

  const finalWeight = Math.max(...weights);
  const target = profile.final_weight;
  const error = Math.abs(finalWeight - target) / target;

  // >50% off is intentional (different drink, deliberate override)
  if (error > 0.5) {
    return {
      key, label, score: 0, status: "poor",
      value: `${finalWeight.toFixed(1)}g / ${target}g`,
      detail: `${Math.round(error * 100)}% off target — likely intentional`,
      applicable: false, category: cat,
    };
  }

  // 0-5% = perfect (dead band), 5-30% = linear degrade, >30% = 0
  const effectiveError = Math.max(0, error - 0.05);
  const score = clamp(100 - (effectiveError / 0.25) * 100);

  const diff = finalWeight - target;
  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `${finalWeight.toFixed(1)}g / ${target}g`,
    detail: error < 0.05
      ? "Right on target"
      : diff < 0
        ? `${Math.abs(diff).toFixed(1)}g under target`
        : `${diff.toFixed(1)}g over target`,
    applicable: true, category: cat,
  };
}

/** Ratio — dose:yield ratio (the universal espresso metric). */
function scoreRatio(frames: ShotFrame[], profile?: Profile): ShotMetric {
  const key = "ratio";
  const label = "Ratio";
  const cat: "barista" = "barista";

  // We need both dose and yield to compute ratio
  const dose = profile?.variables?.find((v) => v.type === "weight" || v.key === "dose")?.value;
  const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
  const finalWeight = weights.length > 0 ? Math.max(...weights) : 0;

  if (!dose || dose <= 0 || finalWeight <= 0) {
    return { key, label, score: 0, status: "poor", value: "No dose/yield data", applicable: false, category: cat };
  }

  const ratio = finalWeight / dose;

  // Target ratio: if profile has final_weight, derive from it
  const targetYield = profile?.final_weight ?? 0;
  const targetRatio = targetYield > 0 ? targetYield / dose : 0;

  if (targetRatio <= 0) {
    // No target — just show the ratio as info, don't score
    return {
      key, label, score: 0, status: "good",
      value: `1:${ratio.toFixed(1)} (${dose}g → ${finalWeight.toFixed(1)}g)`,
      detail: "No target ratio in profile — shown for reference",
      applicable: false, category: cat,
    };
  }

  // Score based on how close ratio is to target ratio
  const ratioError = Math.abs(ratio - targetRatio) / targetRatio;
  const effectiveError = Math.max(0, ratioError - 0.05); // 5% dead band
  const score = clamp(100 - (effectiveError / 0.25) * 100);

  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `1:${ratio.toFixed(1)} (target 1:${targetRatio.toFixed(1)})`,
    detail: ratioError < 0.05
      ? "Ratio on point"
      : ratio < targetRatio
        ? "Under-extracted — try finer grind or longer time"
        : "Over-extracted — try coarser grind",
    applicable: true, category: cat,
  };
}

/** Repeatability — how consistent are your last shots on this profile?
 *  Uses trend data from shot-trend.ts if available, otherwise n/a. */
function scoreRepeatability(
  currentWeight: number,
  recentWeights: number[],
  target: number
): ShotMetric {
  const key = "repeatability";
  const label = "Consistency";
  const cat: "barista" = "barista";

  if (recentWeights.length < 2) {
    return {
      key, label, score: 0, status: "poor",
      value: "Need 2+ shots on this profile",
      applicable: false, category: cat,
    };
  }

  // How tight is the cluster? Use coefficient of variation
  const allWeights = [...recentWeights, currentWeight];
  const avg = allWeights.reduce((a, b) => a + b, 0) / allWeights.length;
  const cv = stdDev(allWeights) / avg;

  // CV < 0.03 = very consistent, 0.03-0.08 = good, 0.08-0.15 = fair, >0.15 = poor
  const score = clamp(100 - (cv / 0.15) * 100);
  const spread = Math.max(...allWeights) - Math.min(...allWeights);

  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `±${spread.toFixed(1)}g across ${allWeights.length} shots`,
    detail: cv < 0.03
      ? "Very consistent — your workflow is dialed in"
      : cv < 0.08
        ? "Good consistency — minor variation between shots"
        : "Inconsistent yield — check dose, grind, and distribution workflow",
    applicable: true, category: cat,
  };
}

// ── Machine Metrics (informational, not scored) ──────────────

/**
 * Extended metric type that includes optional thermal breakdown.
 * When present, the UI can show what's barista-influenced vs machine-controlled.
 */
export interface ThermalBreakdown {
  /** Target temp from profile (°C) */
  targetTemp: number | null;
  /** Average temp during first 5s of extraction (°C) */
  startTemp: number;
  /** Average temp during last 5s of extraction (°C) */
  endTemp: number;
  /** Signed drift from start to end (°C). Positive = rising, negative = cooling */
  drift: number;
  /** Jitter = stddev of frame-to-frame temp changes (°C). Pure machine PID behavior */
  jitter: number;
  /** Offset from target at shot start (°C). Barista preheat effectiveness */
  offsetFromTarget: number | null;
  /** True if temp was rising (cold group head — barista didn't preheat enough) */
  coldStart: boolean;
}

function machineTempStability(
  frames: ShotFrame[],
  profile?: Profile
): ShotMetric & { thermalBreakdown?: ThermalBreakdown } {
  const key = "temp_stability";
  const label = "Temp Stability";
  const cat: "machine" = "machine";

  // Skip first 5s (pre-infusion settling)
  const hotFrames = frames.filter((f) => f.time > 5000);
  const temps = hotFrames
    .map((f) => f.sensors?.bar_mid_up)
    .filter((t): t is number => typeof t === "number" && !isNaN(t) && t > 0);

  if (temps.length < 10) {
    return { key, label, score: 0, status: "poor", value: "Insufficient data", applicable: false, category: cat };
  }

  const sd = stdDev(temps);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const score = clamp(100 - (sd / 3) * 100);

  // ── Thermal breakdown: barista vs machine ──
  const totalDuration = hotFrames[hotFrames.length - 1].time - hotFrames[0].time;
  const earlyWindowEnd = hotFrames[0].time + Math.min(5000, totalDuration * 0.25);
  const lateWindowStart = hotFrames[hotFrames.length - 1].time - Math.min(5000, totalDuration * 0.25);

  const earlyTemps = hotFrames
    .filter((f) => f.time <= earlyWindowEnd)
    .map((f) => f.sensors?.bar_mid_up)
    .filter((t): t is number => typeof t === "number" && !isNaN(t) && t > 0);
  const lateTemps = hotFrames
    .filter((f) => f.time >= lateWindowStart)
    .map((f) => f.sensors?.bar_mid_up)
    .filter((t): t is number => typeof t === "number" && !isNaN(t) && t > 0);

  const startTemp = earlyTemps.length > 0 ? earlyTemps.reduce((a, b) => a + b, 0) / earlyTemps.length : avgTemp;
  const endTemp = lateTemps.length > 0 ? lateTemps.reduce((a, b) => a + b, 0) / lateTemps.length : avgTemp;
  const drift = endTemp - startTemp;

  // Jitter: stddev of consecutive-frame deltas — pure machine PID behavior
  const deltas: number[] = [];
  for (let i = 1; i < temps.length; i++) {
    deltas.push(Math.abs(temps[i] - temps[i - 1]));
  }
  const jitter = deltas.length > 1 ? stdDev(deltas) : 0;

  const targetTemp = profile?.temperature ?? null;
  const offsetFromTarget = targetTemp != null && targetTemp > 0 ? startTemp - targetTemp : null;
  const coldStart = drift > 1.0; // temp rising >1°C = group head wasn't pre-heated

  const thermalBreakdown: ThermalBreakdown = {
    targetTemp,
    startTemp: Math.round(startTemp * 10) / 10,
    endTemp: Math.round(endTemp * 10) / 10,
    drift: Math.round(drift * 10) / 10,
    jitter: Math.round(jitter * 100) / 100,
    offsetFromTarget: offsetFromTarget != null ? Math.round(offsetFromTarget * 10) / 10 : null,
    coldStart,
  };

  // Build richer detail string
  const parts: string[] = [];
  if (coldStart) {
    parts.push(`Cold start: temp rose ${drift.toFixed(1)}°C during shot — preheat longer`);
  } else if (drift < -1.0) {
    parts.push(`Temp dropped ${Math.abs(drift).toFixed(1)}°C — possible heat loss`);
  } else {
    parts.push(sd < 0.5 ? "Excellent thermal stability" : sd < 1.5 ? "Minor fluctuation" : "Significant variation");
  }
  if (offsetFromTarget != null && Math.abs(offsetFromTarget) > 2) {
    parts.push(`Started ${Math.abs(offsetFromTarget).toFixed(1)}°C ${offsetFromTarget > 0 ? "above" : "below"} target`);
  }

  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `${avgTemp.toFixed(1)}°C ±${sd.toFixed(1)}°C`,
    detail: parts.join(". "),
    applicable: true, category: cat,
    thermalBreakdown,
  };
}

function machinePressureTracking(frames: ShotFrame[]): ShotMetric {
  const key = "pressure_tracking";
  const label = "Pressure Tracking";
  const cat: "machine" = "machine";

  const deviations: number[] = [];
  for (const f of frames) {
    const sp = f.shot.setpoints?.pressure;
    if (sp == null || sp <= 0 || isNaN(f.shot.pressure)) continue;
    deviations.push(Math.abs(f.shot.pressure - sp));
  }

  if (deviations.length < 10) {
    return { key, label, score: 0, status: "poor", value: "No setpoint data", applicable: false, category: cat };
  }

  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const score = clamp(100 - (avgDev / 1.5) * 100);

  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `±${avgDev.toFixed(2)} bar`,
    detail: avgDev < 0.3 ? "Tracking accurately" : `${avgDev.toFixed(1)} bar average deviation`,
    applicable: true, category: cat,
  };
}

function machineFlowTracking(frames: ShotFrame[]): ShotMetric {
  const key = "flow_tracking";
  const label = "Flow Tracking";
  const cat: "machine" = "machine";

  const deviations: number[] = [];
  for (const f of frames) {
    const sp = f.shot.setpoints?.flow;
    if (sp == null || sp <= 0 || isNaN(f.shot.flow)) continue;
    deviations.push(Math.abs(f.shot.flow - sp));
  }

  if (deviations.length < 10) {
    return { key, label, score: 0, status: "poor", value: "No setpoint data", applicable: false, category: cat };
  }

  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const score = clamp(100 - (avgDev / 2.0) * 100);

  return {
    key, label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `±${avgDev.toFixed(2)} ml/s`,
    detail: avgDev < 0.4 ? "Tracking accurately" : `${avgDev.toFixed(1)} ml/s average deviation`,
    applicable: true, category: cat,
  };
}

// ── Suggestion Engine ────────────────────────────────────────

function generateSuggestions(metrics: ShotMetric[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const m of metrics) {
    if (!m.applicable || m.score >= 80 || m.category !== "barista") continue;

    switch (m.key) {
      case "yield_accuracy":
        suggestions.push({
          priority: m.score < 50 ? "high" : "medium",
          metric: m.key,
          message: m.score < 50 ? "Yield way off target" : "Yield slightly off",
          detail: m.detail ?? "Adjust grind size — finer for more yield, coarser for less.",
        });
        break;

      case "ratio":
        suggestions.push({
          priority: m.score < 50 ? "high" : "medium",
          metric: m.key,
          message: "Brew ratio off target",
          detail: m.detail ?? "Check your dose weight and grind to dial in the ratio.",
        });
        break;

      case "repeatability":
        suggestions.push({
          priority: m.score < 50 ? "high" : "low",
          metric: m.key,
          message: "Inconsistent results",
          detail: "Standardize your workflow: weigh dose precisely, use WDT, tamp consistently.",
        });
        break;
    }
  }

  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return suggestions;
}

// ── Main Entry Point ─────────────────────────────────────────

export function analyzeShot(
  shot: ShotEntry,
  recentWeightsForProfile?: number[]
): ShotAnalysis {
  const allFrames = shot.data ?? [];
  const profile = shot.profile;

  // Trim at piston retract — everything after is noise
  const frames = trimAtRetract(allFrames);

  // Throwaway detection (uses full frames for weight check, trimmed for temp)
  const { throwaway, reason: throwawayReason } = detectThrowaway(allFrames);

  // Get final weight from trimmed extraction frames
  const trimmedWeights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
  const currentWeight = trimmedWeights.length > 0 ? Math.max(...trimmedWeights) : 0;

  // Barista metrics (scored)
  const baristaMetrics: ShotMetric[] = [
    scoreYield(frames, profile),
    scoreRatio(frames, profile),
    scoreRepeatability(currentWeight, recentWeightsForProfile ?? [], profile?.final_weight ?? 0),
  ];

  // Machine metrics (informational)
  const machineMetrics: ShotMetric[] = [
    machinePressureTracking(frames),
    machineFlowTracking(frames),
    machineTempStability(frames, profile),
  ];

  const metrics = [...baristaMetrics, ...machineMetrics];

  // Overall score from barista metrics only
  const scored = baristaMetrics.filter((m) => m.applicable);
  let overallScore = 0;
  if (scored.length > 0) {
    // Equal weight for all applicable barista metrics
    overallScore = scored.reduce((sum, m) => sum + m.score, 0) / scored.length;
  }

  const suggestions = generateSuggestions(baristaMetrics);

  return {
    overallScore: Math.round(overallScore),
    metrics,
    suggestions,
    applicableCount: scored.length,
    totalCount: baristaMetrics.length,
    analysisVersion: ANALYSIS_VERSION,
    computedAt: Date.now(),
    throwaway,
    throwawayReason,
  };
}

// ── Profile Drift ───────────────────────────────────────────
// Compares the plan (profile) to execution (actual shots).

export interface DriftMetric {
  field: string;
  label: string;
  planned: number;
  actual: number;
  unit: string;
  driftPct: number; // signed: positive = over, negative = under
  suggestion?: { value: number; confidence: "high" | "medium"; reason: string };
}

export interface ProfileDrift {
  profileName: string;
  shotCount: number;
  metrics: DriftMetric[];
  hasDrift: boolean;
}

export function computeProfileDrift(
  profile: Profile,
  recentShots: ShotEntry[]
): ProfileDrift {
  const metrics: DriftMetric[] = [];

  // Use trimmed extraction weights
  const validShots = recentShots.filter((s) => {
    const frames = trimAtRetract(s.data ?? []);
    const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
    const maxW = weights.length > 0 ? Math.max(...weights) : 0;
    return maxW > 0 && maxW < MAX_PLAUSIBLE_WEIGHT_G;
  });

  // ── Weight drift ──
  if (profile.final_weight && profile.final_weight > 0 && validShots.length >= 1) {
    const actualWeights = validShots.map((s) => {
      const frames = trimAtRetract(s.data ?? []);
      const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
      return Math.max(...weights);
    });

    const medianW = median(actualWeights);
    const target = profile.final_weight;
    const driftPct = ((medianW - target) / target) * 100;

    const dm: DriftMetric = {
      field: "final_weight",
      label: "Yield",
      planned: target,
      actual: Math.round(medianW * 10) / 10,
      unit: "g",
      driftPct,
    };

    if (validShots.length >= 3 && Math.abs(driftPct) > 15) {
      const weightSd = stdDev(actualWeights);
      const cv = weightSd / medianW;
      if (cv < 0.15) {
        dm.suggestion = {
          value: Math.round(medianW),
          confidence: validShots.length >= 5 && cv < 0.08 ? "high" : "medium",
          reason: `Consistent ${driftPct > 0 ? "over" : "under"}-yield across ${validShots.length} shots`,
        };
      }
    }

    metrics.push(dm);
  }

  // ── Duration drift ──
  const plannedDuration = profile.stages.reduce((sum, stage) => {
    const timeTrigger = stage.exit_triggers?.find((t) => t.type === "time");
    if (timeTrigger?.value != null) {
      const v = typeof timeTrigger.value === "string" ? parseFloat(timeTrigger.value) : timeTrigger.value;
      return sum + (isNaN(v) ? 0 : v);
    }
    return sum;
  }, 0);

  if (plannedDuration > 0 && validShots.length >= 1) {
    const actualDurations = validShots.map((s) => {
      const frames = trimAtRetract(s.data ?? []);
      return frames.length > 0 ? (frames[frames.length - 1].time / 1000) : 0;
    }).filter((d) => d > 0);

    if (actualDurations.length > 0) {
      const medianD = median(actualDurations);
      const driftPct = ((medianD - plannedDuration) / plannedDuration) * 100;

      metrics.push({
        field: "duration",
        label: "Duration",
        planned: Math.round(plannedDuration),
        actual: Math.round(medianD * 10) / 10,
        unit: "s",
        driftPct,
      });
    }
  }

  // ── Temperature drift ──
  if (profile.temperature && profile.temperature > 0 && validShots.length >= 1) {
    const actualTemps = validShots.map((s) => {
      const frames = trimAtRetract(s.data ?? []).filter((f) => f.time > 5000);
      const temps = frames.map((f) => f.sensors?.bar_mid_up).filter((t): t is number => typeof t === "number" && !isNaN(t) && t > MIN_BREW_TEMP_C);
      return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    }).filter((t) => t > 0);

    if (actualTemps.length > 0) {
      const medianT = median(actualTemps);
      const driftPct = ((medianT - profile.temperature) / profile.temperature) * 100;

      metrics.push({
        field: "temperature",
        label: "Brew Temp",
        planned: profile.temperature,
        actual: Math.round(medianT * 10) / 10,
        unit: "°C",
        driftPct,
      });
    }
  }

  return {
    profileName: profile.name,
    shotCount: validShots.length,
    metrics,
    hasDrift: metrics.some((m) => Math.abs(m.driftPct) > 15),
  };
}

/**
 * Get extraction weights for recent shots on a profile (for repeatability scoring).
 * Caller should filter to same profile and non-throwaway shots.
 */
export function getExtractionWeights(shots: ShotEntry[]): number[] {
  return shots
    .map((s) => {
      const frames = trimAtRetract(s.data ?? []);
      const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
      return weights.length > 0 ? Math.max(...weights) : 0;
    })
    .filter((w) => w > 0 && w < MAX_PLAUSIBLE_WEIGHT_G);
}
