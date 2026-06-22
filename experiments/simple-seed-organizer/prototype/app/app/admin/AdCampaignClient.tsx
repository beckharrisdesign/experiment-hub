"use client";

import { useState } from "react";

const BASE_URL = "https://simpleseedorganizer.app/";

const PHASES = [
  {
    id: 1,
    label: "Phase 1 — Now",
    channel: "Google Search",
    format: "Text-only RSA",
    budget: "$25–50 total",
    goal: "Binary intent signal",
    status: "launch",
  },
  {
    id: 2,
    label: "Phase 2 — If signal",
    channel: "Meta (Facebook + Instagram)",
    format: "Text + single photo",
    budget: "$50–100 total",
    goal: "Angle + audience validation",
    status: "pending",
  },
  {
    id: 3,
    label: "Phase 3 — Future",
    channel: "Meta",
    format: "Designed creatives",
    budget: "TBD",
    goal: "Scale winners",
    status: "future",
  },
];

const GOOGLE_RSA = {
  budget: "$25–50 total",
  dailyBudget: "$10–15/day",
  duration: "3–5 days — run fast, not trickled over weeks",
  matchType: "Exact and phrase only — no broad match",
  targetKeywords: [
    "[organizing seeds]",
    "[organizing seed packets]",
    '"organizing seeds"',
    '"organizing seed packets"',
  ],
  negativeKeywords: [
    "box",
    "binder",
    "cabinet",
    "kit",
    "diy",
    "ideas",
    "storage box",
    "organizer box",
  ],
  headlines: [
    { text: "Organize Seeds With an App", chars: 26 },
    { text: "Digital Seed Organizer · $15", chars: 28 },
    { text: "Seed Inventory on Your Phone", chars: 28 },
    { text: "Stop Rebuying Seeds You Own", chars: 27 },
    { text: "Know Which Seeds Are Viable", chars: 27 },
    { text: "Never Rebuy the Same Seeds", chars: 26 },
    { text: "Find Any Seed in Seconds", chars: 24 },
    { text: "Use Seeds Before They Expire", chars: 28 },
    { text: "Your Seeds, Finally Organized", chars: 29 },
    { text: "Simple Seed Organizer App", chars: 25 },
    { text: "Track Seeds, Not Spreadsheets", chars: 29 },
    { text: "Your Seeds. Searchable. Fast.", chars: 29 },
    { text: "$15/Year. No Complexity.", chars: 24 },
    { text: "Early Access · $15/Year", chars: 23 },
    { text: "Know What Seeds You Own", chars: 23 },
  ],
  descriptions: [
    "Track what you have, see which seeds to use first, never rebuy duplicates. $15/year.",
    "Mobile-first seed inventory. No garden planning, no calendars—just your seeds.",
    "Know which seeds to plant first before they expire. Simple, fast, on your phone.",
    "Searchable seed inventory app. Find any packet in seconds. Get early access today.",
  ],
  utmUrl: `${BASE_URL}?utm_source=google&utm_medium=search&utm_campaign=validation&utm_content=rsa-v1`,
  killRules: [
    {
      signal: "< 200 impressions after 4 days",
      action: "Volume too thin — move remaining budget to Meta Phase 2",
      type: "abort",
    },
    {
      signal: "0 signups from 30+ clicks",
      action: "Negative signal — revise landing page before spending more",
      type: "negative",
    },
    {
      signal: "1 signup",
      action: "Ambiguous — spend another $25 before deciding",
      type: "neutral",
    },
    {
      signal: "2+ signups",
      action: "Positive — continue and add Meta Phase 2",
      type: "positive",
    },
  ],
};

