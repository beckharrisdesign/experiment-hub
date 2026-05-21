# Simple Seed Organizer — Design System Audit

**Date:** 2026-05-21
**Figma file:** `S8YJQugvMmn5jaRqwFM5XO` — [Open in Figma](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2)
**DS anchor:** node `13:128` (Header)
**Code root:** `experiments/simple-seed-organizer/prototype/app/`

---

## 1. Design Tokens

### Color tokens

| Token name | Figma variable | CSS custom prop (globals.css) | Value | Status |
|---|---|---|---|---|
| Brand primary | `brand/primary` | `--brand-primary` | `#15472d` | **aligned** |
| Green dark | — | `--green-dark` | `#166534` | aligned (hero bg, footer) |
| Green primary | — | `--green-primary` | `#16a34a` | aligned |
| Green button | — | `--green-button` | `#00a63e` | aligned |
| Green header | — | `--green-header` | `#166534` | duplicate of `--green-dark`; candidate for consolidation |
| Background light | — | `--bg-light` | `#f3f4f6` | aligned |
| Background white | — | `--bg-white` | `#ffffff` | aligned |
| Text heading | — | `--text-heading` | `#101828` | aligned |
| Text label | — | `--text-label` | `#4a5565` | aligned |
| Text muted | — | `--text-muted` | `#6a7282` | aligned |
| Text subtle | — | `--text-subtle` | `#99a1af` | aligned |
| Age new | — | `--age-new` | `#f0fdf4` | aligned |
| Age 1yr | — | `--age-1yr` | `#dcfce7` | aligned |
| Age 2yr | — | `--age-2yr` | `#bbf7d0` | aligned |
| Age 3yr | — | `--age-3yr` | `#86efac` | aligned |

**Hard-coded values not yet tokenized (gaps to close):**

| Value | Location | Suggested token |
|---|---|---|
| `#15803d` | `Header.tsx` LogoMark top path fill | `--green-logo-light` or `--green-primary-dark` |
| `bg-[#15803d]` | `Header.tsx` profile button bg | same as above |
| `hover:bg-[#166534]` | `Header.tsx` profile button hover | already `--green-dark`; use CSS var |
| `text-[#15803d]` | `Header.tsx` LogoMark Tailwind class | should reference CSS var |

### Typography

| Element | Figma | Code | Status |
|---|---|---|---|
| Body / UI font | Inter | `next/font/google` → Inter (layout.tsx) | **aligned** |
| Serif / heading accent | — | Fraunces loaded in Tailwind config; `font-heading` class | **partial** — verify if Fraunces appears in Figma; not visibly used in prototype yet |
| Mono | — | SF Mono / Fira Code stack in Tailwind config | no Figma reference; dev-only |

### Spacing & layout

Not yet formally tokenized. Tailwind defaults in use. No Figma spacing tokens confirmed from MCP inspection.

---

## 2. Component sync status

### In sync (aligned)

These components have a `@figma` node and were verified in a previous pass:

| Common Name | Component | Figma Node | Last verified |
|---|---|---|---|
| Header | `Header.tsx` | `13:128` | pass 3 (2026-05-08) |
| App Shell | `AppShell.tsx` | `21:4993` | pass 2 |
| Bottom Nav | `BottomNav.tsx` | `21:2114` | pass 2 |
| Landing Page | `LandingPage.tsx` | `18:2709` | pass 3 |
| Landing Hero | `LandingHero.tsx` | `7:244` | pass 3 |
| Features Section | `LandingFeaturesSection.tsx` | `7:48` | pass 3 |
| Problem Section | `LandingProblemSection.tsx` | `7:8` | pass 3 |
| Pricing Section | `LandingPricingSection.tsx` | `7:84` | pass 3 |
| Pricing Card | `PricingCard.tsx` | `7:119`, `80:1274` | pass 3 |
| Signup / CTA Section | `LandingSignupSection.tsx` | `18:3287` | pass 3 |
| Auth Form | `AuthForm.tsx` | `7:202` | pass 3 |
| Landing Footer | `LandingFooter.tsx` | `80:1268` | pass 3 |
| Seed List | `SeedList.tsx` | `17:799` | pass 2 |
| Seed Card | `SeedCard.tsx` | `17:1164` | pass 2 |
| Add Seed Form | `AddSeedForm.tsx` | `21:3028` | pass 2 |

### Code-only (no Figma frame mapped)

These exist in code but have no Figma equivalent — either not yet designed or not yet linked:

