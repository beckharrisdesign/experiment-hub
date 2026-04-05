# Simple Seed Organizer - PRD

## Design & Prototype

**Figma Design**: [Simple Seed Organizer](https://www.figma.com/design/3OcfOyLd4qDonrA44TcE46/Simple-Seed-Organizer?node-id=5-29)
**Figma Make Prototype**: [Seed Collection Tracker App](https://www.figma.com/make/3KLrBwkhXzE52TfcsyOdBZ/Seed-Collection-Tracker-App?node-id=0-1&t=9nRR5RQyd7y32aNE-1)
**Local prototype**: `experiments/simple-seed-organizer/prototype/app/` → `npm run dev` → localhost:3001

---

## Overview

Simple Seed Organizer is a mobile/web app for home gardeners to track their seed inventory. It does one thing: store seed info and let you retrieve it fast. No planning, no calendars, no complexity.

**Rule**: Build the landing page and fake door test first. Do not start the app until validation metrics are met.

---

## Problem Statement

Gardeners who collect seeds hit three recurring problems:

- They rebuy seeds they already have because they can't check their inventory at the store
- They don't know which packets are still viable before planting season
- Finding planting info (depth, spacing, days to maturity) means digging through a physical box

Existing tools either require full garden planning setup (SeedTime, Planter) or rely on free apps that are still too feature-heavy for someone who just wants a searchable seed list.

---

## Goals & Objectives

1. Validate demand with a fake door test before writing any product code
2. Deliver a seed inventory app that's faster and more useful than a notes app or spreadsheet
3. Make the use-first list (viability tracking) the standout feature that justifies $15/yr

---

## Target User

**Primary**: Home gardener with 20+ seed packets who is frustrated with complex gardening apps and wants a fast, simple way to know what seeds they own and which to use first. Willing to pay $12–15/yr for something that actually fits their workflow.

**Secondary**: Seed swappers and savers who need a trackable inventory for trading and year-over-year replanting.

**Not for**: Gardeners who want planting schedules, plot design, or care reminders — that's SeedTime or Planter.

---

## Core Features

### MVP scope

- **Seed inventory**: Add a seed with name + optional fields (variety, source, purchase date, notes). Edit and delete. Only required field is name.
- **Search**: Instant search by name/variety. Results in < 1 second.
- **Use-first list**: Seeds older than 2 years (or user-set threshold) surface automatically. Visual age indicator: green/yellow/red.
- **Offline-first**: Full functionality without internet. Data stored locally; sync is a future feature.

**Out of scope for MVP**: photo uploads, cloud sync, barcode scanning, social/sharing features, garden planning (permanently excluded — not a phase 3 feature, just not this product)

---

## Success Metrics

- **CTA click rate: > 10%** of sessions — GA4 click event on the fake buy button
- **Email signup rate: > 5%** of sessions — GA4 form submission event

---

## Validation Plan (Landing Page)

Landing page tests whether gardeners will pay ~$15/yr for a simple seed inventory app. Traffic from Meta/Pinterest ads targeting gardening interests. CTA is a fake "Buy for $15/year" button that captures email and shows a "you'll be first to know" confirmation. Run for 2 weeks with a $100–300 budget before deciding. Full copy: [landing-page-content.md](landing-page-content.md).

---

## Launch Readiness

Items required before the app goes live (not the landing page):

| Item | Status | Notes |
|---|---|---|
| Password reset flow | Done | `/forgot-password` + `/reset-password` via Supabase email link |
| Legal pages | Done | `/terms` and `/privacy` — update with real content before charging users |
| SEO meta tags | Done | Title, description, OG, Twitter card in `layout.tsx` |
| Custom 404 | Done | `app/not-found.tsx` |
| `robots.txt` + `sitemap.xml` | Done | Via `app/robots.ts` and `app/sitemap.ts` |