const META_VARIANTS = [
  {
    id: "A",
    slug: "stop-rebuying",
    theme: "Stop Rebuying",
    phase: "launch" as const,
    headline: "Stop Rebuying Seeds You Already Own",
    primaryText:
      "Tired of buying the same seed packets over and over?\n\nSimple Seed Organizer helps you track what you have, so you never waste money on duplicates again.\n\nJust your seed inventory on your phone. No garden planning, no calendars—just store and find your seeds when you need them.\n\nGet early access for $15/year.",
    cta: "Learn More",
    creative:
      'Single photo of your own seed packet pile (phone shot, authentic over polished). Text overlay: "Never buy duplicates again."',
  },
  {
    id: "B",
    slug: "seed-viability",
    theme: "Seed Viability",
    phase: "launch" as const,
    headline: "Know Which Seed Packets Are Still Good",
    primaryText:
      "Can't remember which seeds are still viable?\n\nSimple Seed Organizer shows you a “use-first” list so you plant seeds before they expire—not after.\n\nThe simplest seed inventory tool. Store your seed info, get it back when you need it. No complexity.\n\nGet early access for $15/year.",
    cta: "Learn More",
    creative:
      'Same base photo as Variant A. Different text overlay: "Use seeds before they expire."',
  },
  {
    id: "C",
    slug: "messy-box",
    theme: "Organization",
    phase: "backlog" as const,
    headline: "Turn Your Messy Seed Box Into a Searchable Library",
    primaryText:
      "Your seed collection is a mess. You can't find what you need when you need it.\n\nSimple Seed Organizer turns your scattered seed packets into an organized, searchable inventory on your phone.\n\nFind any seed in seconds. Add planting depth, spacing, and notes.\n\nGet early access for $15/year.",
    cta: "Organize My Seeds",
    creative: "Messy seed box (before) → clean app interface (after).",
  },
  {
    id: "D",
    slug: "simplicity",
    theme: "Simplicity",
    phase: "backlog" as const,
    headline: "Finally, a Seed App That’s Actually Simple",
    primaryText:
      "Other seed apps force you to use garden planning and calendars you don't need.\n\nSimple Seed Organizer does one thing: helps you track your seed inventory. No planning. No calendars. No bloat.\n\nGet early access for $15/year.",
    cta: "Try It Simple",
    creative: "Clean, minimal interface mockup.",
  },
  {
    id: "E",
    slug: "quick-info",
    theme: "Quick Access",
    phase: "backlog" as const,
    headline: "Find Seed Info in Seconds, Not Minutes",
    primaryText:
      "Need planting depth or spacing info? Don't dig through seed packets.\n\nSimple Seed Organizer gives you instant access to all your seed information on your phone.\n\nStore it once, find it fast. Get early access for $15/year.",
    cta: "Get Instant Access",
    creative: "Person in garden with phone. Quick search mockup.",
  },
  {
    id: "F",
    slug: "save-money",
    theme: "Save Money",
    phase: "backlog" as const,
    headline: "Save Money by Using Seeds Before They Expire",
    primaryText:
      "Stop wasting money on seeds that expire unused.\n\nSimple Seed Organizer shows you which seeds to use first, so you plant them before they go bad.\n\nTrack purchase dates, see your “use-first” list, never waste seeds again. $15/year.",
    cta: "Save My Seeds",
    creative: "Expired seed packets + use-first list mockup.",
  },
];

const META_TARGETING = {
  platform: "Facebook + Instagram",
  format:
    "Lead Gen ads (collects email inside Meta — no landing page required for first test)",
  interests: [
    "Gardening",
    "Seed Starting",
    "Vegetable Gardening",
    "Heirloom Seeds",
  ],
  age: "30–65",
  placement: "Feed only — no Reels or Stories until Phase 3",
  budget: "$10/day · 7 days · $50–100 total",
  killRules: [
    {
      signal: "CTR < 0.8% on both variants after day 4",
      action: "Pause — revise hooks",
      type: "negative",
    },
    {
      signal: "One variant clearly outperforms",
      action: "Kill loser, scale winner",
      type: "neutral",
    },
    {
      signal: "5+ signups at < $25 each",
      action: "Positive — move to Phase 3",
      type: "positive",
    },
  ],
};

