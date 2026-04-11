"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShotChart } from "@/components/charts/shot-chart";
import { ProfileCurvePreview } from "@/components/charts/profile-curve-preview";
import { ArrowLeft, Loader2, GitFork, Share2, Code, Thermometer, Weight, Clock, Droplets, Gauge } from "lucide-react";
import { listProfiles, getHistory, computeShotStats } from "@/lib/machine-api";
import type { Profile, ShotEntry } from "@/lib/types";
import { format } from "date-fns";

function ShareContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bestShot, setBestShot] = useState<ShotEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    Promise.all([listProfiles(), getHistory()])
      .then(([profiles, shots]) => {
        const p = profiles.find((p) => p.id === id) ?? null;
        setProfile(p);
        if (p) {
          const related = shots.filter((s) => s.profile?.id === id || s.name === p.name);
          // Pick best shot (most data points = most complete)
          const best = related.sort((a, b) => b.data.length - a.data.length)[0] ?? null;
          setBestShot(best);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function copyJson() {
    if (!profile) return;
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">Profile not found</div>;

  const accent = profile.display?.accentColor ?? "#f97316";
  const stats = bestShot ? computeShotStats(bestShot.data) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link href={`/profile?id=${profile.id}`} className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Profile
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Share Profile</h1>
        <p className="text-sm text-muted-foreground">This is the geeky shareable card — everything about this shot</p>
      </div>

      {/* ─── THE SHARE CARD ─────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden shadow-lg">
        {/* Accent header bar */}
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}80)` }} />

        <div className="p-6 space-y-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <Badge variant="outline" className="text-xs font-mono">OEPF</Badge>
              </div>
              <p className="text-sm text-muted-foreground">by {profile.author}</p>
              {profile.display?.shortDescription && (
                <p className="text-sm text-muted-foreground italic">&ldquo;{profile.display.shortDescription}&rdquo;</p>
              )}
            </div>
            <ProfileCurvePreview profile={profile} width={120} height={55} accentColor={accent} />
          </div>

          {/* Key specs */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-xs rounded-full border border-border px-2.5 py-1">
              <Thermometer className="h-3 w-3" /> {profile.temperature}°C
            </span>
            <span className="flex items-center gap-1 text-xs rounded-full border border-border px-2.5 py-1">
              <Weight className="h-3 w-3" /> {profile.final_weight}g
            </span>
            <span className="text-xs rounded-full border border-border px-2.5 py-1">
              {profile.stages.length} stages
            </span>
            {profile.variables.map((v) => (
              <span key={v.key} className="text-xs rounded-full border border-border px-2.5 py-1 font-mono">
                {v.name}: {v.value}{v.type === "pressure" ? " bar" : v.type === "weight" ? "g" : ""}
              </span>
            ))}
          </div>

          {/* Stages */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stages</p>
            <div className="flex flex-wrap gap-2">
              {profile.stages.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: accent }}
                  >{i + 1}</span>
                  <span className="font-medium">{stage.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{stage.type}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Actual shot data */}
          {bestShot && stats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actual Shot Data
                </p>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(bestShot.time * 1000), "MMM d, yyyy")}
                </span>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Clock, v: `${stats.durationSec}s`, l: "Duration" },
                  { icon: Weight, v: `${stats.finalWeight.toFixed(1)}g`, l: "Weight" },
                  { icon: Gauge, v: `${stats.maxPressure.toFixed(1)}b`, l: "Max P" },
                  { icon: Droplets, v: `${stats.maxFlow.toFixed(1)}`, l: "Max Flow" },
                ].map(({ icon: Icon, v, l }) => (
                  <div key={l} className="rounded-lg bg-muted/40 px-2 py-2 text-center">
                    <Icon className="h-3 w-3 mx-auto text-muted-foreground mb-0.5" />
                    <p className="text-sm font-bold">{v}</p>
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>

              {/* Shot chart */}
              <div className="rounded-lg bg-muted/20 border border-border/50 p-3">
                <ShotChart frames={bestShot.data} height={200} />
              </div>
            </div>
          )}

          {/* Lineage */}
          {profile.previous_authors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <GitFork className="h-3 w-3" /> Lineage
              </p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {profile.previous_authors.map((a, i) => (
                  <span key={a.author_id} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="bg-muted rounded-full px-2 py-0.5">{a.name}</span>
                  </span>
                ))}
                <span className="text-muted-foreground">→</span>
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{profile.author}</span>
              </div>
            </div>
          )}

          {/* mbrista badge */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Shared via mbrista</span>
            <span className="text-xs text-muted-foreground font-mono">{profile.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={copyJson} variant="outline" className="gap-2">
          <Code className="h-4 w-4" />
          {copied ? "Copied!" : "Copy Profile JSON"}
        </Button>
        <Button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          variant="outline"
          className="gap-2"
        >
          <Share2 className="h-4 w-4" /> Copy Link
        </Button>
        <a href="https://metprofiles.link" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" }) + " gap-2"}>
          Submit to metprofiles.link ↗
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 To share on the Discord, copy the profile JSON and post it in the profiles channel, or submit to{" "}
        <a href="https://metprofiles.link" className="underline" target="_blank" rel="noopener noreferrer">metprofiles.link</a>.
      </p>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ShareContent />
    </Suspense>
  );
}
