"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Smartphone, Share2, Copy, Check, Home, ArrowLeft, Coffee } from "lucide-react";
import { getSavedIp } from "@/lib/connection-store";

const BASE_URL = "https://metbarista.com";

const STEPS = [
  {
    platform: "iPhone / Safari",
    icon: Share2,
    color: "#60a5fa",
    steps: [
      'Open your deep-link URL in Safari',
      'Tap the Share button (□↑) at the bottom of the screen',
      'Scroll down and tap "Add to Home Screen"',
      'Name it "MetBarista" and tap Add',
    ],
  },
  {
    platform: "Android / Chrome",
    icon: Smartphone,
    color: "#4ade80",
    steps: [
      'Open your deep-link URL in Chrome',
      'Tap the menu button (⋮) in the top-right corner',
      'Tap "Add to Home Screen"',
      'Confirm by tapping Add',
    ],
  },
  {
    platform: "Mac / Chrome",
    icon: Home,
    color: "#a78bfa",
    steps: [
      'Open your deep-link URL in Chrome',
      'Look for the install icon (⊕) in the address bar on the right',
      'Click it and select "Install"',
      'MetBarista will open as a standalone app',
    ],
  },
];

export default function ShortcutsPage() {
  const [ip, setIp] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIp(getSavedIp());
  }, []);

  const deepLink = ip ? `${BASE_URL}/?ip=${ip}` : BASE_URL;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">

        {/* Back nav */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-[#f5f0ea]/35 hover:text-[#f5f0ea]/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8944a]/20 bg-[#e8944a]/[0.08] px-3 py-1 text-xs font-medium text-[#e8944a]">
            <Coffee className="h-3 w-3" />
            One-tap connect
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f5f0ea]">
            Add MetBarista to Your Home Screen
          </h1>
          <p className="text-sm text-[#f5f0ea]/45 leading-relaxed">
            Create a shortcut that opens MetBarista and connects to your machine automatically —
            no typing the IP every time.
          </p>
        </div>

        {/* Deep link card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-[#f5f0ea]/35 uppercase tracking-wider mb-1">
              Your personal deep-link
            </p>
            {ip ? (
              <p className="text-xs text-[#f5f0ea]/40">
                This URL includes your machine IP (<span className="font-mono text-[#e8944a]">{ip}</span>) so tapping
                it will connect automatically.
              </p>
            ) : (
              <p className="text-xs text-[#f5f0ea]/40">
                No machine IP saved yet.{" "}
                <Link href="/" className="text-[#e8944a] underline hover:text-[#f5a855]">
                  Connect a machine
                </Link>{" "}
                first to get your personal URL.
              </p>
            )}
          </div>

          {/* URL display */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 min-w-0">
              <p className="text-xs font-mono text-[#f5f0ea]/70 break-all">{deepLink}</p>
            </div>
            <button
              onClick={copyLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                copied
                  ? "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/25"
                  : "bg-[#e8944a] text-[#0c0a09] hover:bg-[#f5a855]"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-[#f5f0ea]/35 uppercase tracking-wider">
            Step-by-step instructions
          </p>

          {STEPS.map(({ platform, icon: Icon, color, steps }) => (
            <div
              key={platform}
              className="rounded-2xl border border-white/[0.06] bg-[#161210] p-5 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-[#f5f0ea]">{platform}</span>
              </div>

              <ol className="space-y-2 ml-1">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-[#f5f0ea]/55 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="rounded-xl border border-[#e8944a]/15 bg-[#e8944a]/[0.05] px-4 py-3 flex gap-2.5">
          <Share2 className="h-4 w-4 text-[#e8944a] shrink-0 mt-0.5" />
          <p className="text-xs text-[#f5f0ea]/50 leading-relaxed">
            <span className="text-[#e8944a] font-medium">First launch:</span> Your browser may ask whether
            MetBarista can find and connect to devices on your local network. Choose Allow so the shortcut
            can reach your machine.
          </p>
        </div>
      </div>
    </div>
  );
}
