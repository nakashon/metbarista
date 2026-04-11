// ============================================================
// Open Espresso Profile Format (OEPF) types
// Based on MeticulousHome/espresso-profile-schema (GPL-3)
// ============================================================

export type StageType = "power" | "flow" | "pressure";
export type OverType = "piston_position" | "time" | "weight";
export type InterpolationType = "none" | "linear" | "curve";
export type ExitTriggerType =
  | "weight"
  | "pressure"
  | "flow"
  | "time"
  | "piston_position"
  | "power"
  | "user_interaction";
export type LimitType = "pressure" | "flow";
export type VariableType =
  | "power"
  | "flow"
  | "pressure"
  | "weight"
  | "time"
  | "piston_position";

export interface ProfileVariable {
  name: string;
  key: string;
  type: VariableType;
  value: number;
}

export interface StageDynamics {
  points: [number | string, number | string][];
  over: OverType;
  interpolation: InterpolationType;
}

export interface ExitTrigger {
  type: ExitTriggerType;
  value: number | string;
  relative?: boolean;
  comparison?: ">=" | "<=";
}

export interface StageLimit {
  type: LimitType;
  value: number | string;
}

export interface ProfileStage {
  name: string;
  key: string;
  type: StageType;
  dynamics: StageDynamics;
  exit_triggers: ExitTrigger[];
  limits?: StageLimit[];
  temperature_delta?: number;
}

export interface ProfileAuthor {
  name: string;
  author_id: string;
  profile_id: string;
}

export interface ProfileDisplay {
  accentColor?: string;
  image?: string;
  shortDescription?: string;
  description?: string;
}

export interface Profile {
  id: string;
  name: string;
  author: string;
  author_id: string;
  previous_authors: ProfileAuthor[];
  display: ProfileDisplay;
  temperature: number;
  final_weight: number;
  variables: ProfileVariable[];
  stages: ProfileStage[];
  last_changed?: number;
  isLast?: boolean;
  temporary?: boolean;
  db_key?: number;
}

// ============================================================
// Shot / History types (from /api/v1/history)
// ============================================================

export interface ShotSetpoints {
  active: string | null;
  flow?: number;
  pressure?: number;
}

export interface ShotDataPoint {
  pressure: number;
  flow: number;
  weight: number;
  gravimetric_flow: number;
  setpoints: ShotSetpoints;
}

export interface ShotSensors {
  external_1: number;
  external_2: number;
  bar_up: number;
  bar_mid_up: number;
  bar_mid_down: number;
  bar_down: number;
  tube: number;
  motor_temp: number;
  lam_temp: number;
  motor_position: number;
  motor_speed: number;
  motor_power: number;
  motor_current: number;
  bandheater_power: number;
  bandheater_current: number;
  pressure_sensor: number;
  water_status: boolean;
  weight_prediction: number;
  [key: string]: number | boolean | string;
}

export interface ShotFrame {
  shot: ShotDataPoint;
  time: number; // ms since shot start
  profile_time: number;
  status: string; // phase name e.g. "Flow", "retracting"
  sensors: ShotSensors;
}

export interface ShotEntry {
  id: string;
  db_key: number;
  time: number; // unix timestamp
  file: string;
  debug_file?: string;
  name: string; // profile name at time of shot
  profile?: Profile; // embedded profile snapshot
  data: ShotFrame[];
}

export interface HistoryResponse {
  history: ShotEntry[];
}

// Derived stats computed from raw shot data
export interface ShotStats {
  durationMs: number;
  durationSec: number;
  maxPressure: number;
  maxFlow: number;
  finalWeight: number;
  avgTemp: number;
  phases: string[];
  dataPoints: number;
}

// ============================================================
// Machine types (from /api/v1/machine)
// ============================================================

export interface MachineInfo {
  name: string;
  hostname: string;
  firmware: string;
  mainVoltage: number;
  serial: string;
  color: string;
  batch_number: string;
  build_date: string;
  software_version: string;
  image_build_channel: string;
  image_version: string;
  manufacturing: boolean;
}

// ============================================================
// Settings (from /api/v1/settings)
// ============================================================

export interface MachineSettings {
  enable_sounds: boolean;
  heat_on_boot: boolean;
  heating_timeout: number;
  update_channel: string;
  idle_screen: string;
  partial_retraction: number;
  auto_start_shot: boolean;
  auto_purge_after_shot: boolean;
  profile_order: string[];
  time_zone: string;
  ssh_enabled: boolean;
}

// ============================================================
// Action types
// ============================================================

export type ActionType =
  | "start"
  | "stop"
  | "preheat"
  | "tare"
  | "purge"
  | "calibrate"
  | "abort";

export interface ActionRequest {
  name: ActionType;
}

// ============================================================
// Connection state
// ============================================================

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

export interface MachineConnection {
  ip: string;
  status: ConnectionStatus;
  lastChecked?: number;
}

// ============================================================
// Socket.IO live data
// ============================================================

export interface LiveStatus {
  state: string;
  profile_time: number;
  shot?: ShotDataPoint;
  sensors?: Partial<ShotSensors>;
}

export interface LiveTemperatures {
  t_bar_up: number;
  t_bar_mid_up: number;
  t_bar_mid_down: number;
  t_bar_down: number;
  t_tube: number;
  t_external_1: number;
  t_external_2: number;
}
