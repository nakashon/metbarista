"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Loader2, Wifi, WifiOff } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { connectSocket, disconnectSocket } from "@/lib/machine-socket";
import { getSavedIp } from "@/lib/connection-store";
import type { LiveStatus } from "@/lib/types";

interface LivePoint {
  t: number;
  pressure: number | null;
  flow: number | null;
  weight: number | null;
}

export default function LivePage() {
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
        setPhase(s.state ?? "idle");

        // Only record data during active shot
        const isActive = s.state && !["idle", "retracting", "heating"].includes(s.state.toLowerCase());
        if (isActive && s.shot) {
          if (!startRef.current) startRef.current = Date.now();
          const t = Date.now() - startRef.current;
          setData((prev) => [
            ...prev.slice(-300),
            {
              t,
              pressure: s.shot?.pressure ?? null,
              flow: s.shot?.flow ?? null,
              weight: s.shot?.weight != null && s.shot.weight > 0 ? s.shot.weight : null,
            },
          ]);
        } else if (s.state?.toLowerCase() === "idle") {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" /> Live Monitor
          </h1>
          <p className="text-sm text-muted-foreground">Real-time extraction telemetry via Socket.IO</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-1">
              <Wifi className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <WifiOff className="h-3 w-3" /> {ip ? "Connecting…" : "No machine"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={clearData}>Clear</Button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Gauge label="Phase" value={phase} highlight />
          <Gauge label="Pressure" value={`${status.shot?.pressure?.toFixed(2) ?? "—"} bar`} />
          <Gauge label="Flow" value={`${status.shot?.flow?.toFixed(2) ?? "—"} ml/s`} />
          <Gauge label="Weight" value={`${status.shot?.weight != null && status.shot.weight > 0 ? status.shot.weight.toFixed(1) : "—"} g`} />
        </div>
      )}

      {/* Live chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Live Chart
            {data.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {data.length} points
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              {connected ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Waiting for shot to start…</p>
                </>
              ) : (
                <>
                  <WifiOff className="h-6 w-6" />
                  <p className="text-sm">{ip ? "Connecting to machine…" : "Connect a machine first"}</p>
                </>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="t" tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" domain={[0, 12]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <YAxis yAxisId="right" orientation="right" domain={[0, "auto"]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} unit="g" />
                <Tooltip formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} labelFormatter={(l) => `${(Number(l) / 1000).toFixed(1)}s`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="pressure" name="Pressure (bar)" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="left" type="monotone" dataKey="flow" name="Flow (ml/s)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (g)" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Gauge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-base font-bold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
