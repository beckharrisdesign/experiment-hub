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

**Primary**: Adult with ADHD (diagnosed or self-identified) who uses a digital calendar, has experienced the benefit of writing things down, and has access to a printer. Willing to pay $8/mo or $60/yr for something that actually helps them start their day.

**Secondary**: Anyone who prefers working from paper but keeps their schedule digitally — parents managing family calendars, freelancers juggling clients, students with class and work schedules.

**Not for**: Users who want a digital planner, habit tracker, task manager, or journaling app. This is a calendar translator, not a productivity suite.

---

## Core Features

### MVP scope

- **Calendar connection**: Google Calendar OAuth (read-only). Pull today's events, times, titles. One-time setup, then it just works.
- **Template selection**: 3 layouts — Time Block (hour-by-hour with calendar events pre-filled, space for handwritten tasks), Top 3 + Schedule (write your top priorities by hand, see the day's events below), Week at a Glance (Sunday planning session, 7 columns).
- **PDF generation**: Print-optimized output for US Letter and A4, ready in < 5 seconds, designed for black-and-white printing with generous whitespace and checkboxes.
- **Light personalization**: Default template, paper size, day start/end time, which calendars to include.

**Out of scope for MVP**: Apple Calendar / Outlook integration, custom template design, mobile app, task management, habit tracking, journaling, social features, writing to the calendar (read-only always).

---

## Success Metrics

**Validation phase:**
- Ad CTR: > 2%
- Fake-buy conversion: > 10% of landing page visitors
- Email signups: > 5% of landing page visitors
- **Go/no-go**: All three met → build MVP. Otherwise adjust messaging or stop.

**MVP phase:**
- Time from open to printed PDF: < 60 seconds for returning users
- Print completion rate: > 60% of generated plans get printed
- Retention: > 35% active after 30 days
- User satisfaction: > 4.0/5.0

---

## Validation Plan (Landing Page)

Landing page tests whether ADHD adults will pay ~$8/mo for a tool that prints their daily plan from their calendar. Traffic from Meta and Reddit ads targeting ADHD communities and planner interests. CTA is a fake "Get early access for $8/mo" button that captures email. Run for 2 weeks with a $200–500 ad budget before deciding. Full copy: [landing-page-content.md](landing-page-content.md).
