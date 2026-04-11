"use client";

import { Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const DISCORD_INVITE = "https://discord.gg/w48ha2h3";
// WidgetBot: invite their bot to the server and replace SERVER_ID + CHANNEL_ID
const WIDGETBOT_SERVER = "YOUR_SERVER_ID";
const WIDGETBOT_CHANNEL = "YOUR_CHANNEL_ID";

export default function CommunityPage() {
  const hasWidget = WIDGETBOT_SERVER !== "YOUR_SERVER_ID";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" /> Community
          </h1>
          <p className="text-sm text-muted-foreground">The official (unofficial) Meticulous Discord server</p>
        </div>
        <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
          Join Discord ↗
        </a>
      </div>

      {hasWidget ? (
        <div className="rounded-xl overflow-hidden border border-border" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          <iframe
            src={`https://e.widgetbot.io/channels/${WIDGETBOT_SERVER}/${WIDGETBOT_CHANNEL}`}
            className="w-full h-full border-0"
            allow="clipboard-write; fullscreen"
            title="Meticulous Discord Community"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center space-y-4">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Discord Feed Setup Required</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              To embed the live Discord feed, invite the{" "}
              <a href="https://widgetbot.io" target="_blank" rel="noopener noreferrer" className="underline">
                WidgetBot
              </a>{" "}
              bot to the Meticulous Discord server, then update{" "}
              <code className="bg-muted px-1 rounded text-xs">WIDGETBOT_SERVER</code> and{" "}
              <code className="bg-muted px-1 rounded text-xs">WIDGETBOT_CHANNEL</code> in{" "}
              <code className="bg-muted px-1 rounded text-xs">app/community/page.tsx</code>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                Join the Discord
              </a>
              <a href="https://widgetbot.io" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                Set Up WidgetBot
              </a>
          </div>
        </div>
      )}

      {/* Community links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
            className="rounded-xl border border-border bg-card p-4 space-y-1 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <p className="font-semibold text-sm">{title} ↗</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
