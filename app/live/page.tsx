"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Radio, Loader2, WifiOff, X, ChevronRight, ArrowLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { connectSocket, disconnectSocket } from "@/lib/machine-socket";
import { getSavedIp, useRequireConnection } from "@/lib/connection-store";
import { ShotNoteEditor } from "@/components/shot-note-editor";
import type { LiveStatus } from "@/lib/types";

// ── Phase metadata ────────────────────────────────────────────────────────────

interface PhaseInfo { label: string; color: string; pulse: boolean }

const PHASE_MAP: Record<string, PhaseInfo> = {
  idle:       { label: "Idle",       color: "text-[#f5f0ea]/40", pulse: false },
  preheating: { label: "Preheating", color: "text-orange-400",   pulse: true  },
  heating:    { label: "Preheating", color: "text-orange-400",   pulse: true  },
  preparing:  { label: "Preparing",  color: "text-yellow-400",   pulse: false },
  ready:      { label: "Ready",      color: "text-green-400",    pulse: false },
  extracting: { label: "Brewing",    color: "text-blue-400",     pulse: true  },
  brewing:    { label: "Brewing",    color: "text-blue-400",     pulse: true  },
  drawdown:   { label: "Drawdown",   color: "text-cyan-400",     pulse: false },
  purging:    { label: "Purging",    color: "text-purple-400",   pulse: false },
  done:       { label: "Done",       color: "text-green-400",    pulse: false },
};

const TIMELINE_STEPS = ["Idle", "Preheating", "Ready", "Brewing", "Drawdown", "Purging", "Done"];

