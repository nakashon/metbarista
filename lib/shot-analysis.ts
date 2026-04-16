/**
 * Shot Analysis Engine — data-driven scoring for every extraction.
 *
 * Pure functions: ShotEntry in → ShotAnalysis out.
 * No network calls, no side effects — runs entirely in the browser.
 */

import type { ShotEntry, ShotFrame, Profile, ProfileStage } from "./types";

// ── Version ──────────────────────────────────────────────────
// Bump when scoring thresholds or weights change. Stored with
// every analysis so trends stay comparable across versions.
export const ANALYSIS_VERSION = 2;

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
}

export interface Suggestion {
  priority: "high" | "medium" | "low";
  metric: string; // which metric triggered this
  message: string;
  detail?: string;
}

export interface ShotAnalysis {
  overallScore: number; // 0-100 (only from applicable metrics)
  metrics: ShotMetric[];
  suggestions: Suggestion[];
  applicableCount: number;
  totalCount: number;
  analysisVersion: number;
  computedAt: number;
  throwaway: boolean; // true if shot looks like a flush/warmup/throwaway
  throwawayReason?: string;
}

// ── Config (tunable) ─────────────────────────────────────────

interface MetricConfig {
  key: string;
  label: string;
  weight: number; // relative weight for overall score
}

const METRIC_CONFIGS: MetricConfig[] = [
  { key: "weight_accuracy", label: "Weight Accuracy", weight: 20 },
  { key: "pressure_tracking", label: "Pressure Tracking", weight: 25 },
  { key: "flow_tracking", label: "Flow Tracking", weight: 20 },
  { key: "pressure_overshoot", label: "Pressure Control", weight: 15 },
  { key: "channeling_risk", label: "Channeling Risk", weight: 10 },
  { key: "temp_stability", label: "Temp Stability", weight: 10 },
];

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

/** Rolling average with window size */
function rollingAvg(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

/** Standard deviation */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute a stable hash of profile stages for trend keying.
 * Simple string hash — not cryptographic, just for comparison.
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

// ── Per-frame target reconstruction ──────────────────────────
// Prefers embedded setpoints from shot data. Falls back to
// profile stage targets if setpoints are missing.

interface FrameTarget {
  pressure?: number;
  flow?: number;
  source: "frame_setpoint" | "profile_derived" | "unavailable";
}

function reconstructTargets(
  frames: ShotFrame[],
  profile?: Profile
): FrameTarget[] {
  // First pass: use embedded setpoints
  const targets: FrameTarget[] = frames.map((f) => {
    const sp = f.shot.setpoints;
    const hasPressure = sp?.pressure != null && !isNaN(sp.pressure);
    const hasFlow = sp?.flow != null && !isNaN(sp.flow);

    if (hasPressure || hasFlow) {
      return {
        pressure: hasPressure ? sp.pressure : undefined,
        flow: hasFlow ? sp.flow : undefined,
        source: "frame_setpoint" as const,
      };
    }
    return { source: "unavailable" as const };
  });

  // If majority of frames have setpoints, we're done
  const setpointCount = targets.filter(
    (t) => t.source === "frame_setpoint"
  ).length;
  if (setpointCount > frames.length * 0.5) return targets;

  // Fallback: derive from profile stages (time-based interpolation)
  if (!profile?.stages?.length) return targets;

  // Build a time→target lookup from profile stages
  const stageTargets = buildStageTargetCurve(profile.stages);
  if (!stageTargets.length) return targets;

  return frames.map((f, i) => {
    // Prefer existing frame setpoint
    if (targets[i].source === "frame_setpoint") return targets[i];

    const timeSec = f.time / 1000;
    const target = interpolateTarget(stageTargets, timeSec);
    if (target) {
      return { ...target, source: "profile_derived" as const };
    }
    return { source: "unavailable" as const };
  });
}

interface StageTargetPoint {
  timeSec: number;
  pressure?: number;
  flow?: number;
}

function buildStageTargetCurve(stages: ProfileStage[]): StageTargetPoint[] {
  const points: StageTargetPoint[] = [];
  let cumTime = 0;

  for (const stage of stages) {
    const dynPoints = stage.dynamics.points;
    if (stage.dynamics.over !== "time" || !dynPoints.length) {
      // For weight/piston-based stages, use first point as constant target
      const val = Number(dynPoints[0]?.[1] ?? 0);
      const exitTime = stage.exit_triggers.find((t) => t.type === "time");
      const duration = exitTime ? Number(exitTime.value) : 10; // fallback 10s

      const target: StageTargetPoint = { timeSec: cumTime };
      if (stage.type === "pressure") target.pressure = val;
      if (stage.type === "flow") target.flow = val;
      points.push(target);

      cumTime += duration;
      const endTarget: StageTargetPoint = { timeSec: cumTime };
      if (stage.type === "pressure") endTarget.pressure = val;
      if (stage.type === "flow") endTarget.flow = val;
      points.push(endTarget);
      continue;
    }

    // Time-based dynamics: interpolate points
    for (const [timeVal, targetVal] of dynPoints) {
      const t = cumTime + Number(timeVal);
      const v = Number(targetVal);
      const pt: StageTargetPoint = { timeSec: t };
      if (stage.type === "pressure") pt.pressure = v;
      if (stage.type === "flow") pt.flow = v;
      points.push(pt);
    }

    // Advance cumulative time by stage duration
    const lastPointTime = Number(dynPoints[dynPoints.length - 1][0]);
    const exitTime = stage.exit_triggers.find((t) => t.type === "time");
    cumTime += exitTime ? Number(exitTime.value) : lastPointTime;
  }

  return points;
}

function interpolateTarget(
  curve: StageTargetPoint[],
  timeSec: number
): { pressure?: number; flow?: number } | null {
  if (!curve.length) return null;

  // Before first point
  if (timeSec <= curve[0].timeSec) return { pressure: curve[0].pressure, flow: curve[0].flow };

  // After last point — hold last value
  if (timeSec >= curve[curve.length - 1].timeSec) {
    const last = curve[curve.length - 1];
    return { pressure: last.pressure, flow: last.flow };
  }

  // Find surrounding points and interpolate
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (timeSec >= a.timeSec && timeSec <= b.timeSec) {
      const ratio =
        b.timeSec - a.timeSec > 0
          ? (timeSec - a.timeSec) / (b.timeSec - a.timeSec)
          : 0;
      return {
        pressure:
          a.pressure != null && b.pressure != null
            ? a.pressure + (b.pressure - a.pressure) * ratio
            : (a.pressure ?? b.pressure),
        flow:
          a.flow != null && b.flow != null
            ? a.flow + (b.flow - a.flow) * ratio
            : (a.flow ?? b.flow),
      };
    }
  }

  return null;
}

