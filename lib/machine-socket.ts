/**
 * Real-time live data from the Meticulous machine.
 *
 * Uses manual socket.io EIO4 HTTP-polling instead of the socket.io-client
 * library, which has trouble connecting through browsers on both HTTP and HTTPS.
 * Curl-verified: open → POST "40" → GET loop returns status events reliably.
 */

import type { LiveStatus, LiveTemperatures } from "./types";
import {
  LOCAL_NETWORK_PERMISSION_TIMEOUT_MS,
  localNetworkRequestInit,
} from "./local-network";

type SocketEventMap = {
  status: (data: LiveStatus) => void;
  temperatures: (data: LiveTemperatures) => void;
  connect: () => void;
  disconnect: () => void;
  error: (err: Error) => void;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeSid: string | null = null;
let activeBase: string | null = null;
let stopped = false;
let activeHandlers: Partial<SocketEventMap> = {};

function getMachineIp(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("metbarista_machine_ip");
}

/** Parse socket.io EIO4 polling body into [event, data] pairs */
function parsePackets(raw: string): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  for (const pkt of raw.split("\x1e")) {
    if (pkt === "2") {
      // ping — send pong asynchronously (fire and forget)
      if (activeSid && activeBase) {
        fetch(`${activeBase}&sid=${activeSid}`, localNetworkRequestInit({
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "3",
        })).catch(() => {});
      }
      continue;
    }
    if (!pkt.startsWith("42")) continue; // only message packets
    try {
      const arr = JSON.parse(pkt.slice(2));
      if (Array.isArray(arr) && arr.length >= 2) out.push([arr[0] as string, arr[1]]);
    } catch { /* skip malformed */ }
  }
  return out;
}

async function doPoll(): Promise<void> {
  if (stopped || !activeSid || !activeBase) return;
  try {
    const res = await fetch(`${activeBase}&sid=${activeSid}&t=${Date.now()}`, localNetworkRequestInit({
      signal: AbortSignal.timeout(5000),
    }));
    if (!res.ok) return;
    const raw = await res.text();
    for (const [event, data] of parsePackets(raw)) {
      if (event === "status")       activeHandlers.status?.(data as LiveStatus);
      if (event === "sensors")      activeHandlers.temperatures?.(data as LiveTemperatures);
      if (event === "temperatures") activeHandlers.temperatures?.(data as LiveTemperatures);
    }
  } catch { /* network blip — keep polling */ }
}

export async function connectSocket(handlers: Partial<SocketEventMap>): Promise<void> {
  if (activeSid) return; // already running
  stopped = false;
  activeHandlers = handlers;

  const ip = getMachineIp();
  if (!ip) throw new Error("Machine IP not configured");

  const base = `http://${ip}/socket.io/?EIO=4&transport=polling`;
  activeBase = base;

  // Step 1 — open session
  const openRes = await fetch(base, localNetworkRequestInit({
    signal: AbortSignal.timeout(LOCAL_NETWORK_PERMISSION_TIMEOUT_MS),
  }));
  if (!openRes.ok) throw new Error(`Open failed: ${openRes.status}`);
  const openRaw = await openRes.text();
  const jsonStart = openRaw.indexOf("{");
  if (jsonStart < 0) throw new Error("Bad open packet");
  const { sid } = JSON.parse(openRaw.slice(jsonStart)) as { sid: string };
  activeSid = sid;

  // Step 2 — send socket.io namespace connect "40"
  await fetch(`${base}&sid=${sid}`, localNetworkRequestInit({
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "40",
    signal: AbortSignal.timeout(6000),
  }));

  handlers.connect?.();

  // Step 3 — poll every 2 s; first poll fires immediately
  await doPoll();
  pollTimer = setInterval(doPoll, 2000);
}

export function disconnectSocket(): void {
  stopped = true;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  activeSid = null;
  activeBase = null;
  activeHandlers = {};
}

export function isSocketConnected(): boolean {
  return activeSid !== null;
}

/** Force an immediate poll — call after actions to get instant feedback */
export function refreshNow(): void {
  doPoll();
}

// Not used with polling but kept for API compat
export function sendAction(_action: string): void { /* no-op */ }
