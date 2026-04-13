"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Wifi, CheckCircle, AlertCircle, Coffee, Router, Monitor, Smartphone, ChevronDown, ChevronUp } from "lucide-react";
import { testConnection } from "@/lib/machine-api";
import { saveIp } from "@/lib/connection-store";

interface ConnectDialogProps {
  open: boolean;
  onConnected: (ip: string) => void;
  onCancel?: () => void;
}

const HOW_TO_FIND = [
  {
    icon: Monitor,
    title: "Check the machine screen",
    desc: 'On the Meticulous, navigate to Settings → WiFi. The IP address is shown there (e.g. 192.168.1.42).',
  },
  {
    icon: Router,
    title: "Check your router",
    desc: 'Open your router admin page (usually 192.168.1.1 or 192.168.0.1). Look for a device named "Meticulous" in the connected devices list.',
  },
  {
    icon: Smartphone,
    title: "Use a network scanner",
    desc: 'Apps like "Fing" (iOS/Android) scan your WiFi and list all devices with their IPs in seconds.',
  },
];

export function ConnectDialog({ open, onConnected, onCancel }: ConnectDialogProps) {
  const [ip, setIp] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [machineName, setMachineName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

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
      setErrorMsg("Could not reach the machine at that address.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel?.()}>
      <DialogContent className="sm:max-w-md bg-[#161210] border-white/[0.08] text-[#f5f0ea] p-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8944a]/15 text-[#e8944a]">
                <Coffee className="h-4 w-4" />
              </div>
              <DialogTitle className="text-[#f5f0ea] font-semibold">Connect your machine</DialogTitle>
            </div>
          </DialogHeader>

          {/* Same-network reminder */}
          <div className="flex items-start gap-2.5 rounded-xl bg-[#e8944a]/[0.07] border border-[#e8944a]/15 px-3 py-2.5 mt-1">
            <Wifi className="h-4 w-4 text-[#e8944a] shrink-0 mt-0.5" />
            <p className="text-xs text-[#f5f0ea]/60 leading-relaxed">
              <span className="text-[#e8944a] font-medium">Same WiFi required.</span>{" "}
              Your computer and the Meticulous must be on the same network — mbrista connects directly, no cloud involved.
            </p>
          </div>
        </div>

        {/* IP input */}
        <div className="px-6 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#f5f0ea]/50">Machine IP address</label>
            <input
              placeholder="192.168.1.42"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm font-mono text-[#f5f0ea] placeholder:text-[#f5f0ea]/25 focus:outline-none focus:border-[#e8944a]/40"
            />
            <p className="text-[11px] text-[#f5f0ea]/25">
              Usually starts with <span className="font-mono text-[#f5f0ea]/40">192.168.</span> — port is optional
            </p>
          </div>

          {status === "ok" && (
            <div className="flex items-center gap-2 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-2.5 text-sm text-[#4ade80]">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Connected to <strong>{machineName}</strong>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <ul className="text-xs text-red-400/70 list-disc list-inside space-y-0.5 pl-1">
                <li>Is the machine powered on and showing WiFi connected?</li>
                <li>Are you on the same WiFi network?</li>
                <li>Double-check the IP — it may have changed after a reboot</li>
              </ul>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={!ip.trim() || status === "testing" || status === "ok"}
            className="w-full rounded-xl bg-[#e8944a] py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === "testing"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing connection…</>
              : <><Wifi className="h-4 w-4" /> Connect</>}
          </button>
        </div>

        {/* How to find IP — collapsible */}
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-[#f5f0ea]/35 hover:text-[#f5f0ea]/60 transition-colors"
          >
            <span>How do I find my machine&apos;s IP?</span>
            {showHelp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showHelp && (
            <div className="px-6 pb-5 space-y-3">
              {HOW_TO_FIND.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-[#f5f0ea]/30" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#f5f0ea]/60">{title}</p>
                    <p className="text-xs text-[#f5f0ea]/30 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
