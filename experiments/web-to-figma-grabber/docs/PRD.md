# Web-to-Figma Grabber - PRD

## Overview

Web-to-Figma Grabber is a browser capture experiment that lets designers and builders pick an element on any page and send it to Figma in either screenshot mode or layout mode. It is built for fast design iteration when recreating UI manually is too slow. The default usage is now script-first (bookmarklet/console), with an extension path as fallback.

---

## Problem Statement

Teams regularly lose time rebuilding already-existing UI from the browser into Figma by hand. Current workflows force awkward context switching: screenshotting in one tool, annotating in another, and rebuilding structure manually.

- There is no fast "select this UI and send it to Figma" flow for real, live product surfaces.
- Screenshot capture is easy but loses structure and metadata.
- Structured capture preserves intent but is tedious without automation.
- Existing plugin-heavy workflows are too slow for day-to-day iteration.

---

## Goals & Objectives

1. Capture a selected DOM element and generate a Figma-ready payload in under 30 seconds.
2. Support two modes: pixel screenshot mode and editable layout mode.
3. Preserve enough metadata (page URL, selector path, styles, bounds) to speed Figma reconstruction.

---

## Target User

**Primary**: Product designers, design engineers, and solo founders who iterate on production UI and want fast browser-to-Figma handoff.

**Secondary**: UX researchers and PMs who need quick snapshots of live UI states for reviews.

**Not for**: Teams expecting one-click perfect design-token/component conversion in v1.

---

## Core Features

### MVP scope

- **Element picker overlay**: Click-to-select mode in the browser with hover highlight and selection lock so capture is explicit and reliable.
- **Screenshot mode**: Capture selected element pixels from the current tab and produce a cropped image payload with viewport-relative bounds.
- **Layout mode**: Serialize the selected node tree (bounded depth) with text content, layout bounds, and a focused style subset for reconstruction in Figma.
- **Figma handoff payload**: Generate a stable JSON envelope (schema versioned) including source metadata, target hints (`fileKey`, `pageName`), and mode-specific payload.
- **Delivery options**: Handoff payload to clipboard or download as `.json` for manual/automated import.

**Out of scope for MVP**: auto token extraction, component matching, slot generation, cross-origin iframe traversal, multi-element batch capture, direct write to Figma API from extension.

---

## Success Metrics

**Validation phase:**
- Successful captures from selected element to payload: > 90% on a mixed sample of marketing pages and app UIs.
- Median time to capture handoff payload: < 30 seconds.
- **Go/no-go threshold**: at least 8/10 trial captures across 3 websites produce usable Figma import artifacts with less than 5 minutes cleanup.

**MVP phase:**
- Screenshot mode payload accepted by downstream importer: > 95% of runs.
- Layout mode payload judged "usable structure" by manual review: > 70% of runs.

---

## Validation Plan (Landing Page)

This experiment validates workflow utility via direct usage in the Experiment Hub build loop instead of a public landing page. We will run repeated real captures on active projects and log capture speed, failure reasons, and cleanup effort. After a focused test set (at least 30 captures), we decide whether to invest in token extraction and direct Figma API writeback.
