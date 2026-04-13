/**
 * profile-builder.ts
 * Internal representation of a profile being built in the wizard,
 * plus conversion to OEPF and chart simulation. No React.
 */

import type { Profile, ProfileStage, ExitTrigger, StageLimit } from "./types";

// ─── Internal types ───────────────────────────────────────────────────────────

export type StageType = "pressure" | "flow";
export type ValueMode = "constant" | "ramp";

export interface StageConfig {
  id: string;
  name: string;
  type: StageType;
  mode: ValueMode;
  /** constant mode: target value */
  value: number;
  /** ramp mode: start value */
  fromValue: number;
  /** ramp mode: end value */
  toValue: number;
  /** seconds */
  duration: number;
  /** safety cap on the other variable */
  limitEnabled: boolean;
  limitValue: number;
}

export interface ProfileBasics {
  name: string;
  author: string;
  temperature: number;
  targetWeight: number;
  shortDescription: string;
  accentColor: string;
}

export type ChartPoint = { t: number; pressure: number; flow: number };

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_BASICS: ProfileBasics = {
  name: "My Profile",
  author: "",
  temperature: 93,
  targetWeight: 36,
  shortDescription: "",
  accentColor: "#e8944a",
};

export function newStage(type: StageType = "pressure", index = 0): StageConfig {
  return {
    id: `${Date.now()}-${index}`,
    name: type === "pressure" ? "Pressure Stage" : "Flow Stage",
    type,
    mode: "constant",
    value: type === "pressure" ? 9 : 2,
    fromValue: type === "pressure" ? 2 : 0,
    toValue: type === "pressure" ? 9 : 2,
    duration: 25,
    limitEnabled: false,
    limitValue: type === "pressure" ? 4 : 9,
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface Template {
  key: string;
  label: string;
  description: string;
  basics: Partial<ProfileBasics>;
  stages: Omit<StageConfig, "id">[];
}

export const TEMPLATES: Template[] = [
  {
    key: "classic",
    label: "Classic Italian",
    description: "9 bar flat — the traditional espresso benchmark.",
    basics: { temperature: 93, targetWeight: 36, accentColor: "#f97316" },
    stages: [
      { name: "Preinfusion", type: "pressure", mode: "constant", value: 2, fromValue: 0, toValue: 0, duration: 8, limitEnabled: true, limitValue: 4 },
      { name: "Ramp Up",     type: "pressure", mode: "ramp",     value: 0, fromValue: 2, toValue: 9, duration: 5, limitEnabled: false, limitValue: 4 },
      { name: "Extraction",  type: "pressure", mode: "constant", value: 9, fromValue: 0, toValue: 0, duration: 25, limitEnabled: false, limitValue: 4 },
    ],
  },
  {
    key: "blooming",
    label: "Blooming",
    description: "Low pressure pause lets the puck degas before extraction.",
    basics: { temperature: 91, targetWeight: 36, accentColor: "#22c55e" },
    stages: [
      { name: "Fill",      type: "pressure", mode: "constant", value: 2,   fromValue: 0, toValue: 0, duration: 6,  limitEnabled: true,  limitValue: 6 },
      { name: "Bloom",     type: "pressure", mode: "constant", value: 0.5, fromValue: 0, toValue: 0, duration: 15, limitEnabled: false, limitValue: 4 },
      { name: "Ramp Up",   type: "pressure", mode: "ramp",     value: 0,   fromValue: 0.5, toValue: 9, duration: 8, limitEnabled: false, limitValue: 4 },
      { name: "Extraction",type: "pressure", mode: "ramp",     value: 0,   fromValue: 9, toValue: 5, duration: 30, limitEnabled: false, limitValue: 4 },
    ],
  },
  {
    key: "turbo",
    label: "Turbo",
    description: "High-flow, low-pressure for bright and fast extractions.",
    basics: { temperature: 88, targetWeight: 40, accentColor: "#f43f5e" },
    stages: [
      { name: "Turbo",type: "flow", mode: "constant", value: 6, fromValue: 0, toValue: 0, duration: 18, limitEnabled: true, limitValue: 6 },
    ],
  },
  {
    key: "flow",
    label: "Flow Control",
    description: "Gentle flow ramp for even saturation and sweet extraction.",
    basics: { temperature: 93, targetWeight: 36, accentColor: "#3b82f6" },
    stages: [
      { name: "Ramp",      type: "flow", mode: "ramp",     value: 0, fromValue: 0, toValue: 2, duration: 10, limitEnabled: true,  limitValue: 9 },
      { name: "Extraction",type: "flow", mode: "constant", value: 2, fromValue: 0, toValue: 0, duration: 35, limitEnabled: true,  limitValue: 9 },
    ],
  },
  {
    key: "blank",
    label: "Blank",
    description: "Start from scratch with a single pressure stage.",
    basics: { temperature: 93, targetWeight: 36, accentColor: "#6b7280" },
    stages: [
      { name: "Stage 1", type: "pressure", mode: "constant", value: 9, fromValue: 0, toValue: 0, duration: 30, limitEnabled: false, limitValue: 4 },
    ],
  },
];

// ─── Simulation ───────────────────────────────────────────────────────────────

const PTS_PER_SEC = 3;

export function simulateStages(stages: StageConfig[]): ChartPoint[] {
  const out: ChartPoint[] = [];
  let tMs = 0;

  for (const stage of stages) {
    const steps = Math.max(stage.duration * PTS_PER_SEC, 4);

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const t = tMs + frac * stage.duration * 1000;

      let pressure: number;
      let flow: number;

      if (stage.type === "pressure") {
        const p = stage.mode === "constant"
          ? stage.value
          : stage.fromValue + (stage.toValue - stage.fromValue) * frac;
        pressure = p;
        // Estimated flow: proportional to pressure, capped at limit
        const estFlow = Math.max(0, p * 0.42);
        flow = stage.limitEnabled ? Math.min(stage.limitValue, estFlow) : estFlow;
      } else {
        const f = stage.mode === "constant"
          ? stage.value
          : stage.fromValue + (stage.toValue - stage.fromValue) * frac;
        flow = f;
        const estPressure = Math.max(0, f * 2.4);
        pressure = stage.limitEnabled ? Math.min(stage.limitValue, estPressure) : estPressure;
      }

      out.push({ t, pressure: +pressure.toFixed(2), flow: +flow.toFixed(2) });
    }

    tMs += stage.duration * 1000;
  }

  return out;
}

// ─── OEPF serialisation ───────────────────────────────────────────────────────

export function stagesToOEPF(basics: ProfileBasics, stages: StageConfig[]): Profile {
  const id = typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}`;

  const oepfStages: ProfileStage[] = stages.map((s, i) => {
    const key = `${s.type}_${i + 1}`;

    const points: [number, number][] = s.mode === "constant"
      ? [[0, s.value]]
      : [[0, s.fromValue], [s.duration, s.toValue]];

    const exitTriggers: ExitTrigger[] = [
      { type: "time", value: s.duration, relative: true, comparison: ">=" },
    ];

    const limits: StageLimit[] = s.limitEnabled
      ? [{ type: s.type === "pressure" ? "flow" : "pressure", value: s.limitValue }]
      : [];

    return {
      name: s.name,
      key,
      type: s.type,
      dynamics: { points, over: "time", interpolation: "linear" },
      exit_triggers: exitTriggers,
      limits,
    };
  });

  return {
    id,
    name: basics.name || "Untitled",
    author: basics.author || "mbrista",
    author_id: id,
    previous_authors: [],
    temperature: basics.temperature,
    final_weight: basics.targetWeight,
    display: {
      shortDescription: basics.shortDescription,
      accentColor: basics.accentColor,
    },
    variables: [],
    stages: oepfStages,
  };
}
