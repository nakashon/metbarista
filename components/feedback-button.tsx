"use client";
import { useState, useEffect } from "react";
import { MessageSquarePlus, X, Send, Loader2, CheckCircle } from "lucide-react";
import { getSavedIp } from "@/lib/connection-store";
import { getMachineInfo } from "@/lib/machine-api";
import { usePathname } from "next/navigation";

const GH_TOKEN = process.env.NEXT_PUBLIC_FEEDBACK_TOKEN ?? "";
const GH_REPO  = "nakashon/metbarista";

type FeedbackType = "bug" | "feature-request" | "ux" | "other";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug",             label: "🐛 Bug" },
  { value: "feature-request", label: "✨ Feature idea" },
  { value: "ux",              label: "🎨 Design / UX" },
  { value: "other",           label: "💬 Other" },
];

export function FeedbackButton() {
  const [open, setOpen]           = useState(false);
  const [connected, setConnected] = useState(false);
  const [serial, setSerial]       = useState("");
  const [name, setName]           = useState("");
  const [type, setType]           = useState<FeedbackType>("feature-request");
  const [text, setText]           = useState("");
  const [status, setStatus]       = useState<"idle"|"sending"|"done"|"error">("idle");
  const pathname = usePathname();

  useEffect(() => {
    const ip = getSavedIp();
    if (!ip) return;
    setConnected(true);
    getMachineInfo().then(info => setSerial(info.serial ?? "")).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!text.trim()) return;
    setStatus("sending");
    const body = [
      `**Submitted via:** metbarista in-app feedback`,
      `**Page:** \`${pathname}\``,
      `**Machine Serial:** \`${serial || "unknown"}\``,
      `**User Name:** ${name.trim() || "_anonymous_"}`,
      `**Type:** ${type}`,
      `---`,
      `**Feedback:**`,
      text.trim(),
    ].join("\n\n");

    try {
      const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          title: `[${type}] ${text.trim().slice(0, 72)}`,
          body,
          labels: ["feedback", type],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("done");
      setTimeout(() => { setOpen(false); setStatus("idle"); setText(""); setName(""); }, 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!connected) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        className="fixed bottom-[104px] right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 rounded-full border border-white/[0.10] bg-[#161210]/90 backdrop-blur-sm px-3.5 py-2 text-xs font-medium text-[#f5f0ea]/40 hover:text-[#e8944a] hover:border-[#e8944a]/30 hover:bg-[#1e1b16] transition-all shadow-lg"
      >
        <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#161210] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-sm font-semibold text-[#f5f0ea]">Share feedback</p>
                <p className="text-xs text-[#f5f0ea]/35 mt-0.5">Goes straight to our GitHub — we read everything</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#f5f0ea]/30 hover:text-[#f5f0ea]/60 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium text-left transition-all ${
                      type === t.value
                        ? "bg-[#e8944a]/15 border border-[#e8944a]/30 text-[#e8944a]"
                        : "border border-white/[0.07] text-[#f5f0ea]/40 hover:text-[#f5f0ea]/70"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="What's on your mind?" rows={4}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-[#f5f0ea] placeholder:text-[#f5f0ea]/25 focus:outline-none focus:border-[#e8944a]/40 resize-none" />

              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-[#f5f0ea] placeholder:text-[#f5f0ea]/25 focus:outline-none focus:border-[#e8944a]/40" />

              {serial && (
                <p className="text-[11px] text-[#f5f0ea]/25">
                  Machine serial <span className="font-mono text-[#f5f0ea]/40">{serial}</span> will be attached
                </p>
              )}

              <button onClick={handleSubmit}
                disabled={!text.trim() || status === "sending" || status === "done" || !GH_TOKEN}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e8944a] py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all disabled:opacity-40">
                {status === "sending" && <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>}
                {status === "done"    && <><CheckCircle className="h-4 w-4" />Sent! Thanks 🙏</>}
                {status === "error"   && "Failed — try again"}
                {status === "idle"    && <><Send className="h-4 w-4" />Send feedback</>}
              </button>

              {!GH_TOKEN && (
                <p className="text-[11px] text-[#f5f0ea]/25 text-center">Set NEXT_PUBLIC_FEEDBACK_TOKEN to enable</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
