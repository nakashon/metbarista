"use client";

import { Users, ExternalLink } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/w48ha2h3";
// WidgetBot: invite their bot to the server and replace SERVER_ID + CHANNEL_ID
const WIDGETBOT_SERVER = "YOUR_SERVER_ID";
const WIDGETBOT_CHANNEL = "YOUR_CHANNEL_ID";

export default function CommunityPage() {
  const hasWidget = WIDGETBOT_SERVER !== "YOUR_SERVER_ID";

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f0ea] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#e8944a]" /> Community
            </h1>
            <p className="text-sm text-[#f5f0ea]/50 mt-1">The official (unofficial) Meticulous Discord server</p>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#5865F2] text-white hover:bg-[#6875f5] rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center gap-2 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Join Discord
          </a>
        </div>

        {/* Widget or placeholder */}
        {hasWidget ? (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
            <iframe
              src={`https://e.widgetbot.io/channels/${WIDGETBOT_SERVER}/${WIDGETBOT_CHANNEL}`}
              className="w-full h-full border-0"
              allow="clipboard-write; fullscreen"
              title="Meticulous Discord Community"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#161210] p-16 text-center space-y-5">
            <Users className="h-12 w-12 text-[#e8944a]/40 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-[#f5f0ea] text-lg font-semibold">Discord Feed Setup Required</h2>
              <p className="text-[#f5f0ea]/40 text-sm max-w-md mx-auto leading-relaxed">
                To embed the live Discord feed, invite the{" "}
                <a href="https://widgetbot.io" target="_blank" rel="noopener noreferrer" className="text-[#e8944a] hover:text-[#f5a855] transition-colors underline underline-offset-2">
                  WidgetBot
                </a>{" "}
                bot to the Meticulous Discord server, then update{" "}
                <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs text-[#f5f0ea]/60">WIDGETBOT_SERVER</code> and{" "}
                <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs text-[#f5f0ea]/60">WIDGETBOT_CHANNEL</code> in{" "}
                <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs text-[#f5f0ea]/60">app/community/page.tsx</code>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#5865F2] text-white hover:bg-[#6875f5] rounded-xl px-5 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Join the Discord
              </a>
              <a
                href="https://widgetbot.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] px-5 py-2.5 text-sm font-medium text-[#f5f0ea]/60 hover:text-[#f5f0ea] hover:bg-white/[0.04] transition-all"
              >
                Set Up WidgetBot
              </a>
            </div>
          </div>
        )}

        {/* Ecosystem links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { title: "metprofiles.link", desc: "Community-submitted profiles you can load to your machine", href: "https://metprofiles.link" },
            { title: "MeticAI", desc: "AI barista: snap a coffee bag photo, get a dialled-in profile", href: "https://github.com/hessius/MeticAI" },
            { title: "MeticulousHome", desc: "Official open-source repos: backend, firmware, API clients", href: "https://github.com/MeticulousHome" },
          ].map(({ title, desc, href }) => (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#161210] p-4 hover:border-white/[0.12] hover:bg-[#1e1b16] transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f5f0ea] group-hover:text-[#e8944a] transition-colors">{title}</p>
                <p className="text-xs text-[#f5f0ea]/40 mt-1 leading-relaxed">{desc}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-[#f5f0ea]/20 group-hover:text-[#e8944a] transition-colors shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
