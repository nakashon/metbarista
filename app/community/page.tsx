"use client";

import { ExternalLink, MessageSquare, Coffee, GitBranch } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/w48ha2h3";

const ECOSYSTEM = [
  {
    title: "metprofiles.link",
    desc: "Community-submitted profiles you can browse and load to your machine",
    href: "https://metprofiles.link",
    icon: Coffee,
  },
  {
    title: "MeticAI",
    desc: "AI barista — snap a coffee bag photo, get a dialled-in profile",
    href: "https://github.com/hessius/MeticAI",
    icon: GitBranch,
  },
  {
    title: "MeticulousHome",
    desc: "Official open-source repos: backend, firmware, API clients",
    href: "https://github.com/MeticulousHome",
    icon: GitBranch,
  },
];

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">

        {/* Discord card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#161210] overflow-hidden">
          <div className="h-[3px] bg-[#5865F2]" />
          <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-[#5865F2]/15 flex items-center justify-center shrink-0">
              <MessageSquare className="h-6 w-6 text-[#5865F2]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#f5f0ea]">Meticulous Discord</h2>
              <p className="text-sm text-[#f5f0ea]/45 mt-1 leading-relaxed">
                The official (unofficial) community server. Dial-in tips, firmware news,
                profile sharing, and the people who build the machine.
              </p>
            </div>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6875f5] transition-all shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Join
            </a>
          </div>
        </div>

        {/* Ecosystem */}
        <div>
          <h2 className="text-xs font-semibold text-[#f5f0ea]/30 uppercase tracking-widest mb-4">
            Ecosystem
          </h2>
          <div className="space-y-2">
            {ECOSYSTEM.map(({ title, desc, href, icon: Icon }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-[#161210] px-5 py-4 hover:border-white/[0.12] hover:bg-[#1e1b16] transition-all"
              >
                <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[#f5f0ea]/40 group-hover:text-[#e8944a] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f5f0ea] group-hover:text-[#e8944a] transition-colors">{title}</p>
                  <p className="text-xs text-[#f5f0ea]/35 mt-0.5">{desc}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[#f5f0ea]/15 group-hover:text-[#e8944a] transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
