"use client";

import { useState } from "react";

const BASE_URL = "https://simpleseedorganizer.com/";

const AD_VARIANTS = [
  {
    id: 1,
    slug: "stop-rebuying",
    theme: "Stop Rebuying",
    headline: "Stop Rebuying Seeds You Already Own",
    primaryText:
      "Tired of buying the same seed packets over and over? Simple Seed Organizer helps you track what you have, so you never waste money on duplicates again.\n\nJust your seed inventory on your phone. No garden planning, no calendars—just store and find your seeds when you need them.\n\nGet early access for $15/year.",
    description:
      "Simple seed inventory tracking for home gardeners. Know what you have, find it fast, use it before it expires.",
    cta: "Learn More",
    imageSuggestions: [
      "Before/after: Messy seed box vs. organized inventory",
      "Shopping scenario: Person at garden center checking phone",
      'Text overlay: "Never buy duplicates again"',
    ],
    targeting: {
      interests: [
        "Gardening",
        "Home Gardening",
        "Seed Starting",
        "Vegetable Gardening",
      ],
      demographics: "25–65, interested in gardening",
      notes: "Lookalike: Seed retailers, garden centers",
    },
  },
  {
    id: 2,
    slug: "seed-viability",
    theme: "Seed Viability",
    headline: "Know Which Seed Packets Are Still Good",
    primaryText:
      "Can't remember which seeds are still viable? Simple Seed Organizer tracks purchase dates and shows you a “use-first” list, so you plant seeds before they expire.\n\nThe simplest seed inventory tool—just store your seed info and get it back when you need it. No complex features, just what you need.\n\nGet early access for $15/year.",
    description:
      "Track seed viability and never waste old seeds. Simple inventory management for home gardeners.",
    cta: "Get Early Access",
    imageSuggestions: [
      "Expired seed packets with dates visible",
      '"Use First" list mockup',
      'Text overlay: "Use seeds before they expire"',
    ],
    targeting: {
      interests: [
        "Seed Saving",
        "Organic Gardening",
        "Sustainable Gardening",
      ],
      demographics: "30–65, experienced gardeners",
      notes: "Keywords: seed viability, seed expiration, seed storage",
    },
  },
  {
    id: 3,
    slug: "messy-box",
    theme: "Organization",
    headline: "Turn Your Messy Seed Box Into a Searchable Library",
    primaryText:
      "Your seed collection is a mess. You can't find what you need when you need it. Simple Seed Organizer turns your scattered seed packets into an organized, searchable inventory on your phone.\n\nFind any seed in seconds. Add planting depth, spacing, and notes. Know what you have, when you need it.\n\nGet early access for $15/year.",
    description:
      "Organize your seed collection. Simple, fast, mobile-first seed inventory tracking.",
    cta: "Organize My Seeds",
    imageSuggestions: [
      "Messy seed box (before)",
      "Organized app interface (after)",
      "Search functionality mockup",
      'Text overlay: "From chaos to organized"',
    ],
    targeting: {
      interests: ["Organization", "Home Organization", "Gardening"],
      demographics: "25–55, homeowners",
      notes: "Lookalike: People interested in organization apps",
    },
  },
  {
    id: 4,
    slug: "simplicity",
    theme: "Simplicity",
    headline: "Finally, a Seed App That’s Actually Simple",
    primaryText:
      "Other seed apps force you to use garden planning and calendars you don’t need. Simple Seed Organizer does one thing: helps you track your seed inventory.\n\nNo planning. No calendars. No design tools. Just store your seed info and find it when you need it—on your phone.\n\nGet early access for $15/year.",
    description: "The simplest seed inventory tool. No bloat, just what you need.",
    cta: "Try It Simple",
    imageSuggestions: [
      "Comparison: Complex app vs. simple app",
      "Clean, minimal interface mockup",
      'Text overlay: "Simplicity first"',
    ],
    targeting: {
      interests: ["Minimalism", "Simple Living", "Gardening"],
      demographics: "25–50, tech-savvy",
      notes: "Lookalike: Users of simple productivity apps",
    },
  },
  {
    id: 5,
    slug: "quick-info",
    theme: "Quick Access",
    headline: "Find Seed Info in Seconds, Not Minutes",
    primaryText:
      "Need planting depth or spacing info? Don’t dig through seed packets. Simple Seed Organizer gives you instant access to all your seed information on your phone.\n\nStore what you need: planting depth, spacing, days to maturity, notes. Find it fast when you’re ready to plant.\n\nGet early access for $15/year.",
    description:
      "Quick seed information access. Store it once, find it when you need it.",
    cta: "Get Instant Access",
    imageSuggestions: [
      "Person in garden with phone",
      "Quick search mockup",
      "Seed info display mockup",
      'Text overlay: "Info at your fingertips"',
    ],
    targeting: {
      interests: ["Vegetable Gardening", "Seed Starting", "Planting"],
      demographics: "30–60, active gardeners",
      notes: "Keywords: planting depth, seed spacing, garden planning",
    },
  },
  {
    id: 6,
    slug: "save-money",
    theme: "Save Money",
    headline: "Save Money by Using Seeds Before They Expire",
    primaryText:
      "Stop wasting money on seeds that expire unused. Simple Seed Organizer shows you which seeds to use first, so you plant them before they go bad.\n\nTrack purchase dates, see your “use-first” list, and never waste seeds again. Simple inventory tracking for smart gardeners.\n\nGet early access for $15/year.",
    description:
      "Smart seed management. Use seeds before they expire, save money, reduce waste.",
    cta: "Save My Seeds",
    imageSuggestions: [
      "Expired seed packets",
      "Money/coins visual",
      '"Use first" list mockup',
      'Text overlay: "Save money, reduce waste"',
    ],
    targeting: {
      interests: ["Frugal Living", "Sustainable Gardening", "Money Saving"],
      demographics: "25–55, cost-conscious",
      notes: "Lookalike: Budget-conscious gardeners",
    },
  },
] as const;