function getPhaseInfo(name: string): PhaseInfo {
  return PHASE_MAP[name.toLowerCase()] ?? { label: name, color: "text-[#e8944a]", pulse: false };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LivePoint {
  t: number;
  pressure: number | null;
  flow: number | null;
  weight: number | null;
}

interface ShotSummary {
  durationSec: number;
  peakPressure: number;
  avgFlow: number;
  finalWeight: number;
  profile: string;
  timestamp: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LivePage() {
  useRequireConnection();
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [data, setData] = useState<LivePoint[]>([]);
  const [phase, setPhase] = useState<string>("idle");
  const startRef = useRef<number | null>(null);
  const shotStartTimestampRef = useRef<number | null>(null);
  const liveDataRef = useRef<LivePoint[]>([]);
  const wasExtractingRef = useRef(false);
  const [shotSummary, setShotSummary] = useState<ShotSummary | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [summaryDismissed, setSummaryDismissed] = useState(false);

  const ip = getSavedIp();

  useEffect(() => {
    if (!ip) return;

    connectSocket({
      connect: () => setConnected(true),
      disconnect: () => { setConnected(false); setPhase("idle"); },
      status: (s) => {
        setStatus(s);
        setPhase(s.name ?? s.state ?? "idle");

        if (s.extracting) {
          if (!startRef.current) {
            // New shot starting — reset accumulators
            startRef.current = Date.now();
            shotStartTimestampRef.current = Math.floor(Date.now() / 1000);
            liveDataRef.current = [];
            setShotSummary(null);
            setSummaryDismissed(false);
            setShowNoteEditor(false);
          }
          wasExtractingRef.current = true;
          const t = Date.now() - startRef.current;
          const point: LivePoint = {
            t,
            pressure: s.sensors?.p ?? null,
            flow: s.sensors?.f ?? null,
            weight: s.sensors?.w != null && s.sensors.w > 0 ? s.sensors.w : null,
          };
          liveDataRef.current = [...liveDataRef.current.slice(-300), point];
          setData((prev) => [...prev.slice(-300), point]);
        } else {
          // Detect end of extraction
          if (wasExtractingRef.current) {
            const pts = liveDataRef.current;
            if (pts.length > 0) {
              const durationSec = Math.round(pts[pts.length - 1].t / 1000);
              const pressures = pts.map((p) => p.pressure).filter((p): p is number => p != null);
              const flows = pts.map((p) => p.flow).filter((f): f is number => f != null);
              const weights = pts.map((p) => p.weight).filter((w): w is number => w != null);
              setShotSummary({
                durationSec,
                peakPressure: pressures.length ? Math.max(...pressures) : 0,
                avgFlow: flows.length ? flows.reduce((a, b) => a + b, 0) / flows.length : 0,
                finalWeight: weights.length ? weights[weights.length - 1] : 0,
                profile: s.loaded_profile ?? "Unknown",
                timestamp: shotStartTimestampRef.current ?? Math.floor(Date.now() / 1000),
              });
              setSummaryDismissed(false);
            }
          }
          wasExtractingRef.current = false;
          if (s.name === "idle") {
            startRef.current = null;
          }
        }
      },
    });

    return () => disconnectSocket();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ip]);

  function clearData() {
    setData([]);
    startRef.current = null;
    liveDataRef.current = [];
  }

  const phaseInfo = getPhaseInfo(phase);
  const currentLabel = phaseInfo.label;

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-transparent px-3 py-1.5 text-sm font-medium text-[#f5f0ea]/50 hover:bg-white/[0.05] hover:text-[#f5f0ea] transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="relative">
              <Radio className="h-5 w-5 text-[#e8944a]" />
              {connected && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#f5f0ea]">Live Shot — Focus Mode</h1>
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

        {/* Shot-specific status grid (during extraction) */}
        {status?.shot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4 flex flex-col gap-1">
              <span className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">Phase</span>
              <span className={`text-2xl font-bold font-mono ${phaseInfo.color}`}>{phaseInfo.label}</span>
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

        {/* Phase timeline bar */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {TIMELINE_STEPS.map((step, i) => {
              const isActive = step === currentLabel;
              const isPast = TIMELINE_STEPS.indexOf(currentLabel) > i;
              return (
                <div key={step} className="flex items-center gap-1 shrink-0">
                  <div className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#e8944a]/20 text-[#e8944a] border border-[#e8944a]/30"
                      : isPast
                      ? "bg-white/[0.06] text-[#f5f0ea]/50 border border-white/[0.06]"
                      : "bg-transparent text-[#f5f0ea]/20 border border-transparent"
                  }`}>
                    {step}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <ChevronRight className={`h-3 w-3 shrink-0 ${isPast ? "text-[#f5f0ea]/30" : "text-[#f5f0ea]/10"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Last-shot summary banner */}
        {shotSummary && !summaryDismissed && !status?.extracting && (
          <div className="rounded-2xl border border-[#e8944a]/20 bg-[#161210] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#f5f0ea]">Last Shot Summary</p>
              <button
                onClick={() => setSummaryDismissed(true)}
                className="text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Duration",      value: `${shotSummary.durationSec}s` },
                { label: "Peak Pressure", value: `${shotSummary.peakPressure.toFixed(1)} bar` },
                { label: "Avg Flow",      value: `${shotSummary.avgFlow.toFixed(2)} ml/s` },
                { label: "Final Weight",  value: `${shotSummary.finalWeight.toFixed(1)} g` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0c0a09] p-3">
                  <p className="text-xs text-[#f5f0ea]/35 uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold font-mono text-[#f5f0ea] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            {shotSummary.profile && shotSummary.profile !== "Unknown" && (
              <p className="text-xs text-[#f5f0ea]/35">
                Profile: <span className="text-[#f5f0ea]/60">{shotSummary.profile}</span>
              </p>
            )}
            {!showNoteEditor ? (
              <button
                onClick={() => setShowNoteEditor(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.10] px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:bg-white/[0.05] hover:text-[#f5f0ea] transition-all"
              >
                Save note
              </button>
            ) : (
              <div className="border-t border-white/[0.06] pt-4">
                <ShotNoteEditor
                  timestamp={shotSummary.timestamp}
                  onSave={() => setShowNoteEditor(false)}
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