// ── Metric Scorers ───────────────────────────────────────────

function scoreWeightAccuracy(
  frames: ShotFrame[],
  profile?: Profile
): ShotMetric {
  const key = "weight_accuracy";
  const label = "Weight Accuracy";

  if (!profile?.final_weight || profile.final_weight <= 0) {
    return { key, label, score: 0, status: "poor", value: "No target weight", applicable: false };
  }

  const weights = frames.map((f) => f.shot.weight).filter((w) => !isNaN(w) && w > 0);
  if (!weights.length) {
    return { key, label, score: 0, status: "poor", value: "No weight data", applicable: false };
  }

  const finalWeight = Math.max(...weights);
  const target = profile.final_weight;
  const error = Math.abs(finalWeight - target) / target;

  // If weight is >50% off target, it's likely intentional (different drink style,
  // flushing, or the barista deliberately overrides the profile target)
  if (error > 0.5) {
    return {
      key,
      label,
      score: 0,
      status: "poor",
      value: `${finalWeight.toFixed(1)}g / ${target}g target`,
      detail: `Weight is ${Math.round(error * 100)}% off the profile target (${finalWeight.toFixed(0)}g vs ${target}g) — likely intentional, not scored`,
      applicable: false,
    };
  }

  // Gentler curve: 0% error = 100, 5% = 100 (dead band), 30% = 0
  // This gives a flat perfect zone near target, then linear degrade
  const deadBand = 0.05;
  const maxError = 0.30;
  const effectiveError = Math.max(0, error - deadBand);
  const score = clamp(100 - (effectiveError / (maxError - deadBand)) * 100);

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `${finalWeight.toFixed(1)}g / ${target}g target`,
    detail:
      error < 0.05
        ? "Right on target"
        : finalWeight < target
          ? `${((target - finalWeight)).toFixed(1)}g under — consider a finer grind or longer extraction`
          : `${((finalWeight - target)).toFixed(1)}g over — consider a coarser grind`,
    applicable: true,
  };
}