const CREATIVE_SIZES = [
  {
    name: "Meta Feed (square)",
    size: "1080 × 1080",
    notes: "Primary format — Phase 2+",
  },
  {
    name: "Meta Feed (portrait)",
    size: "1080 × 1350",
    notes: "Better feed presence — Phase 2+",
  },
  { name: "Meta Stories / Reels", size: "1080 × 1920", notes: "Phase 3 only" },
  {
    name: "Meta Lead Gen card",
    size: "1200 × 628",
    notes: "In-form header image — Phase 2+",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // clipboard unavailable
        }
      }}
      className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function KillRulePill({ type }: { type: string }) {
  const styles: Record<string, string> = {
    abort: "bg-gray-100 text-gray-500",
    negative: "bg-red-50 text-red-600",
    neutral: "bg-amber-50 text-amber-700",
    positive: "bg-green-50 text-green-700",
  };
  const labels: Record<string, string> = {
    abort: "abort",
    negative: "negative",
    neutral: "ambiguous",
    positive: "positive",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

export function AdCampaignClient() {
  const [showBacklog, setShowBacklog] = useState(false);

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-[#101828]">
      {/* Header */}
      <div className="bg-[#15472d] text-white px-6 py-5">
        <p className="text-xs uppercase tracking-widest text-green-300 mb-1">
          Admin &middot; Simple Seed Organizer
        </p>
        <h1 className="text-xl font-semibold">Ad Campaign</h1>
        <p className="text-sm text-green-200 mt-0.5">
          Phase 1 · Google Search text ads · $25–50 to start
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Phase overview */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Phase Structure
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PHASES.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl p-4 shadow-sm border-2 ${
                  p.status === "launch"
                    ? "bg-white border-[#15472d]"
                    : p.status === "pending"
                      ? "bg-white border-gray-200"
                      : "bg-[#f9fafb] border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      p.status === "launch"
                        ? "text-[#15472d]"
                        : "text-[#99a1af]"
                    }`}
                  >
                    {p.status === "launch"
                      ? "▶ Launch now"
                      : p.status === "pending"
                        ? "Pending signal"
                        : "Future"}
                  </span>
                  <span className="text-xs font-semibold text-[#15472d]">
                    {p.budget}
                  </span>
                </div>
                <p className="font-semibold text-sm mb-0.5">{p.label}</p>
                <p className="text-xs text-[#6a7282]">{p.channel}</p>
                <p className="text-xs text-[#6a7282]">{p.format}</p>
                <p className="text-xs text-[#99a1af] mt-2 italic">{p.goal}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Phase 1: Google Search RSA */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565]">
            Phase 1 — Google Search RSA
          </h2>

          {/* Setup */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm">Campaign Setup</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-xs">
              {[
                { label: "Total budget", value: GOOGLE_RSA.budget },
                { label: "Daily budget", value: GOOGLE_RSA.dailyBudget },
                { label: "Duration", value: GOOGLE_RSA.duration },
                { label: "Match types", value: GOOGLE_RSA.matchType },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[#99a1af] mb-0.5">{item.label}</p>
                  <p className="text-[#4a5565] font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="font-semibold text-sm">Target Keywords</p>
                <CopyButton text={GOOGLE_RSA.targetKeywords.join("\n")} />
              </div>
              <ul className="px-5 py-4 space-y-1.5">
                {GOOGLE_RSA.targetKeywords.map((kw) => (
                  <li
                    key={kw}
                    className="text-xs font-mono text-[#15472d] bg-[#f0fdf4] px-2 py-1 rounded"
                  >
                    {kw}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="font-semibold text-sm">Negative Keywords</p>
                <CopyButton text={GOOGLE_RSA.negativeKeywords.join(", ")} />
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-1.5">
                {GOOGLE_RSA.negativeKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-xs font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded"
                  >
                    −{kw}
                  </span>
                ))}
              </div>
              <p className="px-5 pb-4 text-xs text-[#99a1af]">
                Blocks physical-product searches (box, binder, etc.) — most
                high-volume terms are physical intent.
              </p>
            </div>
          </div>

          {/* Headlines */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">RSA Headlines</p>
                <p className="text-xs text-[#6a7282]">
                  Max 30 chars · Use all 15 slots · Lead with app/phone intent
                </p>
              </div>
              <CopyButton
                text={GOOGLE_RSA.headlines.map((h) => h.text).join("\n")}
              />
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {GOOGLE_RSA.headlines.map((h, i) => (
                <div key={h.text} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#99a1af] w-4 shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#101828] flex-1">
                    {h.text}
                  </span>
                  <span
                    className={`text-[10px] font-mono shrink-0 ${h.chars <= 30 ? "text-[#99a1af]" : "text-red-500 font-bold"}`}
                  >
                    {h.chars}/30
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">RSA Descriptions</p>
                <p className="text-xs text-[#6a7282]">
                  Max 90 chars · Use all 4 slots
                </p>
              </div>
              <CopyButton text={GOOGLE_RSA.descriptions.join("\n")} />
            </div>
            <div className="px-5 py-4 space-y-2">
              {GOOGLE_RSA.descriptions.map((d, i) => (
                <div key={d} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-[#99a1af] w-4 shrink-0 pt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#101828] flex-1">{d}</span>
                  <span className="text-[10px] font-mono text-[#99a1af] shrink-0">
                    {d.length}/90
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* UTM URL */}
          <div className="bg-[#f0fdf4] rounded-xl px-5 py-4 flex items-start gap-3 border border-green-100">
            <p className="text-xs font-medium text-[#166534] shrink-0 pt-0.5">
              Final URL
            </p>
            <code className="text-xs text-[#15472d] break-all flex-1">
              {GOOGLE_RSA.utmUrl}
            </code>
            <CopyButton text={GOOGLE_RSA.utmUrl} />
          </div>

          {/* Kill / continue rules */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm">Kill / Continue Rules</p>
            </div>
            <div className="divide-y divide-gray-50">
              {GOOGLE_RSA.killRules.map((rule) => (
                <div
                  key={rule.signal}
                  className="px-5 py-3 flex items-start gap-3"
                >
                  <KillRulePill type={rule.type} />
                  <div className="flex-1 text-xs">
                    <span className="font-medium text-[#101828]">
                      {rule.signal}
                    </span>
                    <span className="text-[#6a7282]"> → {rule.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Phase 2: Meta */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565]">
              Phase 2 — Meta Lead Gen
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
              Launch when Phase 1 shows signal
            </span>
          </div>

          {/* Targeting */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm">Ad Set</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-xs">
              <div>
                <p className="text-[#99a1af] mb-0.5">Platform</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.platform}
                </p>
              </div>
              <div>
                <p className="text-[#99a1af] mb-0.5">Format</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.format}
                </p>
              </div>
              <div>
                <p className="text-[#99a1af] mb-0.5">Budget</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.budget}
                </p>
              </div>
              <div>
                <p className="text-[#99a1af] mb-0.5">Age</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.age}
                </p>
              </div>
              <div>
                <p className="text-[#99a1af] mb-0.5">Placement</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.placement}
                </p>
              </div>
              <div>
                <p className="text-[#99a1af] mb-0.5">Interests</p>
                <p className="text-[#4a5565] font-medium">
                  {META_TARGETING.interests.join(", ")}
                </p>
              </div>
            </div>
          </div>

          {/* Launch variants A + B */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {META_VARIANTS.filter((v) => v.phase === "launch").map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border-2 border-[#15472d]"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-[#15472d] text-white px-2 py-0.5 rounded">
                      Variant {v.id}
                    </span>
                    <span className="text-xs text-[#6a7282]">{v.theme}</span>
                  </div>
                  <span className="text-xs text-[#15472d] font-semibold uppercase tracking-wide">
                    Launch
                  </span>
                </div>

                <div className="px-5 py-4 flex-1 space-y-3">
                  <p className="font-semibold text-base leading-snug">
                    {v.headline}
                  </p>
                  <p className="text-xs text-[#4a5565] whitespace-pre-line leading-relaxed">
                    {v.primaryText}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-[#6a7282]">CTA:</span>
                    <span className="text-xs font-semibold bg-[#15472d] text-white px-3 py-1 rounded-full">
                      {v.cta}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 bg-[#f9fafb] border-t border-gray-100">
                  <p className="text-xs font-medium text-[#4a5565] mb-1">
                    Creative
                  </p>
                  <p className="text-xs text-[#6a7282]">{v.creative}</p>
                </div>

                <div className="px-5 py-3 bg-[#f0fdf4] border-t border-green-100 flex items-start gap-2">
                  <span className="text-xs font-medium text-[#166534] shrink-0 pt-0.5">
                    UTM
                  </span>
                  <code className="text-xs text-[#15472d] break-all flex-1">
                    {`${BASE_URL}?utm_source=meta&utm_medium=social&utm_campaign=validation&utm_content=${v.slug}`}
                  </code>
                  <CopyButton
                    text={`${BASE_URL}?utm_source=meta&utm_medium=social&utm_campaign=validation&utm_content=${v.slug}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Kill / continue */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm">Kill / Continue Rules</p>
            </div>
            <div className="divide-y divide-gray-50">
              {META_TARGETING.killRules.map((rule) => (
                <div
                  key={rule.signal}
                  className="px-5 py-3 flex items-start gap-3"
                >
                  <KillRulePill type={rule.type} />
                  <div className="flex-1 text-xs">
                    <span className="font-medium text-[#101828]">
                      {rule.signal}
                    </span>
                    <span className="text-[#6a7282]"> → {rule.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Phase 3: Creative sizes */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565]">
              Phase 3 — Creative Sizes
            </h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">
              Build after a winning angle is confirmed
            </span>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[#99a1af] font-medium">
                    Format
                  </th>
                  <th className="text-left px-5 py-3 text-[#99a1af] font-medium">
                    Size (px)
                  </th>
                  <th className="text-left px-5 py-3 text-[#99a1af] font-medium">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {CREATIVE_SIZES.map((fmt) => (
                  <tr
                    key={fmt.name}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-[#101828]">
                      {fmt.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-[#15472d]">
                      {fmt.size}
                    </td>
                    <td className="px-5 py-3 text-[#6a7282]">{fmt.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Backlog variants */}
        <section className="pb-10">
          <button
            type="button"
            onClick={() => setShowBacklog((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#99a1af] hover:text-[#4a5565] transition-colors mb-4"
          >
            <span>{showBacklog ? "▾" : "▸"}</span>
            Backlog Variants (C–F) — Phase 3+
          </button>

          {showBacklog && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {META_VARIANTS.filter((v) => v.phase === "backlog").map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden opacity-70 flex flex-col"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-[#f3f4f6] text-[#4a5565] px-2 py-0.5 rounded">
                        Variant {v.id}
                      </span>
                      <span className="text-xs text-[#6a7282]">{v.theme}</span>
                    </div>
                    <span className="text-xs text-[#99a1af]">Backlog</span>
                  </div>
                  <div className="px-5 py-4 flex-1 space-y-2">
                    <p className="font-semibold text-sm leading-snug">
                      {v.headline}
                    </p>
                    <p className="text-xs text-[#4a5565] whitespace-pre-line leading-relaxed">
                      {v.primaryText}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-[#6a7282]">CTA:</span>
                      <span className="text-xs font-medium border border-gray-200 text-[#4a5565] px-3 py-1 rounded-full">
                        {v.cta}
                      </span>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-[#f9fafb] border-t border-gray-100">
                    <p className="text-xs text-[#6a7282]">{v.creative}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
