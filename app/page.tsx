"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coffee, Gauge, History, ArrowRight, Layers, GitCompare, Radio, Share2, Loader2 } from "lucide-react";
import { ConnectDialog } from "@/components/connect-dialog";
import { getSavedIp } from "@/lib/connection-store";
import { testConnection } from "@/lib/machine-api";

const FEATURES = [
  { icon: Gauge,      title: "Control Plane",    desc: "Preheat, tare, purge, start/stop — full machine control from your browser.",               color: "#e8944a" },
  { icon: History,    title: "Shot Analytics",   desc: "Full history with pressure, flow, weight and temperature curves per extraction.",           color: "#60a5fa" },
  { icon: Layers,     title: "Profile Library",  desc: "Browse your machine's profiles with OEPF stage diagrams and settings.",                    color: "#a78bfa" },
  { icon: Radio,      title: "Live Monitor",     desc: "Watch your extraction in real-time via Socket.IO telemetry streaming.",                    color: "#f87171" },
  { icon: GitCompare, title: "Shot Comparison",  desc: "Overlay up to 5 shots to analyse consistency and dial-in improvements.",                  color: "#34d399" },
  { icon: Share2,     title: "Geeky Share Cards",desc: "Share profiles with actual shot telemetry, curves, and full OEPF data.",                   color: "#f5a855" },
];

export default function HomePage() {
  const router = useRouter();
  const [showConnect, setShowConnect] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const ip = getSavedIp();
    if (!ip) { setChecking(false); return; }
    testConnection(ip)
      .then(() => router.replace("/dashboard"))
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0c0a09]">
        <Loader2 className="h-5 w-5 animate-spin text-[#e8944a]/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-[#e8944a] opacity-[0.04] blur-[120px] -translate-y-1/2" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8944a]/20 bg-[#e8944a]/[0.08] px-3 py-1 text-xs font-medium text-[#e8944a] mb-8">
            <Coffee className="h-3 w-3" />
            Community-first · Always free · Open source
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[#f5f0ea] mb-6 leading-[1.1]">
            Your Meticulous machine,<br />
            <span className="text-[#e8944a]">fully unleashed.</span>
          </h1>
          <p className="text-lg text-[#f5f0ea]/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect directly to your machine. Pull shot history. Browse and share profiles
            with full geeky telemetry — pressure curves, flow diagrams, and actual extraction data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowConnect(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#e8944a] px-6 py-3 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all shadow-[0_0_30px_rgba(232,148,74,0.25)] hover:shadow-[0_0_40px_rgba(232,148,74,0.35)]"
            >
              <Coffee className="h-4 w-4" /> Connect My Machine
            </button>
            <Link
              href="/profiles"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-6 py-3 text-sm font-medium text-[#f5f0ea]/70 hover:bg-white/[0.07] hover:text-[#f5f0ea] transition-all"
            >
              Browse Profiles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/[0.05] bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-6 py-6 grid grid-cols-3 gap-4 text-center">
          {[
            { value: "~300", label: "Data points per shot" },
            { value: "OEPF", label: "Open profile format" },
            { value: "0",    label: "Cost to run" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold font-mono text-[#e8944a]">{value}</p>
              <p className="text-xs text-[#f5f0ea]/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold text-[#f5f0ea] text-center mb-3">Everything in one place</h2>
        <p className="text-[#f5f0ea]/40 text-center text-sm mb-12">No backend. No cloud. Connects directly to your machine over your local network.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="group rounded-2xl border border-white/[0.06] bg-[#161210] p-5 hover:border-white/[0.12] hover:bg-[#1e1b16] transition-all">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18`, color }}>
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-[#f5f0ea] mb-1.5">{title}</h3>
              <p className="text-sm text-[#f5f0ea]/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-white/[0.05]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-lg font-semibold text-[#f5f0ea] mb-6">The Meticulous Ecosystem</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "metprofiles.link",   desc: "Community profiles — browse, rate, and load to your machine",     href: "https://metprofiles.link" },
              { title: "Discord Community",  desc: "The official (unofficial) Meticulous community server",            href: "https://discord.gg/w48ha2h3" },
              { title: "MeticulousHome",     desc: "Open-source firmware, backend, API clients, and more",             href: "https://github.com/MeticulousHome" },
            ].map(({ title, desc, href }) => (
              <a key={title} href={href} target="_blank" rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#161210] p-4 hover:border-white/[0.12] hover:bg-[#1e1b16] transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f5f0ea] group-hover:text-[#e8944a] transition-colors">{title}</p>
                  <p className="text-xs text-[#f5f0ea]/40 mt-1 leading-relaxed">{desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#f5f0ea]/20 group-hover:text-[#e8944a] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <ConnectDialog
        open={showConnect}
        onConnected={() => router.replace("/dashboard")}
        onCancel={() => setShowConnect(false)}
      />
    </div>
  );
}
