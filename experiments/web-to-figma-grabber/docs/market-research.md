# Web to Figma Grabber - Market Research

## Executive Summary

**Web to Figma Grabber** is a browser-to-design capture workflow for designers and
design engineers who need to move production UI into Figma quickly.

**Key Findings:**
- **TAM**: $600M - $1.3B (bottom-up: global design/prototyping tooling spend)
- **SAM**: $80M - $220M (subset focused on browser-based product teams using Figma)
- **SOM (Year 1)**: $120K - $420K
- **SOM (Year 3)**: $1.2M - $3.4M

**Market Opportunity Assessment**: **MEDIUM-HIGH**  
The workflow pain is real and frequent, especially for teams iterating on shipped
products. The wedge is speed and reduced manual reconstruction effort.

**Go/No-Go Recommendation**: **GO** — ship MVP and validate with repeated real
captures in active product workflows.

---

## Market Opportunity

Design and product teams increasingly work from live interfaces, not static mocks.
When teams need to review, redesign, or document existing UI, they still rely on
manual screenshotting plus rebuilding inside design tools. That step is repetitive
and creates friction between design and engineering.

Figma dominates modern UI design collaboration, while browser tooling is where live
product state exists. A bridge that captures selected UI and sends structured data
to Figma aligns directly with existing workflows. The opportunity is strongest for
design engineers, solo founders, and product designers shipping quickly.

This timing is favorable because teams are already using AI-assisted tooling for
generation and transformation. A reliable capture substrate (screenshot + layout
JSON) can become the foundation for higher-value automation later.

---

## Competitive Landscape

- **Figma native import methods** — broad design workflows · weakness: no fast
  element-level browser capture loop
- **Screenshot tools (CleanShot, native browser capture, etc.)** — quick pixels ·
  weakness: no structural layout metadata for editable rebuild
- **HTML-to-design converters** — page-level conversion attempts · weakness: mixed
  fidelity and low control over selected scope
- **Browser extension utilities** (assorted capture/debug tools) — useful page
  overlays · weakness: not optimized for Figma-targeted payload contracts

**Gap**: Existing tools either capture pixels without structure or attempt full-page
conversion; few deliver a fast, intentional element-level handoff contract tuned for
Figma workflows.

---

## Recommendation

**GO** — The problem is frequent enough and the MVP scope is technically tractable
with low infrastructure cost. The biggest risk is fidelity expectations in layout
mode; users may assume near-perfect conversion. First validation step: run a 30+
capture benchmark across 3-5 real products and log capture speed, failure causes,
and cleanup time versus manual rebuild.
