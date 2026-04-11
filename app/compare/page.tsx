"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    const maxLen = Math.max(...selectedShots.map((s) => s.data.length));
    const step = Math.ceil(maxLen / 150);
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitCompare className="h-5 w-5" /> Shot Comparison
        </h1>
        <p className="text-sm text-muted-foreground">Select up to 5 shots to overlay their extraction curves</p>
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedShots.map((shot, i) => (
            <Badge
              key={shot.id}
              variant="outline"
              className="gap-1 pr-1"
              style={{ borderColor: COMPARE_COLORS[i], color: COMPARE_COLORS[i] }}
            >
              {shot.name.slice(0, 20)}
              <button onClick={() => toggle(shot.id)} className="ml-1 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Comparison chart */}
      {selected.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pressure Overlay</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="t" tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip labelFormatter={(l) => `${(Number(l) / 1000).toFixed(1)}s`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
          </CardContent>
        </Card>
      )}

      {/* Stats comparison table */}
      {selected.length > 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Stats Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4">Shot</th>
                    <th className="text-right py-2 px-3">Duration</th>
                    <th className="text-right py-2 px-3">Weight</th>
                    <th className="text-right py-2 px-3">Max P</th>
                    <th className="text-right py-2 px-3">Max Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShots.map((shot, i) => {
                    const stats = computeShotStats(shot.data);
                    return (
                      <tr key={shot.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                          {shot.name.slice(0, 22)}
                        </td>
                        <td className="text-right px-3 font-mono">{stats.durationSec}s</td>
                        <td className="text-right px-3 font-mono">{stats.finalWeight.toFixed(1)}g</td>
                        <td className="text-right px-3 font-mono">{stats.maxPressure.toFixed(1)}</td>
                        <td className="text-right px-3 font-mono">{stats.maxFlow.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shot list to pick from */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          Select shots {selected.length > 0 && `(${selected.length}/5 selected)`}
        </h2>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {allShots.map((shot, i) => {
            const isSelected = selected.includes(shot.id);
            const colorIdx = selected.indexOf(shot.id);
            const stats = computeShotStats(shot.data);
            return (
              <button
                key={shot.id}
                onClick={() => toggle(shot.id)}
                disabled={!isSelected && selected.length >= 5}
                className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm flex items-center gap-3 transition-all ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/50 disabled:opacity-40"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border-2"
                  style={isSelected ? { backgroundColor: COMPARE_COLORS[colorIdx], borderColor: COMPARE_COLORS[colorIdx] } : { borderColor: "currentColor" }}
                />
                <span className="flex-1 truncate">{shot.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(shot.time * 1000), "MMM d")} · {stats.durationSec}s · {stats.finalWeight.toFixed(0)}g
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
