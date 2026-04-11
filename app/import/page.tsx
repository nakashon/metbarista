"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, ArrowRight, Coffee } from "lucide-react";
import { loadProfileInline } from "@/lib/machine-api";
import { getSavedIp } from "@/lib/connection-store";
import type { Profile } from "@/lib/types";

type Step = "input" | "preview" | "loading" | "done" | "error";

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [raw, setRaw] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [parseError, setParseError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function parseJson(text: string) {
    setParseError("");
    try {
      const parsed = JSON.parse(text);
      // Accept either a bare profile or wrapped { profile: {...} }
      const p: Profile = parsed.profile ?? parsed;
      if (!p.name || !p.stages) throw new Error("Missing required fields (name, stages)");
      setProfile(p);
      setStep("preview");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRaw(text);
      parseJson(text);
    };
    reader.readAsText(file);
  }

  function handlePaste() {
    parseJson(raw);
  }

  async function handleLoad() {
    if (!profile) return;
    if (!getSavedIp()) {
      setErrorMsg("No machine connected. Connect your machine first.");
      setStep("error");
      return;
    }
    setStep("loading");
    try {
      await loadProfileInline(profile);
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load profile");
      setStep("error");
    }
  }

  const stageColors: Record<string, string> = {
    pressure: "#60a5fa",
    flow: "#22d3ee",
    power: "#f87171",
  };

  return (
    <div className="min-h-screen bg-[#0c0a09]">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0ea]">Import Profile</h1>
          <p className="text-sm text-[#f5f0ea]/40 mt-1">
            Paste or upload an OEPF JSON profile — from{" "}
            <a href="https://metprofiles.link" target="_blank" rel="noopener noreferrer"
              className="text-[#e8944a] hover:text-[#f5a855] transition-colors underline-offset-2 underline">
              metprofiles.link
            </a>
            , GitHub, or anywhere.
          </p>
        </div>

        {/* How to get JSON from metprofiles.link */}
        {step === "input" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#161210] p-4 space-y-2">
            <p className="text-xs font-semibold text-[#f5f0ea]/30 uppercase tracking-widest">
              How to import from metprofiles.link
            </p>
            <ol className="text-sm text-[#f5f0ea]/50 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Open any profile on <a href="https://metprofiles.link" target="_blank" rel="noopener noreferrer" className="text-[#e8944a]">metprofiles.link</a></li>
              <li>Click the <strong className="text-[#f5f0ea]/70">Download JSON</strong> button on the profile page</li>
              <li>Drag the file below <span className="text-[#f5f0ea]/30">or</span> paste the JSON content</li>
            </ol>
          </div>
        )}

        {/* Input area */}
        {step === "input" && (
          <div className="space-y-3">
            {/* Drag / click upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-white/[0.08] bg-[#161210] hover:border-[#e8944a]/30 hover:bg-[#1e1b16] transition-all p-10 flex flex-col items-center gap-3 text-center group"
            >
              <div className="h-12 w-12 rounded-2xl bg-[#e8944a]/10 flex items-center justify-center group-hover:bg-[#e8944a]/15 transition-colors">
                <Upload className="h-5 w-5 text-[#e8944a]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#f5f0ea]/60 group-hover:text-[#f5f0ea]/80 transition-colors">
                  Drop .json file here or click to browse
                </p>
                <p className="text-xs text-[#f5f0ea]/25 mt-0.5">OEPF JSON format</p>
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json"
              onChange={handleFileChange} className="hidden" />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs text-[#f5f0ea]/25">or paste JSON</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Paste textarea */}
            <div className="space-y-2">
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={'{\n  "name": "My Profile",\n  "stages": [...]\n}'}
                rows={8}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161210] px-4 py-3 text-sm font-mono text-[#f5f0ea]/70 placeholder:text-[#f5f0ea]/20 focus:outline-none focus:border-[#e8944a]/30 resize-none"
              />
              {parseError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {parseError}
                </p>
              )}
              <button
                onClick={handlePaste}
                disabled={!raw.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e8944a] px-5 py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileJson className="h-4 w-4" /> Parse Profile
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && profile && (
          <div className="space-y-4">
            {/* Profile card preview */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#161210] overflow-hidden">
              {profile.display?.accentColor && (
                <div className="h-[3px]" style={{ backgroundColor: profile.display.accentColor }} />
              )}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#f5f0ea]">{profile.name}</h2>
                    {profile.author && (
                      <p className="text-xs text-[#f5f0ea]/35 mt-0.5">by {profile.author}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-mono text-[#f5f0ea]/50 shrink-0">
                    <span>{profile.temperature}°C</span>
                    <span>{profile.final_weight}g</span>
                  </div>
                </div>

                {profile.display?.shortDescription && (
                  <p className="text-sm text-[#f5f0ea]/45 leading-relaxed">
                    {profile.display.shortDescription}
                  </p>
                )}

                {/* Stages */}
                {profile.stages?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#f5f0ea]/25 uppercase tracking-widest mb-2">Stages</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.stages.map((s, i) => (
                        <span key={i}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                          style={{
                            color: stageColors[s.type] ?? "#f5f0ea",
                            borderColor: `${stageColors[s.type] ?? "#f5f0ea"}30`,
                            backgroundColor: `${stageColors[s.type] ?? "#f5f0ea"}10`,
                          }}
                        >
                          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: stageColors[s.type] ?? "#f5f0ea" }} />
                          {s.name} ({s.type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoad}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e8944a] px-6 py-3 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all shadow-[0_0_20px_rgba(232,148,74,0.2)]"
              >
                <Coffee className="h-4 w-4" /> Load to Machine
              </button>
              <button
                onClick={() => { setStep("input"); setProfile(null); setRaw(""); }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] px-5 py-3 text-sm font-medium text-[#f5f0ea]/50 hover:text-[#f5f0ea]/80 hover:bg-white/[0.04] transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#e8944a]" />
            <p className="text-sm text-[#f5f0ea]/50">Loading profile to machine…</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-[#4ade80]/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-[#4ade80]" />
            </div>
            <div>
              <p className="font-semibold text-[#f5f0ea]">
                &ldquo;{profile?.name}&rdquo; loaded
              </p>
              <p className="text-sm text-[#f5f0ea]/40 mt-1">Profile is now active on your machine</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e8944a] px-5 py-2.5 text-sm font-semibold text-[#0c0a09] hover:bg-[#f5a855] transition-all"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setStep("input"); setProfile(null); setRaw(""); }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#f5f0ea]/50 hover:text-[#f5f0ea]/80 hover:bg-white/[0.04] transition-all"
              >
                Import another
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-[#f5f0ea]">Failed to load</p>
              <p className="text-sm text-[#f5f0ea]/40 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={() => setStep("preview")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] px-5 py-2.5 text-sm font-medium text-[#f5f0ea]/50 hover:text-[#f5f0ea]/80 hover:bg-white/[0.04] transition-all"
            >
              Try again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
