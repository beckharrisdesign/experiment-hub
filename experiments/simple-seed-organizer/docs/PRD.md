# Simple Seed Organizer — PRD

## Overview

Simple Seed Organizer is a mobile-friendly web app for gardeners with larger seed collections, focusing on minimal inventory, capture + AI-assisted packet reads, search for store and shed, and a clear lane next to planner-heavy tools.

---

## Problem Statement

Collectors still run into:

- Homemade spreadsheets or planner apps built around layout and schedules instead of a light inventory + use-first loop

Gap: a mobile-first, inventory-only path with use-first as the hero. Market and pricing context (including what others charge) sit in the business case, not in this doc.

---

## Goals & Objectives

1. Beat notes and spreadsheets for the core loop: add or import → find a seed fast → see what to use first without opening a planner app.
2. Make use-first and viability legible: thresholds, status, and a filter that people actually use—not only a line in marketing copy.
3. Make capture + AI intake real: import paths (pile, camera, file) with review before save, not a promise that only manual entry works in practice.
4. Keep the experience reliable: sign-in, save, load, and import fail rarely enough to trust the app during a real season.

---

## Target User

Primary — Home gardener with 20+ packets; wants search and use-first without a heavyweight planner; uses the app at the store and in the shed.

Secondary — Swappers and savers who need a clean inventory for trades and over-wintering.

Not for — Whole-garden scheduling as the main job; not “coach in a box” or long-range care calendars as the product center.

---

## Core Features

### MVP (current product + prototype)

The current build is the product until you decide otherwise.

#### Inventory

- Required: name. Optional: variety, type, source, year, purchase date, quantity, planting fields, notes, front/back packet photos (storage).
- Routes: add, import, list and detail on home and seed detail (plus edit) — as implemented in the app.

#### Search and filters

- Search: name, variety, brand. Filters: type, Use First.

#### Use-first and viability

- Crop-aware thresholds from pack year; manual use-first flag; status (e.g. good / watch / use-first).
- Use First filter: flagged items plus default age rule (e.g. 3+ years from pack year in current home logic—not a flat 2-year rule for everything).

#### Import and AI

- Import flow: pile photo, bulk camera, file upload; server routes for AI-assisted reads; usage limits for AI and bulk adds as configured. Queue and edit before save, not silent bulk insert.

#### Views and nav

- Active: type and photo list modes. Month and age views exist in code but are off the bottom nav until zone/month UX is ready.
- Plant now banner and zone helpers: small timing hints when a zone is set—not a second planner product.

#### Account and limits

- Auth and DB; seeds and images in storage. Per-account caps on seeds and AI where the product enforces them.

#### Release hygiene

- Password reset, terms/privacy, meta/OG, 404, robots, sitemap.

#### Out of scope

- Full plot planning, care calendars and coaching as the core, social/community as the center. Barcode not in the current case.

#### Docs note

- Draft marketing or landing copy may sit next to the product. Keep it aligned with the live UI; this PRD does not own acquisition or commercial validation.

---

## Success Metrics

Outcomes (experience)

- The core loop is usable in real life: add or import, then find a known seed quickly, then see what to deprioritize or use first—without a second “system” in your head.
- Use-first and import are part of how people use the app, not rare experiments.
- The app is stable enough for seasonal use: saves, loads, and imports do not feel flaky.

Failing tests (pass = outcome is plausible)

- Fails until: On a 50+ seed list, cold search finds a known packet in under 10s without scanning the whole list.
- Fails until: 30-day usage shows nontrivial use of the Use First filter (or equivalent path)—not zero forever after onboarding.
- Fails until: 30-day stats show a meaningful share of new seeds created via import vs manual add only—if import stays ~0, the capture path is not carrying weight.
- Fails until: Save, load, and import failures are rare enough (tracked, logged, or spot-checked) that you would hand the app to someone for a full growing season.
- Fails until: After basic analytics or logging exists, you can name baseline repeat use (e.g. return sessions) and see whether people come back to the list when it matters—not just a one-time signup.

Validation phase (product learning)

- Task-style checks: time-to-find, filter usage, import vs manual mix, error counts.
- Qualitative: short debriefs or support themes (“couldn’t find X,” “import failed”) that trend down, not up.

Go / no-go (product, not commercial)

- Enough confidence in the loop and the two differentiated paths (use-first, import) before building large new surfaces (e.g. re-enabling month/age in nav). Commercial go/no-go belongs outside this PRD.

MVP phase

- Find seed on a mid list: under ~10s.
- Friction: save/load/import error rate low enough that support is not the main use of the app.

---

## What this PRD does not cover

Acquisition, paid conversion, pricing tests, and demand validation live with the business case, finance, and growth workstreams. This document is for product behavior and experience.