const AD_SETS = [
  {
    id: 1,
    name: "Meta — Gardening Interests",
    platform: "Facebook + Instagram",
    interests: ["Gardening", "Home Gardening", "Seed Starting", "Vegetable Gardening"],
    age: "25–65",
    gender: "All",
    placement: "Feed, Stories, Reels",
    budget: "$20/day",
    variants: [1, 2, 3],
  },
  {
    id: 2,
    name: "Meta — Seed Keywords",
    platform: "Facebook + Instagram",
    interests: ["Seed Saving", "Organic Gardening", "Heirloom Seeds"],
    age: "30–65",
    gender: "All",
    placement: "Feed, Stories",
    budget: "$20/day",
    variants: [2, 6, 4],
  },
  {
    id: 3,
    name: "Pinterest — Gardening",
    platform: "Pinterest",
    interests: ["Gardening", "Seed Starting", "Vegetable Gardening"],
    age: "25–65",
    gender: "All",
    placement: "Feed",
    budget: "$15/day",
    variants: [3, 5, 1],
  },
] as const;

const METRICS = [
  { label: "CTR", target: "> 2%", note: "Pause if < 1% after 2–3 days" },
  { label: "Landing conversion", target: "> 10%", note: "Visitors → form submission" },
  { label: "CPC", target: "< $1–2", note: "Cost per click" },
  { label: "Cost per signup", target: "< $10–20", note: "Optimize over time" },
];

