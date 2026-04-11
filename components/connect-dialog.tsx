"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wifi, CheckCircle, AlertCircle, Coffee } from "lucide-react";
import { testConnection } from "@/lib/machine-api";
import { saveIp } from "@/lib/connection-store";

interface ConnectDialogProps {
  open: boolean;
  onConnected: (ip: string) => void;
  onCancel?: () => void;
}

export function ConnectDialog({ open, onConnected, onCancel }: ConnectDialogProps) {
  const [ip, setIp] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [machineName, setMachineName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConnect() {
    if (!ip.trim()) return;
    setStatus("testing");
    setErrorMsg("");
    try {
      const info = await testConnection(ip.trim());
      setMachineName(info.name);
      setStatus("ok");
      saveIp(ip.trim());
      setTimeout(() => onConnected(ip.trim()), 600);
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach machine. Check IP and make sure you're on the same network.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Coffee className="h-4 w-4" />
            </div>
            <DialogTitle>Connect to your machine</DialogTitle>
          </div>
          <DialogDescription>
            Enter your Meticulous machine&apos;s local IP address. It&apos;s on your
            router or shown on the machine display.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="machine-ip">Machine IP address</Label>
            <Input
              id="machine-ip"
              placeholder="192.168.1.x"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Example: <span className="font-mono">192.168.86.28</span> or{" "}
              <span className="font-mono">192.168.86.28:8080</span>
            </p>
          </div>

          {status === "ok" && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Connected to <strong>{machineName}</strong>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={!ip.trim() || status === "testing" || status === "ok"}
            className="w-full"
          >
            {status === "testing" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing connection…</>
            ) : (
              <><Wifi className="h-4 w-4 mr-2" /> Connect</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