**High priority** (user-facing, core flows):
- Seed Detail — full seed record view
- Seed Edit — edit form
- Filter Bar + Filter Chip + Search Bar — list navigation
- Viability Badge — use-first indicator (appears on SeedCard)
- Plant Now Banner — seasonal prompt

**Medium priority** (secondary flows):
- Login Form / Sign Up Form (sub-forms within AuthForm)
- Profile / Profile Tier Table
- Seed Gallery
- Planting Calendar

**Low priority / dev-facing:**
- Packet Reader, Bulk Camera Capture, Batch Import (import flow)
- App Toaster, Seed Pill, Footer
- Packet Extraction Test page

### Pages with no Figma frame

All 13 routes are code-only at the page level. The landing page is the only route with a Figma frame (`18:2709`). The app interior (Seed List page, Add page, Seed Detail, etc.) uses component symbols that exist in Figma but no assembled page frames.

---

## 3. What's in sync

- **Entire landing page** — all 7 section components verified pass 3; token values and copy match
- **App shell** — Header, BottomNav, AppShell all aligned
- **Color tokens** — 15 CSS custom properties match Figma `brand/primary` anchor
- **Typography** — Inter confirmed in both Figma and code
- **Pricing copy** — "50 AI packets/month" on Stash tier aligned between Figma `7:111` and `LandingPricingSection`

---

## 4. What's out of sync / gaps

### Token gaps
1. **`#15803d` hard-coded** in `Header.tsx` (logo mark + profile button) — should be a CSS var
2. **`--green-header` duplicates `--green-dark`** (`#166534`) — consolidation candidate
3. **Fraunces** loaded in Tailwind config but not confirmed used anywhere in the prototype or Figma

### Component gaps (highest user impact first)
1. **Seed Detail** — core viewing surface; entirely unmapped
2. **Filter Bar / Search Bar** — used on home screen; no Figma
3. **Viability Badge** — appears on SeedCard but no standalone Figma symbol
4. **Login Form / Sign Up Form** — sub-forms within mapped AuthForm; Figma only shows container
5. **Profile page** — account management; no Figma
6. **Plant Now Banner** — visible to all users; no Figma

### Code Connect
All `@figma` annotations are JSDoc-only. No `.figma.ts` Code Connect files exist — deferred per pass 3.

---

## 5. Connection plan (prioritized)

### Pass 4 — App interior (next session)

**Goal:** Map the surfaces users see after login.

1. Open Figma file (`S8YJQugvMmn5jaRqwFM5XO`). Using MCP `get_design_context` on `13:128`, navigate to app interior frames.
2. Locate or create Figma frames for: Seed List page, Seed Detail page, Add Seed page.
3. Add `@figma` annotations to: `SeedDetail.tsx`, `FilterBar.tsx`, `SearchBar.tsx`, `ViabilityBadge.tsx`.
4. Verify `SeedCard` renders correctly at node `17:1164` — confirm age indicator colors map to `--age-*` tokens.

### Pass 5 — Token cleanup

1. Extract `#15803d` from `Header.tsx` into `--green-logo` CSS var in `globals.css`.
2. Evaluate `--green-header` vs `--green-dark` — consolidate if identical.
3. Confirm or remove Fraunces from layout; align with Figma typography frame if one exists.

### Pass 6 — Import flow

1. Design Figma frames for Bulk Import, Packet Reader (or confirm they're intentionally design-system-excluded as power features).
2. Add `@figma` annotations to: `PacketReader.tsx`, `BulkCameraCapture.tsx`, `BatchImport.tsx`.

### Pass 7 — Code Connect

Once component parity is solid, add `.figma.ts` Code Connect files for high-traffic components: Header, SeedCard, SeedList, AddSeedForm.

### Deferred indefinitely (explicit scope exceptions)
- **Legal pages** (Privacy, Terms) — content-only; no design value in Figma
- **Packet Extraction Test page** — dev tool; intentionally not designed
- **AppToaster** — utility; behavior spec is sufficient

---

## Quick-reference: surfaces still needing Figma work

```
Pages:       Seed List (page frame), Seed Detail, Add Seed, Import, Login page, Pricing page, Profile
Components:  SeedDetail, FilterBar, FilterChip, SearchBar, ViabilityBadge, PlantNowBanner,
             PlantingCalendar, LoginForm, SignUpForm, Profile, ProfileTierTable, SeedGallery,
             PacketReader, BulkCameraCapture, BatchImport, Footer
```
