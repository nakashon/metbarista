"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ConnectDialog } from "@/components/connect-dialog";
import {
  Coffee, Wifi, WifiOff, Loader2,
  Play, Square, Flame, Scale, Wind, RefreshCw, ArrowUp, LogOut,
  Thermometer, Droplets, Weight
} from "lucide-react";
import { getMachineInfo, getHistory, executeAction, listProfiles } from "@/lib/machine-api";
import { getSavedIp, clearIp, useRequireConnection, useIsHttps } from "@/lib/connection-store";
import { connectSocket, disconnectSocket, refreshNow } from "@/lib/machine-socket";
import type { MachineInfo, ShotEntry, Profile, LiveStatus } from "@/lib/types";
import type { ActionType } from "@/lib/types";

export default function DashboardPage() {
  useRequireConnection();
  const isHttps = useIsHttps();
  const [showConnect, setShowConnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [recentShots, setRecentShots] = useState<ShotEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [socketState, setSocketState] = useState<"connecting" | "connected" | "error">("connecting");
  const [socketError, setSocketError] = useState<string | null>(null);

  const ip = getSavedIp();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [info, shots, profs] = await Promise.all([
        getMachineInfo(),
        getHistory(),
        listProfiles(),
      ]);
      setMachine(info);
      setRecentShots(shots.slice(0, 5));
      setProfiles(profs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ip) load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live socket stats
  useEffect(() => {
    if (!ip) return;
    setSocketState("connecting");
    setSocketError(null);
    connectSocket({
      connect:    () => setSocketState("connected"),
      disconnect: () => setSocketState("connecting"),
      error:      (e) => { setSocketState("error"); setSocketError(e.message); },
      status:     (s) => { setLiveStatus(s); setSocketState("connected"); },
    }).catch((e) => { setSocketState("error"); setSocketError(String(e)); });
    return () => { disconnectSocket(); };
  }, [ip]);

  async function doAction(action: ActionType) {
    setActionLoading(action);
    try {
      await executeAction(action);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  if (!ip) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-4">
          <div className="h-16 w-16 rounded-2xl bg-[#e8944a]/10 flex items-center justify-center">
            <Coffee className="h-7 w-7 text-[#e8944a]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#f5f0ea]">No machine connected</h2>
            <p className="text-sm text-[#f5f0ea]/45 mt-1 max-w-sm">
              Connect to your Meticulous machine over your local network.
            </p>
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#e8944a] px-5 py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all"
          >
            <Coffee className="h-4 w-4" /> Connect Machine
          </button>
          <ConnectDialog
            open={showConnect}
            onConnected={() => { setShowConnect(false); load(); }}
            onCancel={() => setShowConnect(false)}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8944a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center px-4">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <WifiOff className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#f5f0ea]">Connection failed</h2>
            <p className="text-sm text-[#f5f0ea]/45 mt-1">{error}</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-transparent px-5 py-2.5 text-sm font-medium text-[#f5f0ea]/60 hover:bg-white/[0.05] hover:text-[#f5f0ea] transition-all"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const isPreheating = liveStatus?.name === "preheating";
  const isExtracting = liveStatus?.extracting;

  const ACTIONS: { action: ActionType; label: string; icon: React.ElementType; style: "primary" | "danger" | "outline" }[] = [
    { action: "preheat", label: isPreheating ? "Preheating…" : "Preheat", icon: Flame,   style: "outline" },
    { action: "tare",    label: "Tare Scale", icon: Scale,   style: "outline" },
    { action: "purge",   label: "Purge",      icon: Wind,    style: "outline" },
    { action: "raise",   label: "Raise",      icon: ArrowUp, style: "outline" },
    { action: "start",   label: isExtracting ? "Extracting…" : "Start Shot", icon: Play, style: "primary" },
    { action: "stop",    label: "Stop",       icon: Square,  style: "danger"  },
  ];

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      {isHttps && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between gap-4">
          <p className="text-xs text-amber-400/90">
            ⚠️ Live data requires HTTP — your browser is blocking local machine access on HTTPS.
          </p>
          <a
            href={typeof window !== "undefined" ? window.location.href.replace("https://", "http://") : "#"}
            className="shrink-0 text-xs font-semibold text-amber-400 underline underline-offset-2"
          >
            Switch to HTTP →
          </a>
        </div>
      )}
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#f5f0ea] truncate max-w-[220px] sm:max-w-none">{machine?.name ?? "Machine"}</h1>
              <p className="text-xs text-[#f5f0ea]/40">{ip}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.10] bg-transparent px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:bg-white/[0.05] hover:text-[#f5f0ea] transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => { clearIp(); window.location.href = "/"; }}
              title="Disconnect machine"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-transparent px-3 py-2 text-sm font-medium text-[#f5f0ea]/30 hover:bg-red-500/[0.08] hover:text-red-400 hover:border-red-500/20 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        </div>

        {/* Machine info + quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Machine info */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="h-4 w-4 text-[#4ade80]" />
              <span className="text-sm font-semibold text-[#f5f0ea]">{machine?.name}</span>
              <span className="ml-auto text-xs font-mono text-[#f5f0ea]/35 bg-white/[0.05] rounded-md px-2 py-0.5">
                {machine?.color}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Firmware" value={machine?.firmware ?? "—"} />
              <InfoRow label="Serial" value={machine?.serial ?? "—"} />
              <InfoRow label="Voltage" value={`${machine?.mainVoltage ?? "—"}V`} />
              <InfoRow label="Channel" value={machine?.image_build_channel ?? "—"} />
              <InfoRow label="Image" value={machine?.image_version?.slice(0, 14) ?? "—"} />
              <InfoRow label="Profiles" value={String(profiles.length)} />
            </div>
          </div>

          {/* Live stats */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 flex flex-col gap-3">
            {/* Header with connection status */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Live</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono rounded px-1.5 py-0.5 ${
                socketState === "connected" ? "text-[#4ade80]/70 bg-[#4ade80]/10" :
                socketState === "error"     ? "text-red-400/70 bg-red-400/10" :
                "text-[#f5f0ea]/25 bg-white/[0.04]"
              }`}>
                <span className={`h-1 w-1 rounded-full ${
                  socketState === "connected" ? "bg-[#4ade80] animate-pulse" :
                  socketState === "error"     ? "bg-red-400" :
                  "bg-current opacity-50 animate-pulse"
                }`} />
                {socketState === "connected" ? "live" : socketState === "error" ? "err" : "…"}
              </span>
            </div>

            {/* Error hint */}
            {socketState === "error" && socketError && (
              <p className="text-[10px] text-red-400/60 font-mono break-all">{socketError.slice(0, 80)}</p>
            )}

            {/* Machine state badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                liveStatus?.name === "idle"        ? "bg-white/[0.06] text-[#f5f0ea]/50" :
                liveStatus?.name === "preheating"  ? "bg-[#e8944a]/15 text-[#e8944a]" :
                liveStatus?.extracting             ? "bg-[#4ade80]/15 text-[#4ade80]" :
                liveStatus                         ? "bg-blue-500/15 text-blue-400" :
                "bg-white/[0.04] text-[#f5f0ea]/20"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  liveStatus?.extracting ? "bg-[#4ade80] animate-pulse" :
                  liveStatus?.name === "preheating" ? "bg-[#e8944a] animate-pulse" :
                  "bg-current opacity-60"
                }`} />
                {liveStatus?.name ?? (socketState === "error" ? "offline" : "connecting…")}
              </span>
              {liveStatus?.loaded_profile && (
                <span className="text-xs text-[#f5f0ea]/30 truncate">{liveStatus.loaded_profile}</span>
              )}
            </div>

            {/* Sensor readings */}
            <div className="grid grid-cols-3 gap-2">
              <StatTile icon={Thermometer} label="Temp" value={liveStatus?.sensors?.t != null ? `${liveStatus.sensors.t.toFixed(1)}°` : "—"} color="#e8944a" />
              <StatTile icon={Weight}      label="Weight" value={liveStatus?.sensors?.w != null ? `${liveStatus.sensors.w.toFixed(1)}g` : "—"} color="#60a5fa" />
              <StatTile icon={Droplets}    label="Pressure" value={liveStatus?.sensors?.p != null ? `${liveStatus.sensors.p.toFixed(1)}b` : "—"} color="#22d3ee" />
            </div>

            <div className="border-t border-white/[0.04] pt-2 flex items-center justify-between">
              <span className="text-xs text-[#f5f0ea]/25">Profiles on machine</span>
              <span className="text-sm font-bold font-mono text-[#f5f0ea]/60">{profiles.length}</span>
            </div>
          </div>
        </div>

        {/* Machine control */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
          <p className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider mb-4">Machine Control</p>
          {/* Secondary actions: 3-col on mobile, 5-col on desktop (all in one row) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {ACTIONS.filter(a => a.style !== "primary").map(({ action, label, icon: Icon, style }) => {
              const base = "flex flex-col items-center justify-center gap-2 rounded-xl py-4 text-xs font-semibold transition-all disabled:opacity-40 active:scale-95";
              const cls =
                style === "danger"
                  ? `${base} bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20`
                  : action === "preheat" && isPreheating
                  ? `${base} bg-[#e8944a]/15 text-[#e8944a] border border-[#e8944a]/30`
                  : `${base} border border-white/[0.08] text-[#f5f0ea]/55 hover:bg-white/[0.05] hover:text-[#f5f0ea]`;
              return (
                <button key={action} onClick={() => doAction(action)}
                  disabled={actionLoading !== null} className={cls}>
                  {actionLoading === action
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : action === "preheat" && isPreheating
                    ? <Flame className="h-4 w-4 animate-pulse" />
                    : <Icon className="h-4 w-4" />}
                  {label}
                </button>
              );
            })}
          </div>
          {/* Start Shot — full-width hero CTA */}
          {ACTIONS.filter(a => a.style === "primary").map(({ action, label, icon: Icon }) => (
            <button key={action} onClick={() => doAction(action)}
              disabled={actionLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#e8944a] py-4 text-sm font-bold text-[#0c0a09] hover:bg-[#f5a855] transition-all shadow-[0_4px_30px_rgba(232,148,74,0.25)] hover:shadow-[0_4px_40px_rgba(232,148,74,0.4)] active:scale-[0.99] disabled:opacity-40">
              {actionLoading === action
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Icon className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>

        {/* Recent shots */}
        {recentShots.length > 0 && (
          <div>
            <p className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider mb-3">Recent Shots</p>
            <div className="space-y-2">
              {recentShots.map((shot) => (
                <Link
                  href={`/shot?id=${shot.id}`}
                  key={shot.id}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#161210] px-4 py-3 hover:border-white/[0.10] hover:bg-[#1e1b16] transition-all group"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: shot.profile?.display?.accentColor ?? "#e8944a" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f5f0ea] truncate group-hover:text-[#e8944a] transition-colors">
                      {shot.name}
                    </p>
                    <p className="text-xs text-[#f5f0ea]/35 mt-0.5">
                      {format(new Date(shot.time * 1000), "MMM d · HH:mm")}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#f5f0ea]/25">#{shot.db_key}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono text-[#f5f0ea]/70 truncate">{value}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-[#0c0a09] border border-white/[0.04] px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3" style={{ color }} />
        <span className="text-[10px] text-[#f5f0ea]/30 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-base font-bold font-mono text-[#f5f0ea]">{value}</span>
    </div>
  );
}
