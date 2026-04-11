"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, Loader2 } from "lucide-react";
import { getSavedIp } from "@/lib/connection-store";
import { testConnection } from "@/lib/machine-api";
import type { ConnectionStatus } from "@/lib/types";

export function ConnectionDot() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [machineName, setMachineName] = useState("");

  useEffect(() => {
    const ip = getSavedIp();
    if (!ip) return;
    setStatus("connecting");
    testConnection(ip).then((info) => { setMachineName(info.name); setStatus("connected"); }).catch(() => setStatus("error"));
  }, []);

  const label = status === "connected" ? machineName || "Connected"
    : status === "connecting" ? "Connecting…"
    : status === "error" ? "Reconnect"
    : "Connect";

  const styles = {
    connected: "border-[#e8944a]/25 bg-[#e8944a]/10 text-[#e8944a]",
    connecting: "border-white/[0.08] bg-white/[0.04] text-[#f5f0ea]/50",
    error: "border-white/[0.08] bg-white/[0.04] text-[#f5f0ea]/40 hover:text-[#f5f0ea]/70",
    disconnected: "border-white/[0.08] bg-white/[0.04] text-[#f5f0ea]/40 hover:text-[#f5f0ea]/70",
  };

  return (
    <Link href="/dashboard"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all shrink-0 ${styles[status]}`}>
      {status === "connecting" ? <Loader2 className="h-3 w-3 animate-spin" />
        : status === "connected" ? <span className="h-1.5 w-1.5 rounded-full bg-[#e8944a]" />
        : <WifiOff className="h-3 w-3" />}
      <span className="hidden sm:inline max-w-28 truncate">{label}</span>
    </Link>
  );
}
