"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConnectDialog } from "@/components/connect-dialog";
import { Coffee, Gauge, History, Zap, Users, ArrowRight, Layers, GitCompare } from "lucide-react";

const FEATURES = [
  { icon: Gauge, title: "Control Plane", desc: "Preheat, tare, purge, start/stop shots — all from your browser." },
  { icon: History, title: "Shot Analytics", desc: "Full shot history with pressure, flow, weight and temperature charts." },
  { icon: Layers, title: "Profile Library", desc: "Your machine's profiles with stage diagrams and OEPF details." },
  { icon: Zap, title: "Live Monitor", desc: "Watch your extraction in real-time via Socket.IO telemetry." },
  { icon: GitCompare, title: "Shot Comparison", desc: "Overlay multiple shots to analyse consistency and improvements." },
  { icon: Users, title: "Community", desc: "Live Discord feed from the official Meticulous community server." },
];

export default function HomePage() {
  const [showConnect, setShowConnect] = useState(false);

  return (
    <div className="flex flex-col">
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 via-background to-background pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Coffee className="h-3.5 w-3.5" />
            Open source · Always free · Community first
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            The Uber Control Center
            <br />
            <span className="text-primary/70">for Meticulous Espresso</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Connect to your machine locally. Browse and share community profiles with
            real shot telemetry. Monitor extractions live. All in one free, open app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setShowConnect(true)} className="gap-2">
              <Coffee className="h-4 w-4" /> Connect My Machine
            </Button>
            <Link href="/profiles" className={buttonVariants({ size: "lg", variant: "outline" }) + " gap-2"}>
              Browse Profiles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-center mb-10">Everything in one place</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/30 hover:shadow-sm transition-all">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-12 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-xl font-bold">Part of the Meticulous universe</h2>
          <p className="text-sm text-muted-foreground">
            mbrista connects the ecosystem — your machine&apos;s local API, the community
            Discord, MeticAI, and the Open Espresso Profile Format spec.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {[
              { label: "Meticulous Discord", href: "https://discord.gg/w48ha2h3" },
              { label: "metprofiles.link", href: "https://metprofiles.link" },
              { label: "MeticAI", href: "https://github.com/hessius/MeticAI" },
              { label: "OEPF Schema", href: "https://github.com/MeticulousHome/espresso-profile-schema" },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                {label} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      <ConnectDialog open={showConnect} onConnected={() => setShowConnect(false)} onCancel={() => setShowConnect(false)} />
    </div>
  );
}
