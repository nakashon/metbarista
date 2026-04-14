"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Loader2, WifiOff, Thermometer, Weight, Droplets } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { connectSocket, disconnectSocket } from "@/lib/machine-socket";
import { getSavedIp, useRequireConnection } from "@/lib/connection-store";
import type { LiveStatus } from "@/lib/types";

interface LivePoint {
  t: number;
  pressure: number | null;
  flow: number | null;
  weight: number | null;
}

export default function LivePage() {
  useRequireConnection();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [data, setData] = useState<LivePoint[]>([]);
  const [phase, setPhase] = useState<string>("idle");
  const startRef = useRef<number | null>(null);

  const ip = getSavedIp();

  useEffect(() => {
    if (!ip) return;

    connectSocket({
      connect: () => setConnected(true),
      disconnect: () => { setConnected(false); setPhase("idle"); },
      status: (s) => {
        setStatus(s);
        setPhase(s.name ?? s.state ?? "idle");

        // Record data whenever extracting (use sensors — machine doesn't put data in s.shot)
        if (s.extracting) {
          if (!startRef.current) startRef.current = Date.now();
          const t = Date.now() - startRef.current;
          setData((prev) => [
            ...prev.slice(-300),
            {
              t,
              pressure: s.sensors?.p ?? null,
              flow: s.sensors?.f ?? null,
              weight: s.sensors?.w != null && s.sensors.w > 0 ? s.sensors.w : null,
            },
          ]);
        } else if (s.name === "idle") {
          startRef.current = null;
        }
      },
    });

    return () => disconnectSocket();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ip]);

  function clearData() {
    setData([]);
    startRef.current = null;
  }

  const phaseColor =
    phase === "idle" ? "text-[#f5f0ea]/25" :
    phase?.toLowerCase() === "retracting" ? "text-blue-400" :
    "text-[#e8944a]";

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radio className="h-5 w-5 text-[#e8944a]" />
              {connected && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f5f0ea]">Live Monitor</h1>
              <p className="text-xs text-[#f5f0ea]/40">Real-time extraction telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs text-[#4ade80]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-[#f5f0ea]/35">
                <WifiOff className="h-3 w-3" />
                {ip ? "Connecting…" : "No machine"}
              </span>
            )}
            <button
              onClick={clearData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.10] bg-transparent px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:bg-white/[0.05] hover:text-[#f5f0ea] transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Always-on sensor tiles: state + temp + weight + pressure */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">State</span>
              <span className={`text-2xl font-bold font-mono capitalize ${phaseColor}`}>
                {status?.name ?? phase}
              </span>
              {status?.loaded_profile && (
                <span className="text-[10px] text-[#f5f0ea]/30 truncate mt-0.5">{status.loaded_profile}</span>
              )}
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#e8944a]/60 uppercase tracking-wider flex items-center gap-1"><Thermometer className="h-3 w-3" />Temp</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.sensors?.t != null ? status.sensors.t.toFixed(1) : "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> °C</span>
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#60a5fa]/60 uppercase tracking-wider flex items-center gap-1"><Weight className="h-3 w-3" />Weight</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.sensors?.w != null ? status.sensors.w.toFixed(1) : "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> g</span>
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#22d3ee]/60 uppercase tracking-wider flex items-center gap-1"><Droplets className="h-3 w-3" />Pressure</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.sensors?.p != null ? status.sensors.p.toFixed(2) : "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> bar</span>
              </span>
            </div>
          </div>

        {/* Shot-specific status grid (during extraction) */}
        {status?.shot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Phase</span>
              <span className={`text-2xl font-bold font-mono capitalize ${phaseColor}`}>{phase}</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Pressure</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.shot?.pressure?.toFixed(2) ?? "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> bar</span>
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Flow</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.shot?.flow?.toFixed(2) ?? "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> ml/s</span>
              </span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Weight</span>
              <span className="text-2xl font-bold font-mono text-[#f5f0ea]">
                {status?.shot?.weight != null && status.shot!.weight > 0
                  ? status.shot!.weight.toFixed(1)
                  : "—"}
                <span className="text-sm font-normal text-[#f5f0ea]/35"> g</span>
              </span>
            </div>
          </div>
        )}

        {/* Live chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
          <div className="flex items-center gap-2 mb-5">
            <p className="text-sm font-semibold text-[#f5f0ea]">Live Chart</p>
            {data.length > 0 && (
              <span className="text-xs text-[#f5f0ea]/35">{data.length} pts</span>
            )}
          </div>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-3">
              {connected ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
                  <p className="text-sm text-[#f5f0ea]/40">Waiting for shot to start…</p>
                </>
              ) : (
                <>
                  <WifiOff className="h-6 w-6 text-[#f5f0ea]/25" />
                  <p className="text-sm text-[#f5f0ea]/40">
                    {ip ? "Connecting to machine…" : "Connect a machine first"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`}
                  tick={{ fontSize: 11, fill: "#f5f0ea", fillOpacity: 0.3 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  domain={[0, 12]}
                  tick={{ fontSize: 11, fill: "#f5f0ea", fillOpacity: 0.3 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, "auto"]}
                  tick={{ fontSize: 11, fill: "#f5f0ea", fillOpacity: 0.3 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  unit="g"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161210",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    color: "#f5f0ea",
                    fontSize: 12,
                  }}
                  formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)}
                  labelFormatter={(l) => `${(Number(l) / 1000).toFixed(1)}s`}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "rgba(245,240,234,0.5)" }} />
                <Line yAxisId="left" type="monotone" dataKey="pressure" name="Pressure (bar)" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="left" type="monotone" dataKey="flow" name="Flow (ml/s)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (g)" stroke="#e8944a" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
