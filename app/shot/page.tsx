"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShotChart } from "@/components/charts/shot-chart";
import { Loader2, ArrowLeft, Clock, Weight, Gauge, Droplets, Thermometer, Layers } from "lucide-react";
import { getHistory, computeShotStats } from "@/lib/machine-api";
import type { ShotEntry } from "@/lib/types";

function ShotDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [shot, setShot] = useState<ShotEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemp, setShowTemp] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    getHistory()
      .then((shots) => setShot(shots.find((s) => s.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!shot) return <div className="text-center py-20 text-muted-foreground">Shot not found</div>;

  const stats = computeShotStats(shot.data);
  const date = new Date(shot.time * 1000);
  const accent = shot.profile?.display?.accentColor ?? "#6b7280";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/history" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="h-4 w-4 mr-1" /> History
      </Link>

      {/* Title */}
      <div className="flex items-start gap-3">
        <div className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: accent }} />
        <div>
          <h1 className="text-2xl font-bold">{shot.name}</h1>
          <p className="text-sm text-muted-foreground">
            {format(date, "MMMM d, yyyy · HH:mm")} · Shot #{shot.db_key}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Duration" value={`${stats.durationSec}s`} />
        <StatCard icon={Weight} label="Final Weight" value={`${stats.finalWeight.toFixed(1)}g`} />
        <StatCard icon={Gauge} label="Max Pressure" value={`${stats.maxPressure.toFixed(1)} bar`} />
        <StatCard icon={Droplets} label="Max Flow" value={`${stats.maxFlow.toFixed(1)} ml/s`} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Extraction Curve</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemp((v) => !v)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${showTemp ? "bg-red-500/10 border-red-500/30 text-red-600" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              <Thermometer className="h-3 w-3 inline mr-1" />Temp
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <ShotChart frames={shot.data} height={300} showTemp={showTemp} />
        </CardContent>
      </Card>

      {/* Profile used */}
      {shot.profile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" /> Profile Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{shot.profile.name}</p>
                <p className="text-sm text-muted-foreground">by {shot.profile.author}</p>
              </div>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>{shot.profile.temperature}°C</span>
                <span>·</span>
                <span>{shot.profile.final_weight}g target</span>
              </div>
            </div>
            {/* Stages */}
            <div className="space-y-1">
              {shot.profile.stages.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <Badge variant="secondary" className="text-xs capitalize">{stage.type}</Badge>
                  <span className="text-muted-foreground">{stage.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    over {stage.dynamics.over}
                  </span>
                </div>
              ))}
            </div>
            <Link href={`/profile?id=${shot.profile.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              View Full Profile →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON */}
      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {showRaw ? "▾" : "▸"} Raw shot data ({shot.data.length} frames)
        </button>
        {showRaw && (
          <pre className="mt-2 text-xs bg-muted rounded-lg p-4 overflow-auto max-h-64 font-mono">
            {JSON.stringify(shot.data.slice(0, 5), null, 2)}
            {"\n... and "}{shot.data.length - 5}{" more frames"}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-lg font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

export default function ShotPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ShotDetailContent />
    </Suspense>
  );
}
