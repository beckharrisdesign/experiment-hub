# Etsy Patternator - PRD

## Overview

Etsy Patternator is a workflow automation tool for embroidery pattern creators. It generates optimized Etsy listings, product images (mockups, lay flats, lifestyle shots), and customer communications — all anchored to a defined store brand identity — so you spend time drawing patterns in Procreate, not formatting listings.

**Strategy**: Personal tool first (Year 1), SaaS productization second (Year 2–3). Don't build multi-user features until the personal tool proves real time savings.

---

## Problem Statement

Creating and managing Etsy listings for embroidery patterns is time-consuming and repetitive. Each listing requires:
- Writing SEO-optimized titles, descriptions, and 13 keyword tags
- Generating product images: mockups, lay flats, lifestyle shots, store assets
- Formatting downloadable files (printable pattern + instruction PDF)
- Writing customer communication: order confirmations, download instructions, FAQ responses

This takes 30–60 minutes per listing and 5–10 hours/week total. The goal is 10–15 minutes per listing and 2–3 hours/week — saving enough time to meaningfully redirect toward creative work.

---

## Goals & Objectives

1. Reduce per-listing creation time from 30–60 minutes to 10–15 minutes
2. Generate consistent, on-brand images for every listing without manual Canva work
3. Save 3–7 hours/week of operational time to redirect toward drawing patterns
4. Validate real time savings with a real Etsy store before any SaaS work begins

---

## Target User

**Primary**: Embroidery pattern creator who designs in Procreate, sells digital patterns on Etsy, and currently spends 5–10 hours/week on operational tasks they'd rather not do.

**Secondary** (Year 2+): Other craft pattern creators (sewing, quilting, cross-stitch) with the same workflow pain.

**Not for**: Etsy sellers with physical products, general e-commerce sellers, or anyone who needs direct Etsy API integration — the MVP uses manual copy/paste throughout.

---

## Core Features

### MVP scope

- **Brand identity**: Define store name, tone, and creative direction once. Everything generated — listings, images, customer messages — applies this automatically for consistency across the store.
- **Product planning**: Simple kanban/list to track pattern ideas from concept to listed. Status: idea → in-progress → ready → listed.
- **Listing authoring**: Generate title (140 chars, SEO-optimized), description (brand tone, keyword-rich), and 13 tags from a pattern name and basic details.
- **Image generation**: Import Procreate export as the seed file; generate store header, profile image, mockups, lay flats, and customer downloads (printable PDF + instruction PDF). Config file for Etsy size/resolution specs so spec changes don't require code changes.
- **Customer communications**: Generate order confirmation, download delivery message, follow-up with coupon, and sample responses to 5–10 common questions — all in the store's brand voice.
- **SEO validation**: Check keyword presence across title/description/tags; score and flag gaps.
- **Export**: Formatted text + organized image folders, ready to copy/paste into Etsy. No Etsy API integration.

**Out of scope for MVP**: Etsy API integration, multi-user/SaaS features, cloud sync, social media scheduling, advanced analytics, direct listing publishing.

---

## Success Metrics

- **Time per listing: < 15 minutes** — self-timed; down from 30–60 min
- **Sustained use: 10+ listings over 3 months** — the signal that it's worth productizing

---

## Validation Plan

This is a personal tool — validation is using it for your own Etsy store and measuring actual time savings. No landing page or fake door test needed. The go/no-go for SaaS productization is: (1) tool is actively used for 6+ months, (2) measurable time savings confirmed, and (3) at least 5 other pattern creators express strong interest unprompted.