function scorePressureTracking(
  frames: ShotFrame[],
  targets: FrameTarget[]
): ShotMetric {
  const key = "pressure_tracking";
  const label = "Pressure Tracking";

  const deviations: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    const target = targets[i]?.pressure;
    if (target == null || target <= 0) continue;
    const actual = frames[i].shot.pressure;
    if (isNaN(actual)) continue;
    deviations.push(Math.abs(actual - target));
  }

  if (deviations.length < 10) {
    return { key, label, score: 0, status: "poor", value: "Insufficient setpoint data", applicable: false };
  }

  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  // 0 bar deviation = 100, 1.5 bar = 0
  const score = clamp(100 - (avgDev / 1.5) * 100);

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `±${avgDev.toFixed(2)} bar avg deviation`,
    detail:
      avgDev < 0.3
        ? "Machine tracked the profile accurately"
        : `Average ${avgDev.toFixed(1)} bar off target — check grind size and puck prep`,
    applicable: true,
  };
}

function scoreFlowTracking(
  frames: ShotFrame[],
  targets: FrameTarget[]
): ShotMetric {
  const key = "flow_tracking";
  const label = "Flow Tracking";

  const deviations: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    const target = targets[i]?.flow;
    if (target == null || target <= 0) continue;
    const actual = frames[i].shot.flow;
    if (isNaN(actual)) continue;
    deviations.push(Math.abs(actual - target));
  }

  if (deviations.length < 10) {
    return { key, label, score: 0, status: "poor", value: "Insufficient setpoint data", applicable: false };
  }

  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  // 0 ml/s deviation = 100, 2 ml/s = 0
  const score = clamp(100 - (avgDev / 2.0) * 100);

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `±${avgDev.toFixed(2)} ml/s avg deviation`,
    detail:
      avgDev < 0.4
        ? "Flow closely followed the profile"
        : `Average ${avgDev.toFixed(1)} ml/s off target — grind or distribution may need adjustment`,
    applicable: true,
  };
}

function scorePressureOvershoot(
  frames: ShotFrame[],
  targets: FrameTarget[]
): ShotMetric {
  const key = "pressure_overshoot";
  const label = "Pressure Control";

  // Find max target pressure
  const targetPressures = targets
    .map((t) => t.pressure)
    .filter((p): p is number => p != null && p > 0);
  if (targetPressures.length < 5) {
    return { key, label, score: 0, status: "poor", value: "No target data", applicable: false };
  }

  const maxTarget = Math.max(...targetPressures);
  const pressures = frames.map((f) => f.shot.pressure).filter((p) => !isNaN(p));
  if (!pressures.length) {
    return { key, label, score: 0, status: "poor", value: "No pressure data", applicable: false };
  }

  const maxActual = Math.max(...pressures);
  const overshoot = Math.max(0, maxActual - maxTarget);

  // Count sustained overshoot frames (>0.3 bar over target for >1s)
  let overshootFrames = 0;
  for (let i = 0; i < frames.length; i++) {
    const target = targets[i]?.pressure;
    if (target == null) continue;
    if (frames[i].shot.pressure > target + 0.3) overshootFrames++;
  }
  const overshootRatio = overshootFrames / Math.max(1, frames.length);

  // Score: penalize both magnitude and duration
  const magPenalty = overshoot * 30; // lose 30 pts per bar over
  const durPenalty = overshootRatio * 50; // lose up to 50 pts for sustained overshoot
  const score = clamp(100 - magPenalty - durPenalty);

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: overshoot < 0.2 ? "Well controlled" : `+${overshoot.toFixed(1)} bar peak overshoot`,
    detail:
      overshoot < 0.2
        ? "Pressure stayed within profile targets"
        : `Peak ${maxActual.toFixed(1)} bar vs ${maxTarget.toFixed(1)} bar target — try a coarser grind`,
    applicable: true,
  };
}

function scoreChannelingRisk(frames: ShotFrame[]): ShotMetric {
  const key = "channeling_risk";
  const label = "Channeling Risk";

  // Need enough frames for meaningful analysis
  const flows = frames
    .filter((f) => f.shot.flow > 0 && f.shot.pressure > 1) // only during active extraction
    .map((f) => f.shot.flow);

  if (flows.length < 20) {
    return {
      key, label, score: 0, status: "poor",
      value: "Not enough extraction data",
      applicable: false,
    };
  }

  // Look for flow spikes relative to rolling average
  const windowSize = 5;
  const rolling = rollingAvg(flows, windowSize);
  let spikeCount = 0;
  let maxSpikePct = 0;

  for (let i = windowSize; i < flows.length - 2; i++) {
    const avg = rolling[i];
    if (avg < 0.3) continue; // skip near-zero flow
    const spike = (flows[i] - avg) / avg;
    if (spike > 0.35) {
      // Also check for simultaneous pressure drop (stronger signal)
      spikeCount++;
      maxSpikePct = Math.max(maxSpikePct, spike);
    }
  }

  // Score: 0 spikes = 100, degrade per spike
  const score = clamp(100 - spikeCount * 15 - maxSpikePct * 20);

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: spikeCount === 0 ? "No spikes detected" : `${spikeCount} flow spike${spikeCount > 1 ? "s" : ""} detected`,
    detail:
      spikeCount === 0
        ? "Even flow throughout — good puck prep"
        : `Possible channeling — ${spikeCount} sudden flow increase${spikeCount > 1 ? "s" : ""} (up to ${(maxSpikePct * 100).toFixed(0)}% above average). Review puck prep and distribution.`,
    applicable: true,
  };
}

