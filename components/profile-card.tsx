import Link from "next/link";
import { Thermometer, Weight, Layers } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ProfileCurvePreview } from "./charts/profile-curve-preview";
import { getSavedIp } from "@/lib/connection-store";

interface ProfileCardProps {
  profile: Profile;
  href?: string;
  onLoad?: (profile: Profile) => void;
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  pressure: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa" },
  flow:     { bg: "rgba(34,211,238,0.12)", text: "#22d3ee" },
  power:    { bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },
};

function getImageUrl(imagePath?: string): string | null {
  if (!imagePath) return null;
  const ip = getSavedIp();
  if (!ip) return null;
  return `http://${ip}${imagePath}`;
}

export function ProfileCard({ profile, href, onLoad }: ProfileCardProps) {
  const accent = profile.display?.accentColor ?? "#e8944a";
  const stageTypes = [...new Set((profile.stages ?? []).map((s) => s.type))];
  const imageUrl = getImageUrl(profile.display?.image);

  const inner = (
    <div className="group rounded-2xl border border-white/[0.06] bg-[#161210] overflow-hidden hover:border-white/[0.14] hover:bg-[#1e1b16] transition-all cursor-pointer">

      {/* Profile image or accent bar */}
      {imageUrl ? (
        <div className="relative h-36 overflow-hidden bg-[#0c0a09]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={profile.name}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />
          {/* Gradient overlay so text over image is readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161210] via-transparent to-transparent" />
          {/* Curve preview floated top-right */}
          <div className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity">
            <ProfileCurvePreview profile={profile} width={72} height={28} accentColor={accent} />
          </div>
        </div>
      ) : (
        <>
          <div className="h-[3px]" style={{ backgroundColor: accent }} />
          <div className="px-4 pt-3 flex justify-end opacity-60 group-hover:opacity-100 transition-opacity">
            <ProfileCurvePreview profile={profile} width={72} height={32} accentColor={accent} />
          </div>
        </>
      )}

      <div className={`px-4 pb-4 space-y-3 ${imageUrl ? "" : "pt-1"}`}>
        {/* Header row */}
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-[#f5f0ea] truncate group-hover:text-[#e8944a] transition-colors leading-snug">
            {profile.name}
          </h3>
          <p className="text-xs text-[#f5f0ea]/35 mt-0.5">{profile.author}</p>
        </div>

        {profile.display?.shortDescription && (
          <p className="text-xs text-[#f5f0ea]/40 line-clamp-2 leading-relaxed">
            {profile.display.shortDescription}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-[#f5f0ea]/35">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />{profile.temperature}°C
          </span>
          <span className="flex items-center gap-1">
            <Weight className="h-3 w-3" />{profile.final_weight}g
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />{profile.stages?.length ?? 0} stages
          </span>
        </div>

        {/* Stage badges */}
        <div className="flex flex-wrap gap-1.5">
          {stageTypes.map((t) => {
            const c = STAGE_COLORS[t] ?? { bg: "rgba(255,255,255,0.08)", text: "#f5f0ea" };
            return (
              <span key={t} className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                style={{ backgroundColor: c.bg, color: c.text }}>{t}</span>
            );
          })}
        </div>

        {onLoad && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLoad(profile); }}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 text-xs font-medium text-[#f5f0ea]/50 hover:bg-[#e8944a]/10 hover:border-[#e8944a]/20 hover:text-[#e8944a] transition-all"
          >
            Load to Machine ↑
          </button>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
