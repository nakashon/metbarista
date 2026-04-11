"use client";

import { useEffect, useState } from "react";
import { GitCompare, Loader2, X } from "lucide-react";
import { getHistory, computeShotStats, downsampleFrames } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import type { ShotEntry } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const COMPARE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ec4899"];

export default function ComparePage() {
  const [allShots, setAllShots] = useState<ShotEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSavedIp()) { setLoading(false); return; }
    getHistory().then(setAllShots).finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  }

  const selectedShots = allShots.filter((s) => selected.includes(s.id));

  // Build merged chart data aligned by time offset
  const chartData = (() => {
    if (!selectedShots.length) return [];
    const rows: Record<string, number | string>[] = [];
    const sampled = selectedShots.map((s) => downsampleFrames(s.data, 150));
    const maxFrames = Math.max(...sampled.map((d) => d.length));

    for (let i = 0; i < maxFrames; i++) {
      const row: Record<string, number | string> = {};
      let t = 0;
      for (let si = 0; si < sampled.length; si++) {
        const frame = sampled[si][i];
        if (frame) {
          const t0 = sampled[si][0]?.time ?? 0;
          t = frame.time - t0;
          row[`p_${si}`] = frame.shot.pressure;
          row[`f_${si}`] = frame.shot.flow;
        }
      }
      row.t = t;
      rows.push(row);
    }
    return rows;
  })();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0c0a09]">
      <Loader2 className="h-6 w-6 animate-spin text-[#e8944a]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0ea] flex items-center gap-2.5">
            <GitCompare className="h-5 w-5 text-[#e8944a]" /> Shot Comparison
          </h1>
          <p className="text-sm text-[#f5f0ea]/40 mt-1">Select up to 5 shots to overlay their extraction curves</p>
        </div>

        {/* Selected badges */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedShots.map((shot, i) => (
              <span
                key={shot.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: `${COMPARE_COLORS[i]}40`, color: COMPARE_COLORS[i], backgroundColor: `${COMPARE_COLORS[i]}10` }}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                {shot.name.slice(0, 20)}
                <button onClick={() => toggle(shot.id)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Comparison chart */}
        {selected.length > 1 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
            <p className="text-sm font-semibold text-[#f5f0ea] mb-4">Pressure Overlay</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`}
                  tick={{ fontSize: 11, fill: "rgba(245,240,234,0.3)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 12]}
                  tick={{ fontSize: 11, fill: "rgba(245,240,234,0.3)" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  labelFormatter={(l) => `${(Number(l) / 1000).toFixed(1)}s`}
                  contentStyle={{ backgroundColor: "#161210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: 12 }}
                  labelStyle={{ color: "rgba(245,240,234,0.6)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(245,240,234,0.4)" }} />
                {selectedShots.map((shot, i) => (
                  <Line
                    key={shot.id}
                    type="monotone"
                    dataKey={`p_${i}`}
                    name={`${shot.name.slice(0, 18)} (P)`}
                    stroke={COMPARE_COLORS[i]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stats comparison table */}
        {selected.length > 1 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
            <p className="text-sm font-semibold text-[#f5f0ea] mb-4">Stats Comparison</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[#f5f0ea]/30 text-xs">
                    <th className="text-left py-2 pr-4 font-medium">Shot</th>
                    <th className="text-right py-2 px-3 font-medium">Duration</th>
                    <th className="text-right py-2 px-3 font-medium">Weight</th>
                    <th className="text-right py-2 px-3 font-medium">Max P</th>
                    <th className="text-right py-2 px-3 font-medium">Max Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShots.map((shot, i) => {
                    const stats = computeShotStats(shot.data);
                    return (
                      <tr key={shot.id} className="border-b border-white/[0.05] last:border-0">
                        <td className="py-2.5 pr-4 text-[#f5f0ea]/70">
                          <span className="inline-block w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                          {shot.name.slice(0, 22)}
                        </td>
                        <td className="text-right px-3 font-mono text-[#f5f0ea]/60">{stats.durationSec}s</td>
                        <td className="text-right px-3 font-mono text-[#f5f0ea]/60">{stats.finalWeight.toFixed(1)}g</td>
                        <td className="text-right px-3 font-mono text-[#f5f0ea]/60">{stats.maxPressure.toFixed(1)}</td>
                        <td className="text-right px-3 font-mono text-[#f5f0ea]/60">{stats.maxFlow.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shot selector */}
        <div>
          <h2 className="text-sm font-semibold text-[#f5f0ea]/60 mb-3">
            Select shots
            {selected.length > 0 && (
              <span className="ml-2 text-[#f5f0ea]/30 font-mono">{selected.length}/5</span>
            )}
          </h2>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {allShots.map((shot) => {
              const isSelected = selected.includes(shot.id);
              const colorIdx = selected.indexOf(shot.id);
              const stats = computeShotStats(shot.data);
              return (
                <button
                  key={shot.id}
                  onClick={() => toggle(shot.id)}
                  disabled={!isSelected && selected.length >= 5}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm flex items-center gap-3 transition-all disabled:opacity-30 ${
                    isSelected
                      ? "border-[#e8944a]/20 bg-[#e8944a]/5 text-[#f5f0ea]"
                      : "border-white/[0.05] bg-[#161210] text-[#f5f0ea]/60 hover:border-white/[0.10] hover:bg-[#1e1b16]"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border-2 transition-all"
                    style={
                      isSelected
                        ? { backgroundColor: COMPARE_COLORS[colorIdx], borderColor: COMPARE_COLORS[colorIdx] }
                        : { borderColor: "rgba(245,240,234,0.15)", backgroundColor: "transparent" }
                    }
                  />
                  <span className="flex-1 truncate">{shot.name}</span>
                  <span className="text-xs font-mono text-[#f5f0ea]/25 shrink-0">
                    {format(new Date(shot.time * 1000), "MMM d")} · {stats.durationSec}s · {stats.finalWeight.toFixed(0)}g
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
