/**
 * Real-time live data from the Meticulous machine.
 *
 * Uses manual socket.io EIO4 HTTP-polling instead of the socket.io-client
 * library, which has trouble connecting through browsers on both HTTP and HTTPS.
 * Curl-verified: open → POST "40" → GET loop returns status events reliably.
 */

import type { LiveStatus, LiveTemperatures } from "./types";

type SocketEventMap = {
  status: (data: LiveStatus) => void;
  temperatures: (data: LiveTemperatures) => void;
  connect: () => void;
  disconnect: () => void;
  error: (err: Error) => void;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeSid: string | null = null;
let activeIp: string | null = null;
let stopped = false;

function getMachineIp(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("metbarista_machine_ip");
}

/** Parse socket.io EIO4 polling body into [event, data] pairs */
function parsePackets(raw: string): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  // Multiple packets separated by record separator \x1e
  for (const pkt of raw.split("\x1e")) {
    if (!pkt.startsWith("42")) continue; // only message packets
    try {
      const arr = JSON.parse(pkt.slice(2));
      if (Array.isArray(arr) && arr.length >= 2) out.push([arr[0] as string, arr[1]]);
    } catch { /* skip malformed */ }
  }
  return out;
}

export async function connectSocket(handlers: Partial<SocketEventMap>): Promise<void> {
  if (activeSid) return; // already running
  stopped = false;

  const ip = getMachineIp();
  if (!ip) throw new Error("Machine IP not configured");
  activeIp = ip;

  const base = `http://${ip}/socket.io/?EIO=4&transport=polling`;

  // Step 1 — open session
  const openRes = await fetch(base, { signal: AbortSignal.timeout(6000) });
  if (!openRes.ok) throw new Error(`Open failed: ${openRes.status}`);
  const openRaw = await openRes.text();
  const jsonStart = openRaw.indexOf("{");
  if (jsonStart < 0) throw new Error("Bad open packet");
  const { sid } = JSON.parse(openRaw.slice(jsonStart)) as { sid: string };
  activeSid = sid;

  // Step 2 — send socket.io namespace connect "40"
  await fetch(`${base}&sid=${sid}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "40",
    signal: AbortSignal.timeout(6000),
  });

  handlers.connect?.();

  // Step 3 — poll every 2 s
  const poll = async () => {
    if (stopped || !activeSid) return;
    try {
      const res = await fetch(`${base}&sid=${activeSid}&t=${Date.now()}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return;
      const raw = await res.text();
      for (const [event, data] of parsePackets(raw)) {
        if (event === "status")      handlers.status?.(data as LiveStatus);
        if (event === "sensors")     handlers.temperatures?.(data as LiveTemperatures);
        if (event === "temperatures") handlers.temperatures?.(data as LiveTemperatures);
      }
    } catch { /* network blip — keep polling */ }
  };

  // Fire first poll immediately so stats appear without waiting 2 s
  await poll();
  pollTimer = setInterval(poll, 2000);
}

export function disconnectSocket(): void {
  stopped = true;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  activeSid = null;
  activeIp = null;
}

export function isSocketConnected(): boolean {
  return activeSid !== null;
}

// Not used with polling but kept for API compat
export function sendAction(_action: string): void { /* no-op */ }
