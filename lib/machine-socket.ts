/**
 * Socket.IO real-time client for live brew data.
 *
 * When on HTTP (http://metbarista.com), connects directly via socket.io-client.
 * When on HTTPS, falls back to manual polling through the Cloudflare Worker proxy
 * (browsers block https:// pages from opening ws:// to local IPs).
 */

import type { LiveStatus, LiveTemperatures } from "./types";

const WORKER_PROXY = "https://metbarista-feed-proxy.metbarista.workers.dev";

type SocketEventMap = {
  status: (data: LiveStatus) => void;
  temperatures: (data: LiveTemperatures) => void;
  connect: () => void;
  disconnect: () => void;
  error: (err: Error) => void;
};

let socket: import("socket.io-client").Socket | null = null;
let isConnecting = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollSid: string | null = null;

function getMachineIp(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("metbarista_machine_ip");
}

function isHttps(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

// ── Parse socket.io polling body → array of [event, data] ──────────────────
function parseSioPackets(raw: string): Array<[string, unknown]> {
  const results: Array<[string, unknown]> = [];
  // packets are separated by \x1e (record separator)
  const packets = raw.split("\x1e");
  for (const pkt of packets) {
    // socket.io message packet starts with "42"
    if (!pkt.startsWith("42")) continue;
    try {
      const arr = JSON.parse(pkt.slice(2));
      if (Array.isArray(arr) && arr.length >= 2) {
        results.push([arr[0] as string, arr[1]]);
      }
    } catch { /* skip malformed */ }
  }
  return results;
}

// ── Worker-proxied HTTP polling ─────────────────────────────────────────────
async function startPolling(handlers: Partial<SocketEventMap>): Promise<void> {
  const ip = getMachineIp();
  if (!ip) return;

  // Step 1: open session
  const openRes = await fetch(`${WORKER_PROXY}/?ip=${encodeURIComponent(ip)}&eio=4`);
  if (!openRes.ok) throw new Error("Proxy unreachable");
  const openRaw = await openRes.text();
  const idx = openRaw.indexOf("{");
  if (idx < 0) throw new Error("Bad open packet");
  const { sid } = JSON.parse(openRaw.slice(idx));
  pollSid = sid;

  // Step 2: send socket.io connect packet "40"
  await fetch(`${WORKER_PROXY}/?ip=${encodeURIComponent(ip)}&eio=4&sid=${sid}`, {
    method: "POST",
    body: "40",
    headers: { "Content-Type": "text/plain" },
  });

  handlers.connect?.();

  // Step 3: poll every 2 s
  pollTimer = setInterval(async () => {
    if (!pollSid) return;
    try {
      const res = await fetch(`${WORKER_PROXY}/?ip=${encodeURIComponent(ip)}&eio=4&sid=${pollSid}&t=${Date.now()}`);
      if (!res.ok) return;
      const raw = await res.text();
      for (const [event, data] of parseSioPackets(raw)) {
        if (event === "status" && handlers.status) handlers.status(data as LiveStatus);
        if (event === "temperatures" && handlers.temperatures) handlers.temperatures(data as LiveTemperatures);
      }
    } catch { /* network blip — keep polling */ }
  }, 2000);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function connectSocket(handlers: Partial<SocketEventMap>): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (isHttps()) {
      // HTTPS: use worker proxy polling (Private Network Access blocks direct ws://)
      await startPolling(handlers);
    } else {
      // HTTP: connect directly via socket.io-client
      const ip = getMachineIp();
      if (!ip) throw new Error("Machine IP not configured");

      const { io } = await import("socket.io-client");
      socket = io(`http://${ip}`, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 8000,
      });

      if (handlers.connect)     socket.on("connect", handlers.connect);
      if (handlers.disconnect)  socket.on("disconnect", handlers.disconnect);
      if (handlers.error)       socket.on("connect_error", handlers.error);
      if (handlers.status)      socket.on("status", handlers.status);
      if (handlers.temperatures) socket.on("temperatures", handlers.temperatures);
    }
  } finally {
    isConnecting = false;
  }
}

export function disconnectSocket(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  pollSid = null;
  socket?.disconnect();
  socket = null;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? pollSid !== null;
}

export function sendAction(action: string): void {
  socket?.emit("action", { name: action });
}
