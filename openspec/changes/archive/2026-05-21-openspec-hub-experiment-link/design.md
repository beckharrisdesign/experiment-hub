# Design — openspec-hub-experiment-link

## Context

Hub catalog (`experiments.json`) and BHD artifacts (`openspec/changes/<id>/`) are separate. Pomodoro Maker has `explore.md` but no hub detail surface.

## Goals / Non-Goals

**Goals:**

- `lib/openspec.ts` resolves change dir and loads phase markdown server-side
- Detail page Lifecycle tab; home table phase chip
- `getExperimentBySlug` accepts name slug or `id`
- Register `pomodoro-maker` in hub catalog as reference

**Non-Goals:**

- Auto-sync scores; Archive store write-backs; replacing PRD tabs

## Decisions

- **Route slug:** `getExperimentHrefSlug(experiment)` returns `experiment.id` when `slugify(name) !== id`, else `slugify(name)` — fixes id/name mismatches without breaking existing name-based URLs
- **Current phase:** Latest existing file in order archive → apply → propose → explore
- **Tab order:** Lifecycle first when present, then Business Case, PRD

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Figma URL | N/A — no UI redesign |
| Frames | Reuse existing tab + table patterns from hub home and experiment detail |
