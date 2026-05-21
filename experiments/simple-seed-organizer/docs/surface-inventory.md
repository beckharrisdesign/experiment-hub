# Simple Seed Organizer — Surface Inventory

**Purpose:** Single reference for human + LLM to address any surface by common name.
Each row gives the file path, route, Figma node, and parity status so there is no ambiguity when discussing a specific UI surface.

**Last updated:** 2026-05-21
**Figma file key:** `S8YJQugvMmn5jaRqwFM5XO`
**Design-system anchor:** node `13:128` (Header)

**Parity legend:**
- `aligned` — Figma and code match; verified in a previous pass
- `partial` — Figma node exists but not all details verified
- `code-only` — surface exists in code; no Figma frame mapped yet
- `figma-only` — Figma frame exists; not yet implemented in code

---

## Pages (routes)

| Common Name | Route | File Path | Figma Node | Parity | Notes |
|---|---|---|---|---|---|
| Landing / Home | `/` (unauthenticated) | `app/page.tsx` + `components/LandingPage.tsx` | `18:2709` | aligned | Composition of section components; see landing-figma-inventory.md |
| Seed List | `/` (authenticated) | `app/page.tsx` | `17:799` | partial | Renders SeedList; Figma shows list symbol but full page frame not mapped |
| Add Seed | `/add` | `app/add/page.tsx` | `21:3028` | partial | Uses AddSeedForm; Figma node is the form, not the full page |
| Bulk Import | `/import` | `app/import/page.tsx` | — | code-only | BulkCameraCapture + BatchImport; no Figma frame mapped |
| Seed Detail | `/seeds/[id]` | `app/seeds/[id]/page.tsx` | — | code-only | Full detail view; no Figma frame mapped |
| Seed Edit | `/seeds/[id]/edit` | `app/seeds/[id]/edit/page.tsx` | — | code-only | Edit form; shares logic with AddSeedForm |
| Login | `/login` | `app/login/page.tsx` | `7:202` | partial | AuthForm embedded; Figma shows form container |
| Sign Up | `/login` (tab) | `app/login/page.tsx` | `7:202` | partial | Same page as login; toggle between forms |
| Forgot Password | `/forgot-password` | `app/forgot-password/page.tsx` | — | code-only | No Figma frame |
| Reset Password | `/reset-password` | `app/reset-password/page.tsx` | — | code-only | No Figma frame |
| Pricing | `/pricing` | `app/pricing/page.tsx` | `7:84` | partial | Uses PricingCard; Figma has pricing section but standalone page not mapped |
| Profile | `/profile` | `app/profile/page.tsx` | — | code-only | Account/tier info; no Figma frame |
| Privacy Policy | `/privacy` | `app/privacy/page.tsx` | — | code-only | Legal page |
| Terms of Service | `/terms` | `app/terms/page.tsx` | — | code-only | Legal page |
| Packet Test | `/packet-extraction-test` | `app/packet-extraction-test/page.tsx` | — | code-only | Dev/demo page; intentionally not in Figma |

---

## Components

### Shell & Navigation

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| App Shell | `components/AppShell.tsx` | `21:4993` | aligned | Page wrapper / body slot |
| Header | `components/Header.tsx` | `13:128` | aligned | Canonical DS anchor; contains LogoMark + ProfileMark SVGs |
| Bottom Nav | `components/BottomNav.tsx` | `21:2114` | aligned | Mobile tab bar |
| App Toaster | `components/AppToaster.tsx` | — | code-only | Toast notification wrapper (react-hot-toast) |

### Landing Page Sections

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Landing Page | `components/LandingPage.tsx` | `18:2709` | aligned | Composition shell |
| Landing Hero | `components/LandingHero.tsx` | `7:244` | aligned | Uses `--green-dark` bg |
| Features Section | `components/LandingFeaturesSection.tsx` | `7:48` | aligned | "Three Points — Features" |
| Problem Section | `components/LandingProblemSection.tsx` | `7:8` | aligned | "Three Points — Problem" |
| Pricing Section | `components/LandingPricingSection.tsx` | `7:84` | aligned | Contains PricingCard |
| Signup / CTA Section | `components/LandingSignupSection.tsx` | `18:3287` | aligned | Outer dark + inner light panel |
| Landing Footer | `components/LandingFooter.tsx` | `80:1268` | aligned | Footer chrome; lives outside `18:2709` in Figma under `Sections` frame `13:820` |

### Auth

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Auth Form | `components/AuthForm.tsx` | `7:202` | aligned | Container for signup/login |
| Login Form | `components/LoginForm.tsx` | — | code-only | Sub-form inside AuthForm |
| Sign Up Form | `components/SignUpForm.tsx` | — | code-only | Sub-form inside AuthForm |

### Seed CRUD

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Seed List | `components/SeedList.tsx` | `17:799` | aligned | Main list view |
| Seed Card | `components/SeedCard.tsx` | `17:1164` | aligned | Wide card variant |
| Seed Detail | `components/SeedDetail.tsx` | — | code-only | Full record view |
| Seed Gallery | `components/SeedGallery.tsx` | — | code-only | Photo grid |
| Seed Pill | `components/SeedPill.tsx` | — | code-only | Inline seed name chip |
| Add Seed Form | `components/AddSeedForm.tsx` | `21:3028` | aligned | Packet editing view |
| Viability Badge | `components/ViabilityBadge.tsx` | — | code-only | Use-first status indicator |
| Plant Now Banner | `components/PlantNowBanner.tsx` | — | code-only | Seasonal planting hint |
| Planting Calendar | `components/PlantingCalendar.tsx` | — | code-only | Month-grid planting view |

### Search & Filter

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Filter Bar | `components/FilterBar.tsx` | — | code-only | Type/mode filter row |
| Filter Chip | `components/FilterChip.tsx` | — | code-only | Individual filter toggle |
| Search Bar | `components/SearchBar.tsx` | — | code-only | Text search input |

### Pricing & Subscription

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Pricing Card | `components/PricingCard.tsx` | `7:119` / `80:1274` | aligned | Paid tier card + "Most Popular" badge |
| Profile Tier Table | `components/ProfileTierTable.tsx` | — | code-only | Account page tier comparison |

### Bulk Import

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Packet Reader | `components/PacketReader.tsx` | — | code-only | OCR / AI packet reading UI |
| Bulk Camera Capture | `components/BulkCameraCapture.tsx` | — | code-only | Pile-photo capture |
| Batch Import | `components/BatchImport.tsx` | — | code-only | Review + import queue |

### Account

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Profile | `components/Profile.tsx` | — | code-only | User account view |

### App Footer

| Common Name | Component File | Figma Node | Parity | Notes |
|---|---|---|---|---|
| Footer | `components/Footer.tsx` | — | code-only | In-app footer (distinct from LandingFooter) |

---

## Coverage summary

| Category | Total surfaces | With Figma node | `aligned` | `code-only` |
|---|---|---|---|---|
| Pages | 15 | 5 | 1 (Landing) | 10 |
| Components | 33 | 15 | 13 | 18 |
| **Total** | **48** | **20** | **14** | **28** |

Roughly 40% of surfaces have a Figma mapping; ~30% are verified aligned.
The landing page and app shell (Header, BottomNav, AppShell) are the strongest areas of parity.
App-interior surfaces (Seed Detail, Filter Bar, Search Bar, Import flow) are entirely unmapped.
