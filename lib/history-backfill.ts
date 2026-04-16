/**
 * History Backfill — progressively analyze all historical shots.
 *
 * Runs in the background after dashboard connects. Tracks a watermark
 * so it only processes new shots on subsequent visits.
 */

import { getHistory } from "./machine-api";
import { analyzeShot, ANALYSIS_VERSION } from "./shot-analysis";
import { recordTrend } from "./shot-trend";
import { recordShot } from "./barista-stats";
import type { ShotEntry } from "./types";

const WATERMARK_KEY = "metbarista_backfill_watermark";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 50; // small delay between batches to keep UI responsive

interface Watermark {
  lastShotTimestamp: number;
  analysisVersion: number;
  machineSerial: string;
  processedCount: number;
}

function getWatermark(): Watermark | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WATERMARK_KEY);
    return raw ? (JSON.parse(raw) as Watermark) : null;
  } catch {
    return null;
  }
}

function setWatermark(wm: Watermark): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATERMARK_KEY, JSON.stringify(wm));
}

/** Process a single shot — analyze, record trend, record for gamification. */
function processShot(shot: ShotEntry): void {
  const analysis = analyzeShot(shot);
  if (analysis.applicableCount === 0 || analysis.throwaway) return;

  if (shot.profile) {
    recordTrend(shot.profile, shot.time, analysis);
    recordShot(shot.time, shot.profile.id, shot.profile.name, analysis);
  }
}

export interface BackfillProgress {
  total: number;
  processed: number;
  skipped: number;
  done: boolean;
}

/**
 * Run progressive backfill. Returns an async generator yielding progress.
 * Call from dashboard after successful connection.
 */
export async function* backfillHistory(
  machineSerial: string,
  onProgress?: (progress: BackfillProgress) => void
): AsyncGenerator<BackfillProgress> {
  const wm = getWatermark();

  // If already backfilled with same version and serial, check for new shots only
  const needsFull =
    !wm ||
    wm.machineSerial !== machineSerial ||
    wm.analysisVersion !== ANALYSIS_VERSION;

  let shots: ShotEntry[];
  try {
    shots = await getHistory();
  } catch {
    return;
  }

  if (!shots.length) return;

  // Sort oldest first for chronological processing
  const sorted = [...shots].sort((a, b) => a.time - b.time);

  // Filter to unprocessed shots
  const toProcess = needsFull
    ? sorted
    : sorted.filter((s) => s.time > (wm?.lastShotTimestamp ?? 0));

  const progress: BackfillProgress = {
    total: toProcess.length,
    processed: 0,
    skipped: sorted.length - toProcess.length,
    done: false,
  };

  if (toProcess.length === 0) {
    progress.done = true;
    yield progress;
    return;
  }

  // Process in batches
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    for (const shot of batch) {
      processShot(shot);
      progress.processed++;
    }

    // Update watermark after each batch
    const lastShot = batch[batch.length - 1];
    setWatermark({
      lastShotTimestamp: lastShot.time,
      analysisVersion: ANALYSIS_VERSION,
      machineSerial,
      processedCount: (wm?.processedCount ?? 0) + batch.length,
    });

    yield progress;
    onProgress?.(progress);

    // Yield to UI thread between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  progress.done = true;
  yield progress;
  onProgress?.(progress);
}

/**
 * Simple non-generator version — runs backfill and calls onProgress.
 * Use from useEffect in dashboard.
 */
export async function runBackfill(
  machineSerial: string,
  onProgress?: (progress: BackfillProgress) => void
): Promise<BackfillProgress> {
  let lastProgress: BackfillProgress = { total: 0, processed: 0, skipped: 0, done: true };

  for await (const p of backfillHistory(machineSerial, onProgress)) {
    lastProgress = p;
  }

  return lastProgress;
}

/** Check if backfill is needed (new shots or version change). */
export function needsBackfill(machineSerial: string): boolean {
  const wm = getWatermark();
  if (!wm) return true;
  if (wm.machineSerial !== machineSerial) return true;
  if (wm.analysisVersion !== ANALYSIS_VERSION) return true;
  return false;
}