// Espresso brew temperature must be in a reasonable range to be scored.
// Below MIN_BREW_TEMP the shot is likely a flush/throwaway.
const MIN_BREW_TEMP_C = 70;
const IDEAL_BREW_TEMP_LOW = 85;
const IDEAL_BREW_TEMP_HIGH = 96;

function scoreTempStability(frames: ShotFrame[]): ShotMetric {
  const key = "temp_stability";
  const label = "Temp Stability";

  // Use bar_mid_up as primary brew temp sensor (same as computeShotStats)
  // Skip first 5s to ignore initial thermal transient
  const extractionFrames = frames.filter((f) => f.time > 5000);
  const temps = extractionFrames
    .map((f) => {
      const t = f.sensors.bar_mid_up;
      return typeof t === "number" && !isNaN(t) ? t : NaN;
    })
    .filter((t) => !isNaN(t));

  if (temps.length < 10) {
    return {
      key, label, score: 0, status: "poor",
      value: "Not enough temp data",
      detail: "Temperature sensor data insufficient for analysis",
      applicable: false,
    };
  }

  const sd = stdDev(temps);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  // If avg temp is below minimum, this isn't a real espresso shot
  if (avgTemp < MIN_BREW_TEMP_C) {
    return {
      key, label, score: 0, status: "poor",
      value: `${avgTemp.toFixed(1)}°C — too cold`,
      detail: `Average brew temperature ${avgTemp.toFixed(0)}°C is below ${MIN_BREW_TEMP_C}°C — likely a flush or throwaway shot`,
      applicable: false,
    };
  }

  // Stability score: 0°C std dev = 100, 3°C = 0
  let score = clamp(100 - (sd / 3) * 100);

  // Range penalty: if avg temp is outside the ideal espresso window,
  // reduce score proportionally (up to -30 points)
  if (avgTemp < IDEAL_BREW_TEMP_LOW) {
    const degBelow = IDEAL_BREW_TEMP_LOW - avgTemp;
    score = clamp(score - Math.min(degBelow * 2, 30));
  } else if (avgTemp > IDEAL_BREW_TEMP_HIGH) {
    const degAbove = avgTemp - IDEAL_BREW_TEMP_HIGH;
    score = clamp(score - Math.min(degAbove * 2, 30));
  }

  const rangeNote =
    avgTemp < IDEAL_BREW_TEMP_LOW
      ? ` (below ideal ${IDEAL_BREW_TEMP_LOW}–${IDEAL_BREW_TEMP_HIGH}°C range)`
      : avgTemp > IDEAL_BREW_TEMP_HIGH
        ? ` (above ideal ${IDEAL_BREW_TEMP_LOW}–${IDEAL_BREW_TEMP_HIGH}°C range)`
        : "";

  return {
    key,
    label,
    score: Math.round(score),
    status: statusFromScore(score),
    value: `${avgTemp.toFixed(1)}°C ±${sd.toFixed(1)}°C${rangeNote}`,
    detail:
      avgTemp < IDEAL_BREW_TEMP_LOW || avgTemp > IDEAL_BREW_TEMP_HIGH
        ? `Temperature ${avgTemp.toFixed(0)}°C is outside the ideal espresso range`
        : sd < 0.5
          ? "Excellent thermal stability"
          : sd < 1.5
            ? "Minor temperature fluctuation — acceptable for most profiles"
            : "Significant temperature variation — consider a longer preheat",
    applicable: true,
  };
}

// ── Suggestion Engine ────────────────────────────────────────