function utmUrl(slug: string) {
  return `${BASE_URL}?utm_source=meta&utm_medium=social&utm_campaign=validation&utm_content=${slug}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function AdCampaignClient() {
  return (
    <main className="min-h-screen bg-[#f3f4f6] text-[#101828]">
      {/* Header */}
      <div className="bg-[#15472d] text-white px-6 py-5">
        <p className="text-xs uppercase tracking-widest text-green-300 mb-1">
          Admin &middot; Simple Seed Organizer
        </p>
        <h1 className="text-xl font-semibold">Ad Campaign</h1>
        <p className="text-sm text-green-200 mt-0.5">
          Validation test &middot; Meta + Pinterest &middot; $200&ndash;500 initial budget
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Campaign overview */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Platforms", value: "Meta + Pinterest" },
            { label: "Budget", value: "$200–500 total" },
            { label: "Duration", value: "1–2 weeks" },
            { label: "Price point", value: "$15/year" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-[#6a7282] mb-1">{item.label}</p>
              <p className="font-semibold text-sm">{item.value}</p>
            </div>
          ))}
        </section>

        {/* Ad variants */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Ad Variants ({AD_VARIANTS.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AD_VARIANTS.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col"
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-[#f3f4f6] text-[#4a5565] px-2 py-0.5 rounded">
                      V{v.id}
                    </span>
                    <span className="text-xs text-[#6a7282]">{v.theme}</span>
                  </div>
                  <span className="text-xs font-mono text-[#99a1af]">{v.slug}</span>
                </div>

                {/* Copy */}
                <div className="px-5 py-4 flex-1 space-y-3">
                  <p className="font-semibold text-base leading-snug">{v.headline}</p>
                  <p className="text-xs text-[#4a5565] whitespace-pre-line leading-relaxed">
                    {v.primaryText}
                  </p>
                  {v.description && (
                    <p className="text-xs text-[#6a7282] italic">{v.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-[#6a7282]">CTA:</span>
                    <span className="text-xs font-semibold bg-[#15472d] text-white px-3 py-1 rounded-full">
                      {v.cta}
                    </span>
                  </div>
                </div>

                {/* Targeting */}
                <div className="px-5 py-3 bg-[#f9fafb] border-t border-gray-100 space-y-1.5">
                  <p className="text-xs font-medium text-[#4a5565]">Targeting</p>
                  <p className="text-xs text-[#6a7282]">
                    <span className="font-medium text-[#4a5565]">Interests: </span>
                    {v.targeting.interests.join(", ")}
                  </p>
                  <p className="text-xs text-[#6a7282]">
                    <span className="font-medium text-[#4a5565]">Demo: </span>
                    {v.targeting.demographics}
                  </p>
                  <p className="text-xs text-[#6a7282]">{v.targeting.notes}</p>
                </div>

                {/* Image ideas */}
                <div className="px-5 py-3 border-t border-gray-100 space-y-1">
                  <p className="text-xs font-medium text-[#4a5565]">Creative ideas</p>
                  <ul className="space-y-0.5">
                    {v.imageSuggestions.map((s) => (
                      <li key={s} className="text-xs text-[#6a7282] flex gap-1.5">
                        <span className="text-gray-300 shrink-0">&ndash;</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* UTM URL */}
                <div className="px-5 py-3 bg-[#f0fdf4] border-t border-green-100">
                  <p className="text-xs font-medium text-[#166534] mb-1.5">UTM URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-[#15472d] break-all flex-1 leading-relaxed">
                      {utmUrl(v.slug)}
                    </code>
                    <CopyButton text={utmUrl(v.slug)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ad sets */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Ad Sets
          </h2>
          <div className="space-y-3">
            {AD_SETS.map((set) => (
              <div key={set.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{set.name}</p>
                    <p className="text-xs text-[#6a7282]">{set.platform}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#15472d]">{set.budget}</span>
                </div>
                <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <p className="text-[#99a1af] mb-0.5">Interests</p>
                    <p className="text-[#4a5565]">{set.interests.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-[#99a1af] mb-0.5">Age</p>
                    <p className="text-[#4a5565]">{set.age}</p>
                  </div>
                  <div>
                    <p className="text-[#99a1af] mb-0.5">Placement</p>
                    <p className="text-[#4a5565]">{set.placement}</p>
                  </div>
                  <div>
                    <p className="text-[#99a1af] mb-0.5">Test variants</p>
                    <p className="text-[#4a5565]">
                      {set.variants.map((n) => `V${n}`).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Metrics */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Success Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METRICS.map((m) => (
              <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-[#6a7282] mb-1">{m.label}</p>
                <p className="text-lg font-semibold text-[#15472d]">{m.target}</p>
                <p className="text-xs text-[#99a1af] mt-1">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Budget */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Budget Allocation
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#6a7282]">
                    Platform
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#6a7282]">
                    Budget
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#6a7282]">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    platform: "Meta (Facebook + Instagram)",
                    budget: "$300",
                    notes: "3 ad sets \xd7 $100 over 1 week",
                  },
                  {
                    platform: "Pinterest",
                    budget: "$100",
                    notes: "2 ad sets \xd7 $50 over 1 week",
                  },
                  {
                    platform: "Landing page hosting",
                    budget: "$0–20/mo",
                    notes: "Vercel free tier",
                  },
                ].map((row) => (
                  <tr
                    key={row.platform}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-[#101828]">
                      {row.platform}
                    </td>
                    <td className="px-5 py-3 text-[#15472d] font-semibold">
                      {row.budget}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#6a7282]">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Optimization schedule */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Optimization Schedule
          </h2>
          <div className="space-y-3">
            {[
              {
                when: "After 2–3 days",
                rules: [
                  "Pause ads with CTR < 1%",
                  "Increase budget for ads with CTR > 3%",
                  "Test new variants for low performers",
                ],
              },
              {
                when: "After 1 week",
                rules: [
                  "Double down on top 2–3 performers",
                  "Pause all low performers",
                  "Test new angles based on learnings",
                ],
              },
              {
                when: "After 2 weeks",
                rules: [
                  "Evaluate overall campaign performance",
                  "Decide: proceed to MVP launch or pivot messaging",
                  "Document learnings for future campaigns",
                ],
              },
            ].map((phase) => (
              <div
                key={phase.when}
                className="bg-white rounded-xl shadow-sm px-5 py-4 flex gap-6"
              >
                <p className="text-xs font-semibold text-[#15472d] shrink-0 w-28 pt-0.5">
                  {phase.when}
                </p>
                <ul className="space-y-1.5">
                  {phase.rules.map((rule) => (
                    <li key={rule} className="text-xs text-[#4a5565] flex gap-2">
                      <span className="text-green-500 shrink-0">✓</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Launch checklist */}
        <section className="pb-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#4a5565] mb-4">
            Launch Checklist
          </h2>
          <div className="bg-white rounded-xl shadow-sm px-5 py-4">
            <ul className="space-y-2.5">
              {[
                "Create landing page (see docs/landing-page-content.md)",
                "Set up Google Analytics + Facebook Pixel",
                "Create ad creatives (images/videos for each variant)",
                "Set up ad campaigns in Meta Ads Manager",
                "Set up Pinterest ad campaigns",
                "Launch with small daily budgets ($15–20/day per set)",
                "Monitor daily for first week — CTR, CPC, conversions",
                "Optimize after day 3 based on CTR data",
                "Evaluate after week 2 against success criteria",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-3 text-sm text-[#4a5565]"
                >
                  <span className="text-xs font-mono text-[#99a1af] shrink-0 w-4 text-right mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>
    </main>
  );
}
