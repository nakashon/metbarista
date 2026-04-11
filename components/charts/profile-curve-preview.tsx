"use client";

import { useMemo } from "react";
import type { Profile } from "@/lib/types";

interface ProfileCurveProps {
  profile: Profile;
  width?: number;
  height?: number;
  accentColor?: string;
}

/**
 * Renders a mini SVG curve preview of a profile's stages.
 * Plots theoretical pressure/flow over time from stage dynamics.
 */
export function ProfileCurvePreview({
  profile,
  width = 200,
  height = 60,
  accentColor,
}: ProfileCurveProps) {
  const paths = useMemo(() => {
    const color = accentColor ?? "#f97316";
    const stages = profile.stages ?? [];
    if (!stages.length) return null;

    // Build points: walk through stages, each contributing segments
    const allPoints: { x: number; y: number }[] = [];
    let t = 0;

    for (const stage of stages) {
      const { dynamics } = stage;
      if (!dynamics?.points?.length) continue;

      for (const [dt, val] of dynamics.points) {
        const tNum = typeof dt === "number" ? dt : 0;
        const vNum = typeof val === "number" ? val : 0;
        allPoints.push({ x: t + tNum * 1000, y: vNum });
      }
      // Advance time by last point's x
      const lastPt = dynamics.points[dynamics.points.length - 1];
      t += typeof lastPt[0] === "number" ? lastPt[0] * 1000 : 5000;
    }

    if (allPoints.length < 2) return null;

    const maxX = allPoints[allPoints.length - 1].x;
    const maxY = Math.max(...allPoints.map((p) => p.y), 1);

    const px = (x: number) => (x / maxX) * width;
    const py = (y: number) => height - (y / maxY) * (height - 4);

    const d = allPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
      .join(" ");

    // Fill area under curve
    const fill = `${d} L ${px(maxX).toFixed(1)} ${height} L 0 ${height} Z`;

    return { d, fill, color };
  }, [profile.stages, accentColor, width, height]);

  if (!paths) {
    return (
      <svg width={width} height={height} className="opacity-20">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth={1} />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${profile.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={paths.color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={paths.color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={paths.fill} fill={`url(#grad-${profile.id})`} />
      <path d={paths.d} fill="none" stroke={paths.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
