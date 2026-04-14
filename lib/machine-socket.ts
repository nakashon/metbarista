/**
 * Socket.IO real-time client for live brew data.
 *
 * Connects directly to the machine. The site runs on HTTP so the browser
 * can reach the machine on the local network without Private Network Access issues.
 * If a future HTTPS migration is needed, revisit this module.
 */

import type { LiveStatus, LiveTemperatures } from "./types";

type SocketEventMap = {
  status: (data: LiveStatus) => void;
  temperatures: (data: LiveTemperatures) => void;
  connect: () => void;
  disconnect: () => void;
  error: (err: Error) => void;
};

let socket: import("socket.io-client").Socket | null = null;
let isConnecting = false;

function getMachineIp(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("metbarista_machine_ip");
}

export async function connectSocket(
  handlers: Partial<SocketEventMap>
): Promise<void> {
  if (socket?.connected || isConnecting) return;

  const ip = getMachineIp();
  if (!ip) throw new Error("Machine IP not configured");

  isConnecting = true;

  try {
    const { io } = await import("socket.io-client");

    socket = io(`http://${ip}`, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 8000,
    });

    if (handlers.connect)      socket.on("connect", handlers.connect);
    if (handlers.disconnect)   socket.on("disconnect", handlers.disconnect);
    if (handlers.error)        socket.on("connect_error", handlers.error);
    if (handlers.status)       socket.on("status", handlers.status);
    if (handlers.temperatures) socket.on("temperatures", handlers.temperatures);
  } finally {
    isConnecting = false;
  }
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function sendAction(action: string): void {
  socket?.emit("action", { name: action });
}
