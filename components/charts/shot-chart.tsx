"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { useMemo } from "react";
import type { ShotFrame } from "@/lib/types";
import { downsampleFrames } from "@/lib/machine-api";

interface ShotChartProps {
  frames: ShotFrame[];
  height?: number;
  showPressure?: boolean;
  showFlow?: boolean;
  showWeight?: boolean;
  showTemp?: boolean;
  /** Optional override colour (for comparison mode) */
  colorOverride?: string;
  /** Label suffix for comparison overlays */
  labelSuffix?: string;
}

interface ChartRow {
  t: number;
  pressure?: number;
  flow?: number;
  weight?: number;
  temp?: number;
  status: string;
}

const PRESSURE_COLOR = "var(--shot-pressure, #3b82f6)";
const FLOW_COLOR = "var(--shot-flow, #06b6d4)";
const WEIGHT_COLOR = "var(--shot-weight, #f97316)";
const TEMP_COLOR = "var(--shot-temp, #ef4444)";

function formatTime(ms: number) {
  const s = ms / 1000;
  return `${s.toFixed(0)}s`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg p-3 text-xs space-y-1">
      <p className="font-medium text-muted-foreground mb-1">{formatTime(label)}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry: any) =>
          entry.value != null && (
            <p key={entry.name} style={{ color: entry.color }} className="flex gap-2">
              <span className="font-medium">{entry.name}</span>
              <span>{typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}</span>
            </p>
          )
      )}
    </div>
  );
}

export function ShotChart({
  frames,
  height = 320,
  showPressure = true,
  showFlow = true,
  showWeight = true,
  showTemp = false,
  labelSuffix = "",
}: ShotChartProps) {
  const data = useMemo<ChartRow[]>(() => {
    const sampled = downsampleFrames(frames, 200);
    const t0 = sampled[0]?.time ?? 0;
    return sampled.map((f) => ({
      t: f.time - t0,
      pressure: showPressure ? f.shot.pressure : undefined,
      flow: showFlow ? f.shot.flow : undefined,
      weight: showWeight && f.shot.weight > 0 ? f.shot.weight : undefined,
      temp: showTemp ? f.sensors.bar_mid_up : undefined,
      status: f.status,
    }));
  }, [frames, showPressure, showFlow, showWeight, showTemp]);

  // Detect phase changes for reference lines
  const phaseChanges = useMemo(() => {
    const changes: { t: number; label: string }[] = [];
    let lastStatus = "";
    for (const row of data) {
      if (row.status !== lastStatus && lastStatus !== "") {
        changes.push({ t: row.t, label: row.status });
      }
      lastStatus = row.status;
    }
    return changes;
  }, [data]);

  if (!frames.length) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        No shot data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />

        <XAxis
          dataKey="t"
          tickFormatter={formatTime}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Time", position: "insideBottomRight", offset: -4, fontSize: 10 }}
        />

        {/* Left axis: pressure + flow (0-12 bar / ml/s) */}
        <YAxis
          yAxisId="left"
          domain={[0, 12]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />

        {/* Right axis: weight (g) */}
        {showWeight && (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, "auto"]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
            unit="g"
          />
        )}

        {/* Right axis: temp (°C) */}
        {showTemp && (
          <YAxis
            yAxisId="temp"
            orientation="right"
            domain={[60, 110]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
            unit="°"
          />
        )}

        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {/* Phase change markers */}
        {phaseChanges.map((pc) => (
          <ReferenceLine
            key={pc.t}
            x={pc.t}
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 2"
            strokeOpacity={0.4}
          />
        ))}

        {showPressure && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pressure"
            name={`Pressure${labelSuffix} (bar)`}
            stroke={PRESSURE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        )}

        {showFlow && (
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="flow"
            name={`Flow${labelSuffix} (ml/s)`}
            stroke={FLOW_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        )}

        {showWeight && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="weight"
            name={`Weight${labelSuffix} (g)`}
            stroke={WEIGHT_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        )}

        {showTemp && (
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temp"
            name={`Temp${labelSuffix} (°C)`}
            stroke={TEMP_COLOR}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
