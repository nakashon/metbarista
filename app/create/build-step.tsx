"use client";

import { Plus } from "lucide-react";
import { StageCard } from "@/components/stage-card";
import { simulateStages, newStage } from "@/lib/profile-builder";
import type { ProfileBasics, StageConfig } from "@/lib/profile-builder";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  basics: ProfileBasics;
  setBasics: (b: ProfileBasics) => void;
  stages: StageConfig[];
  setStages: (s: StageConfig[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BuildStep({ basics, setBasics, stages, setStages, onBack, onNext }: Props) {
  const chartData = simulateStages(stages);
  const totalSec = stages.reduce((n, s) => n + s.duration, 0);

  function updateStage(i: number, updated: StageConfig) {
    const next = [...stages];
    next[i] = updated;
    setStages(next);
  }

  function deleteStage(i: number) {
    setStages(stages.filter((_, idx) => idx !== i));
  }

  function moveStage(i: number, dir: -1 | 1) {
    const next = [...stages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setStages(next);
  }

  function addStage() {
    setStages([...stages, newStage("pressure", stages.length)]);
  }

  return (
    <div className="space-y-6">
      {/* Live chart */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[#f5f0ea]">Preview</p>
          <span className="text-xs font-mono text-[#f5f0ea]/30">~{totalSec}s total</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`}
              tick={{ fontSize: 11, fill: "rgba(245,240,234,0.25)" }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 12]} width={28}
              tick={{ fontSize: 11, fill: "rgba(245,240,234,0.25)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "#161210", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: 12 }}
              labelFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}s`}
              formatter={(v) => (typeof v === "number" ? v.toFixed(2) : v)} />
            <Line type="monotone" dataKey="pressure" name="Pressure (bar)" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="flow"     name="Flow (ml/s)"    stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 2-col layout: stages left, basics right on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage list */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm font-semibold text-[#f5f0ea]/60">Stages</p>
          {stages.map((s, i) => (
            <StageCard key={s.id} stage={s} index={i} total={stages.length}
              onChange={(u) => updateStage(i, u)}
              onDelete={() => deleteStage(i)}
              onMove={(d) => moveStage(i, d)} />
          ))}
          <button onClick={addStage}
            className="w-full rounded-xl border border-dashed border-white/[0.08] py-3 text-sm text-[#f5f0ea]/30 hover:border-[#e8944a]/30 hover:text-[#e8944a]/60 hover:bg-[#e8944a]/[0.03] transition-all flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Add stage
          </button>
        </div>

        {/* Basics sidebar */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#f5f0ea]/60">Settings</p>
          <div className="rounded-xl border border-white/[0.06] bg-[#161210] p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#f5f0ea]/40">Profile name</label>
              <input value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0c0a09] px-3 py-2 text-sm text-[#f5f0ea] focus:outline-none focus:border-[#e8944a]/30" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#f5f0ea]/40">Temperature — {basics.temperature}°C</label>
              <input type="range" min={80} max={100} step={1} value={basics.temperature}
                onChange={(e) => setBasics({ ...basics, temperature: Number(e.target.value) })}
                className="w-full h-1 accent-[#e8944a]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#f5f0ea]/40">Target weight — {basics.targetWeight}g</label>
              <input type="range" min={20} max={60} step={1} value={basics.targetWeight}
                onChange={(e) => setBasics({ ...basics, targetWeight: Number(e.target.value) })}
                className="w-full h-1 accent-[#e8944a]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#f5f0ea]/40">Description (optional)</label>
              <textarea value={basics.shortDescription}
                onChange={(e) => setBasics({ ...basics, shortDescription: e.target.value })}
                rows={3} placeholder="What makes this profile special?"
                className="w-full rounded-lg border border-white/[0.08] bg-[#0c0a09] px-3 py-2 text-sm text-[#f5f0ea]/70 focus:outline-none focus:border-[#e8944a]/30 placeholder:text-[#f5f0ea]/15 resize-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#f5f0ea]/50 hover:text-[#f5f0ea]/80 hover:bg-white/[0.04] transition-all">
          ← Back
        </button>
        <button onClick={onNext} disabled={stages.length === 0}
          className="rounded-xl bg-[#e8944a] px-6 py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          Review & Save →
        </button>
      </div>
    </div>
  );
}
