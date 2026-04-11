"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileCurvePreview } from "@/components/charts/profile-curve-preview";
import { Loader2, ArrowLeft, Thermometer, Weight, User, GitFork, Code } from "lucide-react";
import { listProfiles, getHistory, loadProfileById } from "@/lib/machine-api";
import { computeShotStats } from "@/lib/machine-api";
import { ShotChart } from "@/components/charts/shot-chart";
import type { Profile, ShotEntry } from "@/lib/types";

function ProfileDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [relatedShots, setRelatedShots] = useState<ShotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [loadMsg, setLoadMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    Promise.all([listProfiles(), getHistory()])
      .then(([profiles, shots]) => {
        const p = profiles.find((p) => p.id === id) ?? null;
        setProfile(p);
        if (p) {
          setRelatedShots(shots.filter((s) => s.profile?.id === id || s.name === p.name).slice(0, 3));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLoad() {
    if (!profile) return;
    try {
      await loadProfileById(profile.id);
      setLoadMsg("✓ Profile loaded to machine!");
      setTimeout(() => setLoadMsg(null), 3000);
    } catch {
      setLoadMsg("Failed to load profile");
      setTimeout(() => setLoadMsg(null), 3000);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">Profile not found</div>;

  const accent = profile.display?.accentColor ?? "#f97316";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/profiles" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Profiles
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="h-3.5 w-3.5" /> {profile.author}
          </p>
          {profile.display?.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              {profile.display.description}
            </p>
          )}
        </div>
        {/* Big curve preview */}
        <div className="shrink-0 hidden sm:block">
          <ProfileCurvePreview profile={profile} width={160} height={70} accentColor={accent} />
        </div>
      </div>

      {/* Key specs */}
      <div className="flex flex-wrap gap-3">
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm">
          <Thermometer className="h-3.5 w-3.5" /> {profile.temperature}°C
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm">
          <Weight className="h-3.5 w-3.5" /> {profile.final_weight}g target
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm">
          {profile.stages.length} stages
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleLoad} className="gap-2">
          ↳ Load to Machine
        </Button>
        <Link href={`/share?id=${profile.id}`} className={buttonVariants({ variant: "outline" }) + " gap-2"}>
            <GitFork className="h-4 w-4" /> Share This Profile
          </Link>
        {loadMsg && <span className="text-sm text-emerald-600 self-center">{loadMsg}</span>}
      </div>

      {/* Stages breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Stages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.stages.map((stage, i) => (
            <div key={stage.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: accent }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{stage.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">{stage.type}</Badge>
                  <Badge variant="secondary" className="text-xs">over {stage.dynamics.over}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stage.dynamics.points.length} point{stage.dynamics.points.length !== 1 ? "s" : ""} ·{" "}
                  {stage.dynamics.interpolation} interpolation
                </div>
                {stage.exit_triggers.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Exits on:{" "}
                    {stage.exit_triggers.map((t) => `${t.type} ${t.comparison ?? ""} ${t.value}`).join(" or ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Variables */}
      {profile.variables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {profile.variables.map((v) => (
                <div key={v.key} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="text-muted-foreground text-xs">{v.name}</p>
                  <p className="font-medium font-mono">{v.value} <span className="text-xs text-muted-foreground">{v.type}</span></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Author lineage */}
      {profile.previous_authors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitFork className="h-4 w-4" /> Lineage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {profile.previous_authors.map((a, i) => (
                <span key={a.author_id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <span className="rounded-full bg-muted px-2 py-0.5">{a.name}</span>
                </span>
              ))}
              <span className="text-muted-foreground">→</span>
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{profile.author}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related shots */}
      {relatedShots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Shots with this profile</h2>
          <div className="space-y-4">
            {relatedShots.map((shot) => {
              const stats = computeShotStats(shot.data);
              return (
                <Card key={shot.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{new Date(shot.time * 1000).toLocaleString()}</span>
                      <span className="text-muted-foreground">{stats.durationSec}s · {stats.finalWeight.toFixed(1)}g</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ShotChart frames={shot.data} height={160} showTemp={false} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw JSON */}
      <div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Code className="h-3 w-3" />
          {showRaw ? "Hide" : "View"} Raw Profile JSON (OEPF)
        </button>
        {showRaw && (
          <pre className="mt-2 text-xs bg-muted rounded-lg p-4 overflow-auto max-h-96 font-mono">
            {JSON.stringify(profile, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ProfileDetailContent />
    </Suspense>
  );
}
