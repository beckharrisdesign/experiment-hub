# Explore — Pomodoro Maker

<!--
  Stores: Soul, Goals, and founder pattern files are pending (docs/founder/*).
  Scoring rubric: rules/scoring-criteria.mdc
  Edit any section in any phase — no "complete" checkbox.
-->

## Hypothesis

Solo makers and neurodivergent knowledge workers will adopt a **minimal, joyful Pomodoro timer** that lets them define work/break rhythms and session rituals in under a minute—if the first session feels calmer and more intentional than generic timer apps, retention will justify a small paid tier or tip jar within 90 days of launch.

## Why this matters

### Personal

_[Founder: replace with your lived-experience driver — why you, why now.]_

Placeholder: Pomodoro blocks are already part of how you protect deep work; existing apps feel noisy, gamified, or subscription-heavy. You want something you would open every workday without friction.

### Strategic

**Pending your confirmation** — which Soul theme does Pomodoro Maker serve?

- **Neurodiversity** (focus, ADHD-friendly rituals, reduced shame around breaks) — _draft assumption_
- **Makers** (shop/studio rhythm, batch work sessions)
- **Environment** (unlikely primary fit)
- **Other:** \_\_\_
- **Intentionally blank — personal-only experiment**

## Who it's for

**Primary user:** Solo founder or indie maker who already uses time-boxing informally and wants a dedicated timer—not a full task manager.

**Not proxy mode** unless you are building for a named person other than yourself.

## What it does

- Start/pause/reset work and break intervals with clear visual state
- Preset and custom Pomodoro lengths (work, short break, long break, cycles)
- Optional gentle session cues (sound or visual only—no social feed)
- Save one or two rhythm presets locally (v1)
- Runs in browser first; feels fast on desktop and mobile web

## What it does NOT do

- Full task/project management, calendars, or Notion-style databases
- Team workspaces, manager dashboards, or employer analytics
- Gamification streaks, leaderboards, or guilt-based notifications
- Native iOS/Android apps in v1 (web only)
- AI coaching, habit science courses, or content subscriptions in v1
- Integrations beyond optional simple export of session counts (deferred)

## Existing options

| Product                | Price / model   | Strength            | Limitation vs. hypothesis           |
| ---------------------- | --------------- | ------------------- | ----------------------------------- |
| **Forest**             | Freemium / paid | Delight, habit loop | Gamification; not rhythm-first      |
| **Focus To-Do**        | Freemium        | Tasks + Pomodoro    | Scope creep; busy UI                |
| **Be Focused** (macOS) | Free / tip      | Simple intervals    | Apple-centric; dated UX             |
| **Pomofocus**          | Free / donate   | Clean web timer     | Limited “maker” identity / presets  |
| **Physical timer**     | One-time        | Zero subscription   | No presets, no ritual customization |

## Market analysis

- **TAM:** Global productivity / focus-app market is large ($B+), but indie timer slice is fragmented and hard to size precisely → treat as **adjacent**, not venture-scale TAM.
- **SAM:** English-speaking solo professionals and makers willing to try a new web timer → rough **$10M–$100M** addressable if SEO + word-of-mouth work (model-based, not validated).
- **Signals:** Persistent Pomodoro mindshare; fatigue with bloated productivity suites; willingness to pay small amounts for calm tools (donationware analogs exist).
- **Unknowns:** Conversion to paid, SEO difficulty, differentiation vs. Pomofocus-like clones.

## Final scorecard

| Dim                           | Score     | Reasoning                                                                  |
| ----------------------------- | --------- | -------------------------------------------------------------------------- |
| B — Business Opportunity      | 2/5       | Crowded category; path to meaningful revenue unclear without a sharp wedge |
| P — Personal / Mission Impact | 4/5       | High if you are the daily user; weak if you would not use it yourself      |
| C — Competitive Advantage     | 3/5       | Possible via calm UX + maker/neurodiversity positioning; not a moat yet    |
| $ — Platform Cost             | 5/5       | Solo web MVP with AI tools in &lt;1 month; minimal infra                   |
| S — Social Impact             | 4/5       | Helps sustainable focus habits; aligns with neurodiversity-friendly work   |
| **Total**                     | **18/25** |                                                                            |

**Score shape:** **Mission-driven** (moderate total, high P and S, modest B, strong $)

## Permutations

### Permutation A: Calm Web Timer (v1)

- **What changes:** Browser-only; one-page timer, 2 presets, optional sound; no accounts in v1
- **Projected scorecard:** B:2 P:4 C:3 $:5 S:4 = 18/25, shape: Mission-driven
- **Trade-offs:** Fastest validation; weakest monetization story
- **Verdict:** **chosen**
- **Reasoning:** Best fit for schema test and solo build; proves daily-use hypothesis before scope creep

### Permutation B: “Maker Studio” Ritual Pack

- **What changes:** Themed sessions (shop noise, break checklists), printable session cards, light branding
- **Projected scorecard:** B:3 P:5 C:3 $:4 S:4 = 19/25, shape: Mission-driven
- **Trade-offs:** More differentiation; +2–4 weeks design/content work
- **Verdict:** rejected (for v1)
- **Reasoning:** Defer until A shows daily use; avoid building content before habit proof

### Permutation C: Mobile-First + Widget

- **What changes:** PWA + home-screen widget; push nudges for break start/end
- **Projected scorecard:** B:3 P:4 C:2 $:3 S:3 = 15/25, shape: Cheap-and-useful tilt
- **Trade-offs:** Platform complexity; app-store dynamics
- **Verdict:** rejected (for v1)
- **Reasoning:** Platform cost and competition rise; web-first keeps $ at 5
