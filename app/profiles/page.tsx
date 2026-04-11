"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Layers } from "lucide-react";
import { listProfiles, loadProfileById } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import { ProfileCard } from "@/components/profile-card";
import type { Profile } from "@/lib/types";

const STYLE_FILTERS = ["All", "flow", "pressure", "power"];

type Toast = { type: "success" | "error"; msg: string } | null;

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!getSavedIp()) { setLoading(false); return; }
    listProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  async function handleLoad(profile: Profile) {
    setLoadingId(profile.id);
    try {
      await loadProfileById(profile.id);
      setToast({ type: "success", msg: `✓ "${profile.name}" loaded to machine` });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({ type: "error", msg: "Failed to load profile" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingId(null);
    }
  }

  // /api/v1/profile/list does NOT return stages — infer type from variables instead.
  // Profiles with pressure vars → pressure, flow vars → flow, neither → power.
  function inferTypes(p: Profile): string[] {
    const vtypes = new Set((p.variables ?? []).map((v) => v.type));
    const out: string[] = [];
    if (vtypes.has("pressure")) out.push("pressure");
    if (vtypes.has("flow")) out.push("flow");
    if (out.length === 0) out.push("power");
    return out;
  }

  const filtered = filter === "All"
    ? profiles
    : profiles.filter((p) => inferTypes(p).includes(filter));

  if (loading) return (
    <div className="min-h-screen bg-[#0c0a09] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#e8944a]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header + filters */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f0ea]">Profiles</h1>
            <p className="text-sm text-[#f5f0ea]/40 mt-0.5">
              {profiles.length} profile{profiles.length !== 1 ? "s" : ""} on your machine
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STYLE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer capitalize ${
                  filter === f
                    ? "bg-[#e8944a]/15 text-[#e8944a] border-[#e8944a]/20"
                    : "bg-transparent text-[#f5f0ea]/40 border-white/[0.08] hover:text-[#f5f0ea]/70"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {!profiles.length ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
            <div className="rounded-full bg-[#e8944a]/10 p-4">
              <Layers className="h-8 w-8 text-[#e8944a]" />
            </div>
            <div>
              <p className="text-[#f5f0ea]/60 text-sm">No profiles found.</p>
              <p className="text-[#f5f0ea]/30 text-xs mt-0.5">Connect your machine first.</p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-[#e8944a]/20 bg-[#e8944a]/10 px-4 py-2 text-sm font-medium text-[#e8944a] hover:bg-[#e8944a]/20 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                href={`/profile?id=${profile.id}`}
                onLoad={loadingId === null ? handleLoad : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl transition-all z-50 ${
          toast.type === "success"
            ? "border-[#4ade80]/20 bg-[#0c0a09] text-[#4ade80]"
            : "border-red-500/20 bg-[#0c0a09] text-red-400"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