function generateSuggestions(metrics: ShotMetric[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const m of metrics) {
    if (!m.applicable || m.score >= 80) continue;

    switch (m.key) {
      case "weight_accuracy":
        if (m.score < 50) {
          suggestions.push({
            priority: "high",
            metric: m.key,
            message: "Weight significantly off target",
            detail: m.detail ?? "Check dose weight and grind size. Large deviations suggest major parameter changes needed.",
          });
        } else {
          suggestions.push({
            priority: "medium",
            metric: m.key,
            message: "Weight slightly off target",
            detail: m.detail ?? "Fine-tune grind size by half a step.",
          });
        }
        break;

      case "pressure_tracking":
        suggestions.push({
          priority: m.score < 50 ? "high" : "medium",
          metric: m.key,
          message: "Pressure deviated from profile",
          detail: m.detail ?? "The machine struggled to follow the target pressure curve. This usually indicates the grind is too fine (high pressure) or too coarse (low pressure).",
        });
        break;

      case "flow_tracking":
        suggestions.push({
          priority: m.score < 50 ? "high" : "medium",
          metric: m.key,
          message: "Flow deviated from profile",
          detail: m.detail ?? "Flow didn't match target — grind adjustment or better puck distribution may help.",
        });
        break;

      case "pressure_overshoot":
        suggestions.push({
          priority: m.score < 50 ? "high" : "medium",
          metric: m.key,
          message: "Pressure exceeded profile targets",
          detail: "Sustained pressure above target suggests the grind is too fine. Try going 1–2 steps coarser.",
        });
        break;

      case "channeling_risk":
        suggestions.push({
          priority: m.score < 60 ? "high" : "low",
          metric: m.key,
          message: "Possible channeling detected",
          detail: "Sudden flow spikes suggest water found weak spots in the puck. Focus on even distribution and consistent tamping.",
        });
        break;

      case "temp_stability":
        if (m.score < 50) {
          suggestions.push({
            priority: "medium",
            metric: m.key,
            message: "Temperature fluctuated during extraction",
            detail: "Allow more preheat time before pulling the shot for better thermal stability.",
          });
        }
        break;
    }
  }

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);

  return suggestions;
}

// ── Throwaway / flush detection ──────────────────────────────

function detectThrowaway(
  frames: ShotFrame[],
  metrics: ShotMetric[],
  applicableCount: number
): { throwaway: boolean; reason?: string } {
  if (frames.length < 5) {
    return { throwaway: true, reason: "Too few data frames" };
  }

  // Very short shot (<8s total) is almost certainly a flush
  const lastTime = frames[frames.length - 1]?.time ?? 0;
  if (lastTime < 8000) {
    return { throwaway: true, reason: "Shot under 8 seconds — likely a flush" };
  }

  // Check brew temp — if avg is below espresso range, it's a warmup
  const extractionFrames = frames.filter((f) => f.time > 3000);
  const temps = extractionFrames
    .map((f) => f.sensors.bar_mid_up)
    .filter((t) => typeof t === "number" && !isNaN(t) && t > 0);
  if (temps.length > 5) {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    if (avgTemp < MIN_BREW_TEMP_C) {
      return { throwaway: true, reason: `Brew temp ${avgTemp.toFixed(0)}°C — likely a flush or warmup` };
    }
  }

  // If almost no metrics are applicable, the shot data is too sparse to be real
  if (applicableCount <= 1 && frames.length > 20) {
    return { throwaway: true, reason: "Insufficient data for meaningful analysis" };
  }

  return { throwaway: false };
}

// ── Main Entry Point ─────────────────────────────────────────

export function analyzeShot(shot: ShotEntry): ShotAnalysis {
  const frames = shot.data ?? [];
  const profile = shot.profile;

  // Reconstruct per-frame targets
  const targets = reconstructTargets(frames, profile);

  // Score each metric
  const metrics: ShotMetric[] = [
    scoreWeightAccuracy(frames, profile),
    scorePressureTracking(frames, targets),
    scoreFlowTracking(frames, targets),
    scorePressureOvershoot(frames, targets),
    scoreChannelingRisk(frames),
    scoreTempStability(frames),
  ];

  // Compute weighted overall score (only from applicable metrics)
  const applicable = metrics.filter((m) => m.applicable);
  let overallScore = 0;
  if (applicable.length > 0) {
    const totalWeight = applicable.reduce((sum, m) => {
      const config = METRIC_CONFIGS.find((c) => c.key === m.key);
      return sum + (config?.weight ?? 10);
    }, 0);

    overallScore = applicable.reduce((sum, m) => {
      const config = METRIC_CONFIGS.find((c) => c.key === m.key);
      const weight = config?.weight ?? 10;
      return sum + (m.score * weight) / totalWeight;
    }, 0);
  }

  // Detect throwaway/flush shots
  const { throwaway, reason: throwawayReason } = detectThrowaway(frames, metrics, applicable.length);

  // Generate actionable suggestions
  const suggestions = generateSuggestions(metrics);

  return {
    overallScore: Math.round(overallScore),
    metrics,
    suggestions,
    applicableCount: applicable.length,
    totalCount: metrics.length,
    analysisVersion: ANALYSIS_VERSION,
    computedAt: Date.now(),
    throwaway,
    throwawayReason,
  };
}
