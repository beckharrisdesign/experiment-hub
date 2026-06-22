# Ad Campaign Content - Simple Seed Organizer

## Phase Structure

| Phase | Channel | Format | Budget | Goal |
|-------|---------|--------|--------|------|
| **1 (now)** | Google Search | Text-only RSA | $25–50 | Binary intent signal |
| **2 (if signal)** | Meta | Text + single photo | $50–100 | Angle + audience validation |
| **3 (future)** | Meta + Pinterest | Designed creatives | TBD | Scale winners |

---

## Phase 1 — Google Search Text Ads (launch now)

**Why Google first**: catches people mid-search for exactly this thing. High intent, no creative production needed.

**Budget**: $25–50 total · $10–15/day · run 3–5 days fast, not trickled over weeks  
**Format**: Responsive Search Ad (RSA) — Google mixes and matches headlines/descriptions, reports winners  
**Match types**: Exact and phrase only — do not use broad match or you'll burn budget on irrelevant gardening traffic

### Keywords

Keyword research shows most volume is physical-product intent ("box", "binder"). Focus on the two terms where app intent is plausible, and use negative keywords to filter the rest.

**Target keywords (exact + phrase match only)**
```
[organizing seeds]
[organizing seed packets]
"organizing seeds"
"organizing seed packets"
```

**Negative keywords — add these to block physical-product searches**
```
box
binder
cabinet
kit
diy
ideas
storage box
organizer box
```

> Note: "seed organizer app", "seed inventory app", etc. show near-zero search volume — confirmed not worth bidding on. If impressions on the above are < 200 after 4 days, the search channel isn't viable and budget moves to Meta.

### RSA Headlines (max 30 chars — use all 15 slots)

Lead with "app" or "on your phone" to immediately self-select for digital intent — most searchers expect physical products.

```
Organize Seeds With an App
Digital Seed Organizer · $15
Seed Inventory on Your Phone
Stop Rebuying Seeds You Own
Know Which Seeds Are Viable
Never Rebuy the Same Seeds
Find Any Seed in Seconds
Use Seeds Before They Expire
Your Seeds, Finally Organized
Simple Seed Organizer App
Track Seeds, Not Spreadsheets
Your Seeds. Searchable. Fast.
$15/Year. No Complexity.
Early Access · $15/Year
Know What Seeds You Own
```

### RSA Descriptions (max 90 chars — use all 4 slots)

```
Track what you have, see which seeds to use first, never rebuy duplicates. $15/year.
Mobile-first seed inventory. No garden planning, no calendars—just your seeds.
Know which seeds to plant first before they expire. Simple, fast, on your phone.
Searchable seed inventory app. Find any packet in seconds. Get early access today.
```

### Final URL

```
https://simpleseedorganizer.app/?utm_source=google&utm_medium=search&utm_campaign=validation&utm_content=rsa-v1
```

### Kill / continue rules

| Signal | Action |
|--------|--------|
| < 200 impressions after 4 days | Volume too thin — move remaining budget to Meta Phase 2 |
| 0 signups from 30+ clicks | Negative signal — revise landing page before spending more |
| 2+ signups | Positive — continue and add Meta Phase 2 |
| 1 signup | Ambiguous — spend another $25 before deciding |

---

## Phase 2 — Meta Text + Photo Ads

**Why text-first on Meta too**: one authentic photo of a real seed packet pile (your own, phone shot) + text overlay. No production needed.  
**Format**: Lead Gen ads (collects email inside Meta — no landing page required for first test)  
**Budget**: $50–100 total · $10/day · 7 days

### Ad Set

- Platform: Facebook + Instagram feed
- Interests: Gardening, Seed Starting, Vegetable Gardening, Heirloom Seeds
- Age: 30–65
- Placement: Feed only (no Reels/Stories until Phase 3)

### Variant A — "Stop Rebuying Seeds"

**Headline**
```
Stop Rebuying Seeds You Already Own
```

