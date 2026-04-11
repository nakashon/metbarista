"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProfileCurvePreview } from "@/components/charts/profile-curve-preview";
import { Loader2, ArrowLeft, Thermometer, Weight, User, GitFork, Code } from "lucide-react";
import { listProfiles, getHistory, loadProfileById, computeShotStats } from "@/lib/machine-api";
import { ShotChart } from "@/components/charts/shot-chart";
import type { Profile, ShotEntry } from "@/lib/types";

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  pressure: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa" },
  flow:     { bg: "rgba(34,211,238,0.12)", text: "#22d3ee" },
  power:    { bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
};

function ProfileDetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [relatedShots, setRelatedShots] = useState<ShotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [loadMsg, setLoadMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
      setLoadMsg({ type: "success", msg: "✓ Profile loaded to machine!" });
      setTimeout(() => setLoadMsg(null), 3000);
    } catch {
      setLoadMsg({ type: "error", msg: "Failed to load profile" });
      setTimeout(() => setLoadMsg(null), 3000);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#e8944a]" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
      <p className="text-[#f5f0ea]/40 text-sm">Profile not found</p>
    </div>
  );

  const accent = profile.display?.accentColor ?? "#e8944a";

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Back */}
        <Link
          href="/profiles"
          className="inline-flex items-center gap-1.5 text-sm text-[#f5f0ea]/40 hover:text-[#f5f0ea] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Profiles
        </Link>

        {/* Profile header card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] overflow-hidden">
          <div className="h-[3px]" style={{ backgroundColor: accent }} />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <h1 className="text-2xl font-bold text-[#f5f0ea] leading-tight">{profile.name}</h1>
                <p className="text-sm text-[#f5f0ea]/40 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />{profile.author}
                </p>
                {profile.display?.description && (
                  <p className="text-sm text-[#f5f0ea]/50 mt-2 max-w-2xl leading-relaxed">
                    {profile.display.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 hidden sm:block opacity-80">
                <ProfileCurvePreview profile={profile} width={160} height={70} accentColor={accent} />
              </div>
            </div>

            {/* Spec pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-[#f5f0ea]/60">
                <Thermometer className="h-3 w-3" />{profile.temperature}°C
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-[#f5f0ea]/60">
                <Weight className="h-3 w-3" />{profile.final_weight}g target
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-[#f5f0ea]/60">
                {profile.stages.length} stages
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap mt-5 items-center">
              <button
                onClick={handleLoad}
                className="rounded-full bg-[#e8944a] px-4 py-2 text-sm font-semibold text-[#0c0a09] hover:bg-[#e8944a]/90 transition-colors"
              >
                ↳ Load to Machine
              </button>
              <Link
                href={`/share?id=${profile.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] hover:border-white/[0.14] transition-colors"
              >
                <GitFork className="h-3.5 w-3.5" /> Share
              </Link>
              {loadMsg && (
                <span className={`text-sm ${loadMsg.type === "success" ? "text-[#4ade80]" : "text-red-400"}`}>
                  {loadMsg.msg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stage stepper */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-6">
          <h2 className="text-xs font-semibold text-[#f5f0ea]/40 uppercase tracking-wider mb-5">Profile Stages</h2>
          <div className="space-y-0">
            {profile.stages.map((stage, i) => {
              const c = STAGE_COLORS[stage.type] ?? { bg: "rgba(232,148,74,0.1)", text: "#e8944a" };
              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="h-3 w-3 rounded-full border-2 mt-1 shrink-0"
                      style={{ borderColor: c.text, backgroundColor: c.bg }}
                    />
                    {i < profile.stages.length - 1 && (
                      <div className="w-px flex-1 bg-white/[0.06] mt-1 mb-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {stage.type}
                      </span>
                      <span className="text-sm font-medium text-[#f5f0ea]">{stage.name}</span>
                      <span className="text-xs text-[#f5f0ea]/30 ml-auto">over {stage.dynamics.over}</span>
                    </div>
                    <p className="text-xs text-[#f5f0ea]/25">
                      {stage.dynamics.points.length} point{stage.dynamics.points.length !== 1 ? "s" : ""} · {stage.dynamics.interpolation} interpolation
                    </p>
                    {stage.exit_triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {stage.exit_triggers.map((t, ti) => (
                          <span
                            key={ti}
                            className="text-[10px] text-[#f5f0ea]/30 border border-white/[0.06] rounded px-1.5 py-0.5"
                          >
                            {t.type}: {t.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Variables */}
        {profile.variables.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-6">
            <h2 className="text-xs font-semibold text-[#f5f0ea]/40 uppercase tracking-wider mb-4">Variables</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {profile.variables.map((v) => (
                <div key={v.key} className="rounded-xl bg-[#0c0a09] px-3 py-2.5">
                  <p className="text-[#f5f0ea]/35 text-xs">{v.name}</p>
                  <p className="font-medium font-mono text-sm text-[#f5f0ea] mt-0.5">
                    {v.value}{" "}
                    <span className="text-xs text-[#f5f0ea]/30">{v.type}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Author lineage */}
        {profile.previous_authors.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-6">
            <h2 className="text-xs font-semibold text-[#f5f0ea]/40 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GitFork className="h-3.5 w-3.5" /> Lineage
            </h2>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {profile.previous_authors.map((a, i) => (
                <span key={a.author_id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[#f5f0ea]/25">→</span>}
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[#f5f0ea]/50">{a.name}</span>
                </span>
              ))}
              <span className="text-[#f5f0ea]/25">→</span>
              <span className="rounded-full bg-[#e8944a]/10 text-[#e8944a] px-2.5 py-0.5 font-medium border border-[#e8944a]/20">{profile.author}</span>
            </div>
          </div>
        )}

        {/* Related shots */}
        {relatedShots.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#f5f0ea]/40 uppercase tracking-wider mb-4">Shots with this profile</h2>
            <div className="space-y-3">
              {relatedShots.map((shot) => {
                const stats = computeShotStats(shot.data);
                return (
                  <div key={shot.id} className="rounded-2xl border border-white/[0.06] bg-[#161210] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.04]">
                      <span className="text-sm font-medium text-[#f5f0ea]/70">
                        {new Date(shot.time * 1000).toLocaleString()}
                      </span>
                      <span className="text-xs text-[#f5f0ea]/30">{stats.durationSec}s · {stats.finalWeight.toFixed(1)}g</span>
                    </div>
                    <div className="p-4">
                      <ShotChart frames={shot.data} height={160} showTemp={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 transition-colors"
          >
            <Code className="h-3 w-3" />
            {showRaw ? "Hide" : "View"} Raw Profile JSON (OEPF)
          </button>
          {showRaw && (
            <pre className="mt-3 text-xs bg-[#161210] border border-white/[0.06] rounded-xl p-4 overflow-auto max-h-96 font-mono text-[#f5f0ea]/50 leading-relaxed">
              {JSON.stringify(profile, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8944a]" />
      </div>
    }>
      <ProfileDetailContent />
    </Suspense>
  );
}
