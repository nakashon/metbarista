/**
 * Shot Trend Storage — tracks analysis scores over time per profile.
 *
 * Stored in localStorage. Keyed by profileId + stageHash so that
 * edited profiles start a fresh trend line.
 */

import type { ShotAnalysis } from "./shot-analysis";
import { profileStageHash, ANALYSIS_VERSION } from "./shot-analysis";
import type { Profile } from "./types";

// ── Types ────────────────────────────────────────────────────

export interface TrendEntry {
  shotTimestamp: number; // unix timestamp of the shot
  overallScore: number;
  metrics: Record<string, number>; // metric key → score
  analysisVersion: number;
}

export interface ProfileTrend {
  profileId: string;
  profileName: string;
  stageHash: string;
  entries: TrendEntry[];
}

type TrendStore = Record<string, ProfileTrend>; // key = `${profileId}:${stageHash}`

// ── Storage ──────────────────────────────────────────────────

const STORAGE_KEY = "metbarista_shot_trends";
const MAX_ENTRIES_PER_PROFILE = 50;

function readStore(): TrendStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as TrendStore;
  } catch {
    return {};
  }
}

function writeStore(store: TrendStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ── Public API ───────────────────────────────────────────────

/** Build the composite key for a profile trend. */
export function trendKey(profile: Profile): string {
  const hash = profileStageHash(profile);
  return `${profile.id}:${hash}`;
}

/** Record an analysis result for a shot. Deduplicates by timestamp. */
export function recordTrend(
  profile: Profile,
  shotTimestamp: number,
  analysis: ShotAnalysis
): void {
  const store = readStore();
  const key = trendKey(profile);

  if (!store[key]) {
    store[key] = {
      profileId: profile.id,
      profileName: profile.name,
      stageHash: profileStageHash(profile),
      entries: [],
    };
  }

  const trend = store[key];

  // Deduplicate: don't add if this shot timestamp already exists
  if (trend.entries.some((e) => e.shotTimestamp === shotTimestamp)) return;

  // Build metric scores map
  const metrics: Record<string, number> = {};
  for (const m of analysis.metrics) {
    if (m.applicable) metrics[m.key] = m.score;
  }

  trend.entries.push({
    shotTimestamp,
    overallScore: analysis.overallScore,
    metrics,
    analysisVersion: analysis.analysisVersion,
  });

  // Sort by timestamp ascending
  trend.entries.sort((a, b) => a.shotTimestamp - b.shotTimestamp);

  // Cap entries
  if (trend.entries.length > MAX_ENTRIES_PER_PROFILE) {
    trend.entries = trend.entries.slice(-MAX_ENTRIES_PER_PROFILE);
  }

  writeStore(store);
}

/** Get trend data for a specific profile. */
export function getTrend(profile: Profile): ProfileTrend | null {
  const store = readStore();
  return store[trendKey(profile)] ?? null;
}

/** Get trend data by profile ID (returns all stage hash variants). */
export function getTrendsByProfileId(profileId: string): ProfileTrend[] {
  const store = readStore();
  return Object.values(store).filter((t) => t.profileId === profileId);
}

/**
 * Get the most recent N entries for a profile (current version only).
 * Filters to current ANALYSIS_VERSION by default for fair comparison.
 */
export function getRecentTrend(
  profile: Profile,
  count = 10,
  versionFilter = true
): TrendEntry[] {
  const trend = getTrend(profile);
  if (!trend) return [];

  let entries = trend.entries;
  if (versionFilter) {
    entries = entries.filter((e) => e.analysisVersion === ANALYSIS_VERSION);
  }

  return entries.slice(-count);
}

/**
 * Compute trend direction: improving, declining, or stable.
 * Based on linear regression of recent scores.
 */
export function trendDirection(
  entries: TrendEntry[]
): "improving" | "declining" | "stable" | "insufficient" {
  if (entries.length < 3) return "insufficient";

  // Simple linear regression on score vs index
  const n = entries.length;
  const scores = entries.map((e) => e.overallScore);
  const meanX = (n - 1) / 2;
  const meanY = scores.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (scores[i] - meanY);
    den += (i - meanX) ** 2;
  }

  const slope = den > 0 ? num / den : 0;

  // >1 pt per shot = improving, <-1 = declining
  if (slope > 1) return "improving";
  if (slope < -1) return "declining";
  return "stable";
}

/** Get all stored trends (for debugging / export). */
export function getAllTrends(): TrendStore {
  return readStore();
}
