"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSavedIp } from "@/lib/connection-store";
import { testConnection } from "@/lib/machine-api";
import type { ConnectionStatus } from "@/lib/types";

export function ConnectionDot() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [machineName, setMachineName] = useState<string>("");

  useEffect(() => {
    const ip = getSavedIp();
    if (!ip) return;

    setStatus("connecting");
    testConnection(ip)
      .then((info) => {
        setMachineName(info.name);
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, []);

  const label =
    status === "connected"
      ? machineName || "Connected"
      : status === "connecting"
      ? "Connecting…"
      : status === "error"
      ? "Connection error"
      : "No machine";

  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors shrink-0",
        status === "connected"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : status === "connecting"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : status === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {status === "connecting" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "connected" ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span className="hidden sm:inline max-w-32 truncate">{label}</span>
    </Link>
  );
}
