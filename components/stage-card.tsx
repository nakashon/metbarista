"use client";

import { ChevronUp, ChevronDown, X } from "lucide-react";
import type { StageConfig, StageType, ValueMode } from "@/lib/profile-builder";

interface Props {
  stage: StageConfig;
  index: number;
  total: number;
  onChange: (updated: StageConfig) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

const TYPE_STYLES: Record<StageType, { pill: string; dot: string }> = {
  pressure: { pill: "bg-[#60a5fa]/10 text-[#60a5fa] border-[#60a5fa]/20", dot: "bg-[#60a5fa]" },
  flow:     { pill: "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/20", dot: "bg-[#22d3ee]" },
};

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#f5f0ea]/40">{label}</span>
        <span className="text-xs font-mono text-[#f5f0ea]/70">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-white/[0.08] accent-[#e8944a] cursor-pointer"
      />
    </div>
  );
}

export function StageCard({ stage, index, total, onChange, onDelete, onMove }: Props) {
  const s = TYPE_STYLES[stage.type];
  const maxVal = stage.type === "pressure" ? 12 : 8;
  const unit   = stage.type === "pressure" ? " bar" : " ml/s";
  const limitUnit = stage.type === "pressure" ? " ml/s" : " bar";
  const limitMax  = stage.type === "pressure" ? 8 : 12;

  function set<K extends keyof StageConfig>(key: K, val: StageConfig[K]) {
    onChange({ ...stage, [key]: val });
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#161210] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        {/* Type toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08] shrink-0">
          {(["pressure", "flow"] as StageType[]).map((t) => (
            <button key={t}
              onClick={() => set("type", t)}
              className={`px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                stage.type === t ? s.pill : "text-[#f5f0ea]/25 hover:text-[#f5f0ea]/50"
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Name */}
        <input
          value={stage.name}
          onChange={(e) => set("name", e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-[#f5f0ea]/80 focus:outline-none placeholder:text-[#f5f0ea]/20"
          placeholder="Stage name"
        />

        {/* Move / delete */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 rounded text-[#f5f0ea]/20 hover:text-[#f5f0ea]/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 rounded text-[#f5f0ea]/20 hover:text-[#f5f0ea]/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} disabled={total <= 1}
            className="p-1 rounded text-[#f5f0ea]/20 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors ml-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5 w-fit">
          {(["constant", "ramp"] as ValueMode[]).map((m) => (
            <button key={m}
              onClick={() => set("mode", m)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                stage.mode === m
                  ? "bg-[#e8944a]/15 text-[#e8944a]"
                  : "text-[#f5f0ea]/35 hover:text-[#f5f0ea]/60"
              }`}
            >{m}</button>
          ))}
        </div>

        {/* Value sliders */}
        {stage.mode === "constant" ? (
          <Slider label="Target" value={stage.value} min={0} max={maxVal} step={0.1} unit={unit}
            onChange={(v) => set("value", v)} />
        ) : (
          <>
            <Slider label="From" value={stage.fromValue} min={0} max={maxVal} step={0.1} unit={unit}
              onChange={(v) => set("fromValue", v)} />
            <Slider label="To" value={stage.toValue} min={0} max={maxVal} step={0.1} unit={unit}
              onChange={(v) => set("toValue", v)} />
          </>
        )}

        <Slider label="Duration" value={stage.duration} min={1} max={90} step={1} unit="s"
          onChange={(v) => set("duration", v)} />

        {/* Safety limit toggle */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stage.limitEnabled}
              onChange={(e) => set("limitEnabled", e.target.checked)}
              className="rounded accent-[#e8944a]" />
            <span className="text-xs text-[#f5f0ea]/40">
              {stage.type === "pressure" ? "Flow limit (prevents channelling)" : "Pressure limit (safety cap)"}
            </span>
          </label>
          {stage.limitEnabled && (
            <Slider label={stage.type === "pressure" ? "Max flow" : "Max pressure"}
              value={stage.limitValue} min={0} max={limitMax} step={0.1} unit={limitUnit}
              onChange={(v) => set("limitValue", v)} />
          )}
        </div>
      </div>
    </div>
  );
}
