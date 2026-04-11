import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Weight, User, Layers } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ProfileCurvePreview } from "./charts/profile-curve-preview";

interface ProfileCardProps {
  profile: Profile;
  href?: string;
  showLoadButton?: boolean;
  onLoad?: (profile: Profile) => void;
}

export function ProfileCard({ profile, href, onLoad }: ProfileCardProps) {
  const accent = profile.display?.accentColor ?? "#f97316";
  const stageTypes = [...new Set((profile.stages ?? []).map((s) => s.type))];

  const inner = (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer border-border/60 hover:border-primary/30">
      {/* Accent bar */}
      <div className="h-1" style={{ backgroundColor: accent }} />
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {profile.name}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3" />
              {profile.author}
            </p>
          </div>
          {/* Mini curve */}
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <ProfileCurvePreview profile={profile} width={80} height={36} accentColor={accent} />
          </div>
        </div>

        {/* Description */}
        {profile.display?.shortDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {profile.display.shortDescription}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            {profile.temperature}°C
          </span>
          <span className="flex items-center gap-1">
            <Weight className="h-3 w-3" />
            {profile.final_weight}g
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {profile.stages?.length ?? 0} stages
          </span>
        </div>

        {/* Stage type badges */}
        <div className="flex flex-wrap gap-1">
          {stageTypes.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0 capitalize">
              {t}
            </Badge>
          ))}
        </div>

        {onLoad && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLoad(profile);
            }}
            className="w-full mt-1 rounded-md text-xs font-medium py-1.5 px-3 border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            ↳ Load to Machine
          </button>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
