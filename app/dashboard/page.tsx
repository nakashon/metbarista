"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectDialog } from "@/components/connect-dialog";
import { ShotCard } from "@/components/shot-card";
import {
  Coffee, Wifi, WifiOff, Loader2, Thermometer, Zap, Info,
  Play, Square, Flame, Scale, Wind, RefreshCw
} from "lucide-react";
import { getMachineInfo, getHistory, executeAction, listProfiles } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import type { MachineInfo, ShotEntry, Profile } from "@/lib/types";
import type { ActionType } from "@/lib/types";

export default function DashboardPage() {
  const [showConnect, setShowConnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [recentShots, setRecentShots] = useState<ShotEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionType | null>(null);

  const ip = getSavedIp();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [info, shots, profs] = await Promise.all([
        getMachineInfo(),
        getHistory(),
        listProfiles(),
      ]);
      setMachine(info);
      setRecentShots(shots.slice(0, 5));
      setProfiles(profs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ip) load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAction(action: ActionType) {
    setActionLoading(action);
    try {
      await executeAction(action);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  if (!ip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No machine connected</h2>
        <p className="text-muted-foreground max-w-sm">
          Connect to your Meticulous machine to access the control plane.
        </p>
        <Button onClick={() => setShowConnect(true)}>
          <Coffee className="h-4 w-4 mr-2" /> Connect Machine
        </Button>
        <ConnectDialog
          open={showConnect}
          onConnected={() => { setShowConnect(false); load(); }}
          onCancel={() => setShowConnect(false)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <WifiOff className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-semibold">Connection failed</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const ACTIONS: { action: ActionType; label: string; icon: React.ElementType; variant?: "default" | "destructive" | "outline" }[] = [
    { action: "preheat", label: "Preheat", icon: Flame },
    { action: "tare", label: "Tare Scale", icon: Scale },
    { action: "purge", label: "Purge", icon: Wind },
    { action: "start", label: "Start Shot", icon: Play, variant: "default" },
    { action: "stop", label: "Stop", icon: Square, variant: "destructive" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{ip}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Machine info card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              {machine?.name}
              <Badge variant="outline" className="ml-auto text-xs font-mono">
                {machine?.color}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <InfoRow icon={Info} label="Firmware" value={machine?.firmware ?? "—"} mono />
            <InfoRow icon={Info} label="Serial" value={machine?.serial ?? "—"} mono />
            <InfoRow icon={Thermometer} label="Voltage" value={`${machine?.mainVoltage ?? "—"}V`} />
            <InfoRow icon={Info} label="Channel" value={machine?.image_build_channel ?? "—"} />
            <InfoRow icon={Info} label="Image" value={machine?.image_version?.slice(0, 14) ?? "—"} mono />
            <InfoRow icon={Info} label="Profiles" value={String(profiles.length)} />
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total shots</span>
              <span className="font-medium">{recentShots.length}+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profiles</span>
              <span className="font-medium">{profiles.length}</span>
            </div>
            {recentShots[0] && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last shot</span>
                <span className="font-medium truncate max-w-28 text-right">{recentShots[0].name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Machine Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map(({ action, label, icon: Icon, variant }) => (
              <Button
                key={action}
                variant={variant ?? "outline"}
                size="sm"
                onClick={() => doAction(action)}
                disabled={actionLoading !== null}
                className="gap-1.5"
              >
                {actionLoading === action ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent shots */}
      {recentShots.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Shots</h2>
          <div className="space-y-2">
            {recentShots.map((shot) => (
              <ShotCard key={shot.id} shot={shot} href={`/shot?id=${shot.id}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className={`text-sm font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
