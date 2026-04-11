"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Layers } from "lucide-react";
import { listProfiles, loadProfileById } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import { ProfileCard } from "@/components/profile-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

const STYLE_FILTERS = ["All", "flow", "pressure", "power"];

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      setToast(`✓ "${profile.name}" loaded to machine`);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast("Failed to load profile");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = filter === "All"
    ? profiles
    : profiles.filter((p) => p.stages?.some((s) => s.type === filter));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profiles</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} profiles on your machine</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter:</span>
          {STYLE_FILTERS.map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {!profiles.length ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
          <Layers className="h-10 w-10" />
          <p>No profiles found. Connect your machine first.</p>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground text-background px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