**Primary Text**
```
Tired of buying the same seed packets over and over?

Simple Seed Organizer helps you track what you have, so you never waste money on duplicates again.

Just your seed inventory on your phone. No garden planning, no calendars—just store and find your seeds when you need them.

Get early access for $15/year.
```

**CTA**: Get Quote (Lead Gen) or Learn More (Traffic)

**Creative**: single photo, seed packets piled in a box or spread on a table — phone shot, authentic over polished. Add text overlay: *"Never buy duplicates again."*

---

### Variant B — "Know Which Seeds Are Still Good"

**Headline**
```
Know Which Seed Packets Are Still Good
```

**Primary Text**
```
Can't remember which seeds are still viable?

Simple Seed Organizer shows you a "use-first" list so you plant seeds before they expire—not after.

The simplest seed inventory tool. Store your seed info, get it back when you need it. No complexity.

Get early access for $15/year.
```

**CTA**: Get Quote (Lead Gen) or Learn More (Traffic)

**Creative**: same base photo — different text overlay: *"Use seeds before they expire."*

### Kill / continue rules

| Signal | Action |
|--------|--------|
| CTR < 0.8% on both after day 4 | Pause, revise hooks |
| 5+ signups at < $25 each | Positive — move to Phase 3 |
| One variant clearly outperforms | Kill loser, scale winner |

---

## Phase 3 — Designed Creatives (Figma frames)

> Build these once Phase 1 or 2 shows a winning angle. Do not invest in production creative before that.

Stub Figma frames at exact platform specs, with winning copy placed in each:

| Format | Size | Notes |
|--------|------|-------|
| Meta Feed square | 1080 × 1080 | Primary format |
| Meta Feed portrait | 1080 × 1350 | Better feed presence |
| Meta Stories / Reels | 1080 × 1920 | Phase 3 only |
| Pinterest Promoted Pin | 1000 × 1500 | After Meta validates |
| Meta Lead Gen card | 1200 × 628 | In-form header image |

Each frame: stub in the winning headline, primary text placement, CTA. Ready to hand to a designer or iterate in Figma Make.

---

## Backlog Ad Variants (Phase 3+)

These angles are valid but secondary — test only after a primary hook is validated.

### Variant C — "Turn Messy Seed Box Into Library"

**Headline**: `Turn Your Messy Seed Box Into a Searchable Library`

**Primary Text**
```
Your seed collection is a mess. You can't find what you need when you need it.

Simple Seed Organizer turns your scattered seed packets into an organized, searchable inventory on your phone.

Find any seed in seconds. Add planting depth, spacing, and notes. Know what you have, when you need it.

Get early access for $15/year.
```

---

### Variant D — "Simple, Not Complex"

**Headline**: `Finally, a Seed App That's Actually Simple`

**Primary Text**
```
Other seed apps force you to use garden planning and calendars you don't need.

Simple Seed Organizer does one thing: helps you track your seed inventory. No planning. No calendars. No bloat.

Get early access for $15/year.
```

---

### Variant E — "Quick Info When Planting"

**Headline**: `Find Seed Info in Seconds, Not Minutes`

**Primary Text**
```
Need planting depth or spacing info? Don't dig through seed packets.

Simple Seed Organizer gives you instant access to all your seed information on your phone.

Store it once, find it fast. Get early access for $15/year.
```

---

### Variant F — "Save Money, Save Seeds"

**Headline**: `Save Money by Using Seeds Before They Expire`

**Primary Text**
```
Stop wasting money on seeds that expire unused.

Simple Seed Organizer shows you which seeds to use first, so you plant them before they go bad.

Track purchase dates, see your "use-first" list, never waste seeds again. $15/year.
```

---

## Tracking

### UTM parameters

| Parameter | Values |
|-----------|--------|
| `utm_source` | `google`, `meta`, `pinterest` |
| `utm_medium` | `search`, `social` |
| `utm_campaign` | `validation` |
| `utm_content` | `rsa-v1`, `stop-rebuying`, `seed-viability`, `messy-box`, etc. |

### Analytics events to track

- Ad click (via UTM)
- Landing page view
- CTA click
- Form start
- Form submission
- Source attribution (which ad → which signup)
