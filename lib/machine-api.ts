/**
 * Meticulous Machine REST API client
 * Talks directly to the machine on your local network.
 * CORS is fully open (Access-Control-Allow-Origin: *) so this works from any origin.
 */

import type {
  MachineInfo,
  MachineSettings,
  Profile,
  HistoryResponse,
  ActionType,
  ShotEntry,
  ShotStats,
  ShotFrame,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8000;

// ── Helpers ──────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const ip = localStorage.getItem("mbrista_machine_ip");
  return ip ? `http://${ip}` : "";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  if (!base) throw new Error("Machine IP not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/api/v1${path}`, {
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ── Machine info ─────────────────────────────────────────────

export async function getMachineInfo(): Promise<MachineInfo> {
  return apiFetch<MachineInfo>("/machine");
}

export async function getSettings(): Promise<MachineSettings> {
  return apiFetch<MachineSettings>("/settings");
}

// ── Profiles ─────────────────────────────────────────────────

export async function listProfiles(): Promise<Profile[]> {
  return apiFetch<Profile[]>("/profile/list");
}

export async function loadProfileById(id: string): Promise<void> {
  await apiFetch<unknown>("/profile/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function loadProfileInline(profile: Profile): Promise<void> {
  await apiFetch<unknown>("/profile/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export async function saveProfile(profile: Profile): Promise<void> {
  await apiFetch<unknown>("/profile/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export async function deleteProfile(id: string): Promise<void> {
  await apiFetch<unknown>(`/profile/${id}`, { method: "DELETE" });
}

// Returns the URL for a profile image (served by the machine)
export function getProfileImageUrl(imagePath: string): string {
  const base = getBaseUrl();
  if (!base || !imagePath) return "";
  // imagePath is like "/api/v1/profile/image/abc123.png"
  return `${base}${imagePath}`;
}

// ── History ──────────────────────────────────────────────────

export async function getHistory(): Promise<ShotEntry[]> {
  const res = await apiFetch<HistoryResponse>("/history");
  // Sort newest first
  return res.history.sort((a, b) => b.time - a.time);
}

// ── Actions ──────────────────────────────────────────────────

export async function executeAction(action: ActionType): Promise<void> {
  await apiFetch<unknown>("/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: action }),
  });
}

// ── Connection test ──────────────────────────────────────────

export async function testConnection(ip: string): Promise<MachineInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`http://${ip}/api/v1/machine`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<MachineInfo>;
  } finally {
    clearTimeout(timer);
  }
}

// ── Shot stats helpers ────────────────────────────────────────

export function computeShotStats(frames: ShotFrame[]): ShotStats {
  if (!frames.length) {
    return {
      durationMs: 0,
      durationSec: 0,
      maxPressure: 0,
      maxFlow: 0,
      finalWeight: 0,
      avgTemp: 0,
      phases: [],
      dataPoints: 0,
    };
  }

  const first = frames[0];
  const last = frames[frames.length - 1];
  const durationMs = last.time - first.time;

  const pressures = frames.map((f) => f.shot.pressure).filter((v) => !isNaN(v));
  const flows = frames.map((f) => f.shot.flow).filter((v) => !isNaN(v));
  const weights = frames.map((f) => f.shot.weight).filter((v) => !isNaN(v) && v > 0);
  const temps = frames
    .map((f) => f.sensors.bar_mid_up)
    .filter((v) => typeof v === "number" && !isNaN(v));
  const phases = [...new Set(frames.map((f) => f.status))];

  return {
    durationMs,
    durationSec: Math.round(durationMs / 1000),
    maxPressure: pressures.length ? Math.max(...pressures) : 0,
    maxFlow: flows.length ? Math.max(...flows) : 0,
    finalWeight: weights.length ? Math.max(...weights) : 0,
    avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
    phases,
    dataPoints: frames.length,
  };
}

// Downsample frames for chart rendering (target ~150 points)
export function downsampleFrames(frames: ShotFrame[], target = 150): ShotFrame[] {
  if (frames.length <= target) return frames;
  const step = Math.ceil(frames.length / target);
  return frames.filter((_, i) => i % step === 0);
}
