# Best Day Ever - PRD

## Overview

Best Day Ever translates real digital calendars into printable physical day plans, designed for people with ADHD. The core insight: ADHD brains often respond better to tactile, physical objects. Best Day Ever bridges the gap between where your schedule lives (digital calendars) and the format that actually helps you execute (paper in your hands).

**Rule**: Build the landing page and fake door test first. No calendar integration, no PDF generation, no app code until validation metrics are met.

---

## Problem Statement

People with ADHD usually know what they need to do — it's on their calendar. The problem is initiation. Digital calendars are flat, intangible, and easy to dismiss. Physical artifacts (a printed plan on the desk, writing things by hand) help transition into work mode in ways that screens don't.

Existing tools don't solve this:
- Physical planners (Passion Planner, Erin Condren) require manual calendar transcription — defeating the purpose for ADHD users
- Digital apps (Todoist, Notion) stay on screen
- Calendar print functions exist but produce ugly, unusable output
- ADHD apps (Focus Keeper, Forest) address focus during tasks, not planning before them

There is no tool that takes your real schedule and turns it into something you can hold, write on, and work from.

---

## Goals & Objectives

1. Validate demand with a landing page test before writing any product code
2. Deliver a tool that takes your real calendar and produces a print-ready ADHD-optimized layout in under 60 seconds
3. Make the physical artifact feel worth printing — designed to be written on, highlighted, checked off

---

## Target User

**Primary**: Adult with ADHD (diagnosed or self-identified) who uses a digital calendar, has experienced the benefit of writing things down, and has access to a printer.

**Secondary**: Anyone who prefers working from paper but keeps their schedule digitally — parents managing family calendars, freelancers juggling clients, students with class and work schedules.

**Not for**: Users who want a digital planner, habit tracker, task manager, or journaling app. This is a calendar translator, not a productivity suite.

---

## Tech Stack

Consistent with all prototypes in this hub:

- **Framework**: Next.js + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Passport.js + Google OAuth 2.0 (calendar read-only scope)
- **Database**: Supabase (user persistence, calendar preferences)
- **PDF generation**: pdf-lib (server-side, no headless browser dependency)
- **Date handling**: date-fns
- **Testing**: Vitest
- **Deployment**: Vercel

---

## Prior Prototype Work

Two earlier repos explored this problem and have reusable code:

- **`calendar-to-planner`** — Plain Node/Express prototype. The `googleCalendar.js` OAuth + event fetch pattern is useful as a reference; the rest is throwaway.
- **`calendar-printer`** — Next.js 14 + TypeScript prototype. Two directly reusable pieces:
  - `server.js` — Full Google OAuth flow with Passport, session management, and Supabase user upsert. Auth is production-quality.
  - `components/print-view.tsx` — Working Time Block layout: 30-min slots, event overlap handling, color-coded events, print-optimized Tailwind. Needs real calendar data wired in (currently accepts a `calendarData` prop but ships with mock todos hardcoded).

**What to leave behind from `calendar-printer`**: Notion API dependency, hardcoded mock todo checkboxes, the Tolkien placeholder in `app/page.tsx`.

---

## Core Features

### MVP scope

- **Calendar connection**: Google Calendar OAuth (read-only). Pull today's events, times, titles. One-time setup, then it just works.
- **Template selection**: 4 layouts —
  - **Time Block**: Hour-by-hour grid with calendar events pre-filled, blank space between events for handwritten tasks. Based on `print-view.tsx` from prior prototype.
  - **Top 3 + Schedule**: Three large blank lines at top to write your priorities by hand, then the day's calendar events listed below.
  - **Week at a Glance**: Sunday planning session view, 7 columns, events summarized per day.
  - **Hybrid Day**: Split layout — left side is the time block schedule from your calendar, right side has two hand-writable sections (personal and work) for freeform notes or tasks. Not baked into other templates.
- **PDF generation**: Server-side output via pdf-lib, US Letter and A4, ready in < 5 seconds, designed for black-and-white printing with generous whitespace and checkboxes.
- **Light personalization**: Default template, paper size, day start/end time, which calendars to include.

**Out of scope for MVP**: Apple Calendar / Outlook integration, custom template design, mobile app, task management, habit tracking, journaling, social features, writing to the calendar (read-only always), Notion integration.

---

## Success Metrics

- **CTA click rate: > 10%** of sessions — GA4 click event on the "Get early access" button
- **Email signup rate: > 5%** of sessions — GA4 form submission event

---

## Validation Plan (Landing Page)

Landing page tests whether there is real unmet demand among ADHD adults for a tool that prints their daily plan from their calendar. Traffic from Meta and Reddit ads targeting ADHD communities and planner interests. CTA is a "Get early access" button that captures email — the goal is demand signal, not pricing validation. Run for 2 weeks with a $200–500 ad budget before deciding. Full copy: [landing-page-content.md](landing-page-content.md).
