# Best Day Ever - Product Requirements Document

## Overview

Best Day Ever is a tool that translates real digital calendars into printable physical day plans, designed specifically for people with ADHD. The core insight: ADHD brains often respond better to tactile, physical objects — writing by hand, using a favorite color marker, feeling the texture of paper. These sensory experiences help initiate and complete tasks in ways that screens alone cannot. Best Day Ever bridges the gap between where your schedule lives (digital calendars) and the format that actually helps you execute (paper in your hands).

## Problem Statement

People with ADHD often know what they need to do — it's on their calendar. The problem isn't information, it's initiation. Digital calendars are great for scheduling but terrible for doing. They're flat, intangible, and easy to dismiss. Meanwhile, research and lived experience show that ADHD brains benefit from:

- **Writing things down by hand** — the physical act of writing engages motor memory and strengthens commitment to the task
- **Tactile ritual** — the feel of paper, the click of a pen, the color of a marker can create sensory anchors that help transition into work mode
- **A physical artifact on the desk** — a printed plan is harder to ignore than a browser tab, and doesn't compete with notifications

But manually transcribing a digital calendar onto paper every morning is tedious, error-prone, and ironically requires the exact executive function ADHD makes difficult. The people who would benefit most from a physical plan are the least likely to create one from scratch.

**Existing tools don't solve this:**
- Physical planners (Passion Planner, Erin Condren) require manual entry — they don't know what's on your calendar
- Digital productivity apps (Todoist, Notion) stay on screen — they don't produce a physical artifact
- Calendar apps (Google Calendar, Apple Calendar) have no printable output designed for daily use
- ADHD-specific apps (Focus Keeper, Forest) focus on timers and blocking, not planning

There is no tool that takes your real schedule and turns it into something you can hold, write on, and work from.

## Goals & Objectives

### Primary Goals

1. **Bridge digital to physical**: Take real calendar data and produce a printable day plan in under 60 seconds
2. **Reduce initiation friction**: Eliminate the manual transcription step that prevents ADHD users from making physical plans
3. **Support tactile ritual**: Design printouts that invite interaction — writing, highlighting, checking off, annotating
4. **Stay simple**: This is a translator, not a planner app. No task management, no habit tracking, no journaling prompts
5. **Validate demand**: Confirm willingness to pay before building the full product

### Success Metrics

**Validation Phase (Phase 1)**:

- Landing page CTR: > 2% from targeted ads
- Conversion to "buy" step: > 10% of landing page visitors
- Email signups: > 5% of landing page visitors
- **Threshold**: If metrics meet targets, proceed to MVP build

**MVP Phase (Phase 2)**:

- Time from "open app" to "printable PDF": < 60 seconds
- Print completion rate: > 60% of generated plans get printed (self-reported or inferred)
- Weekly active usage: > 3 days/week among retained users
- User retention: > 35% active after 30 days
- User satisfaction: > 4.0/5.0 rating

## Target User/Use Case

**Primary User**: Adult with ADHD (diagnosed or self-identified) who:

- Already uses a digital calendar (Google Calendar, Apple Calendar, or Outlook)
- Has experienced the benefit of writing things down or working from paper
- Finds it hard to start tasks from a digital calendar alone
- Has access to a printer (home, office, or library)
- Willing to pay $5-12/month for a tool that makes their day work better

**Secondary User**: Anyone who prefers working from paper but keeps their schedule digitally — parents managing family calendars, freelancers juggling multiple clients, students with class + work schedules.

**Market Context** (from market research):

- **TAM**: $200M - $350M (ADHD + productivity tool segments)
- **SAM**: $100M - $175M (calendar-integrated, printable format seekers)
- **SOM Year 1**: $210K - $350K (500-1,000 paying customers)
- **Primary Segments**: 13-16M US adults with ADHD; 50-60M US adults seeking productivity solutions

**Core Use Cases**:

1. **Morning prep**: "I have 5 minutes before the day starts. Let me print today's plan so I have something on my desk to work from."
2. **Weekly planning**: "Sunday night, I want to print my week so I can see what's coming and annotate it with my own notes."
3. **Overwhelm reset**: "I'm staring at my calendar and feel paralyzed. Let me print it out so I can cross things off and feel momentum."

## Core Features

### Feature 1: Calendar Connection

**Description**: Connect to your existing digital calendar to pull in real events and schedule data.

**Key Capabilities**:

- OAuth connection to Google Calendar (MVP)
- Pull today's events, times, and titles
- Pull upcoming days (for weekly view)
- Read-only access — never writes to the calendar
- Support multiple calendars within one account (work, personal, family)
- User can select which calendars to include

**Design Principle**: One-time setup, then it just works. No re-authentication, no manual syncing.

### Feature 2: Template Selection

**Description**: Choose from a small set of printable layouts designed for ADHD brains.

**Templates (MVP — 3 to start)**:

1. **Time Block** — Hour-by-hour layout with calendar events pre-filled, empty space between events for handwritten tasks. Clear visual separation between time blocks.
2. **Top 3 + Schedule** — Top section with three large boxes for "most important things today" (handwritten), bottom section with the day's calendar events listed. Prioritization meets schedule.
3. **Week at a Glance** — Seven columns, one per day, with calendar events listed. Space at the bottom of each day for handwritten notes. For Sunday night planning sessions.

**Design Principles**:

- **Generous whitespace** — room to write, doodle, annotate
- **High contrast** — prints cleanly in black and white on any printer
- **No clutter** — only the information that helps you act, nothing decorative
- **Checkbox-ready** — events and tasks have circles or boxes to check off by hand

### Feature 3: PDF Generation & Print

**Description**: Generate a print-optimized PDF and send it to the user's printer.

**Key Capabilities**:

- Generate PDF formatted for US Letter (8.5 x 11) and A4
- Optimized for black-and-white printing (most home printers)
- Optional accent color (single color — for users who like to print in color)
- "Print" button that triggers the browser/OS print dialog
- "Download PDF" option for printing later or from another device
- Fast generation — PDF ready in < 5 seconds

**Design Principle**: Print is the primary output. The screen is a means to get to paper, not the destination.

### Feature 4: Light Personalization

**Description**: Minimal settings that let users make the output feel like theirs.

**Key Capabilities**:

- Choose default template
- Set preferred paper size (Letter vs A4)
- Toggle calendars on/off
- Set day start/end times (e.g., show 7am-9pm vs 6am-11pm)
- Optional: name or short label printed at top ("Beck's Tuesday" or just "Tuesday, March 11")

**Design Principle**: Personalization should take < 2 minutes to set up and rarely need changing. This is not a design tool.

## User Stories

### Story 1: First-time setup

**As an** ADHD adult who keeps my schedule in Google Calendar, **I want to** connect my calendar and print today's plan, **so that** I have a physical sheet on my desk to work from.

**Flow**:

1. User lands on Best Day Ever, signs up (email or Google)
2. User connects Google Calendar (OAuth, read-only)
3. User selects which calendars to include (work, personal, etc.)
4. App shows today's events in the default template (Time Block)
5. User hits "Print" — browser print dialog opens
6. User prints the page and puts it on their desk
7. Total time: < 3 minutes for first use, < 60 seconds for subsequent uses

### Story 2: Daily morning print

**As a** returning user, **I want to** print today's plan in under a minute, **so that** I can start my day with a physical plan without thinking about setup.

**Flow**:

1. User opens Best Day Ever (bookmarked or app)
2. App shows today's plan in their preferred template, pre-populated
3. User glances at it, optionally switches template
4. User hits "Print"
5. Done — they're working from paper now

### Story 3: Weekly planning session

**As a** user who likes to plan the week on Sunday night, **I want to** print a week-at-a-glance view, **so that** I can annotate it with priorities, color-code with markers, and hang it on my wall.

**Flow**:

1. User opens Best Day Ever on Sunday evening
2. User selects "Week at a Glance" template
3. App shows Mon-Sun with calendar events filled in
4. User hits "Print"
5. User spends 10-15 minutes annotating with markers and pens — this is the ritual that makes it work

### Story 4: Overwhelm moment

**As a** person with ADHD who feels paralyzed looking at my packed calendar, **I want to** print a "Top 3 + Schedule" view, **so that** I can focus on what matters and physically cross things off as I go.

**Flow**:

1. User opens Best Day Ever mid-day, feeling stuck
2. Selects "Top 3 + Schedule" template
3. Calendar events appear in the schedule section
4. The "Top 3" boxes are intentionally blank — user writes their priorities by hand
5. User prints, writes in their top 3 with a marker, and gets moving

## Technical Requirements

### Platform & Architecture

- **Frontend**: Next.js (App Router) with React — consistent with experiment hub stack
- **Backend**: Next.js API routes for calendar data fetching and PDF generation
- **Auth**: Google OAuth (doubles as calendar connection) + email/password fallback
- **PDF Generation**: Server-side PDF rendering (e.g., `@react-pdf/renderer` or `puppeteer` for HTML-to-PDF)
- **Calendar API**: Google Calendar API v3 (read-only scopes)
- **Hosting**: Vercel (free tier for validation, scales with usage)
- **Database**: Supabase (user preferences, calendar connection tokens)

### Performance Requirements

- **Calendar fetch**: < 3 seconds for today's events
- **PDF generation**: < 5 seconds
- **Full flow** (open → print): < 60 seconds for returning users
- **Page load**: < 2 seconds to interactive

### Technical Constraints

- **Solo buildable**: Must be buildable by one person with AI assistance
- **Simple stack**: Next.js + Supabase + Google Calendar API — no exotic dependencies
- **Low infrastructure cost**: < $50/month at validation scale
- **Privacy-first**: Calendar data is fetched on-demand and not stored. Only user preferences and OAuth tokens are persisted.
- **Print-optimized output**: PDFs must render correctly on consumer inkjet and laser printers

### Data Model

**User**:

- id (unique identifier)
- email (string)
- googleAccessToken (encrypted, for calendar API)
- googleRefreshToken (encrypted)
- preferredTemplate (enum: time-block, top-3, week-at-a-glance)
- preferredPaperSize (enum: letter, a4)
- dayStartHour (number, default 7)
- dayEndHour (number, default 21)
- selectedCalendarIds (array of strings — which Google calendars to include)
- displayLabel (optional string — name/label for printout header)
- createdAt (timestamp)
- updatedAt (timestamp)

**No events table** — calendar data is fetched live from Google Calendar API and never stored.

## Implementation Approach

### Phase 1: Validation (Pre-MVP)

**Goal**: Confirm that ADHD users want this badly enough to pay for it.

**Deliverables**:

1. **Landing Page**: Single page that explains the core value prop

   - Headline: "Your calendar, on paper. Ready in 60 seconds."
   - Subhead: "Best Day Ever translates your digital schedule into a printable day plan designed for ADHD brains."
   - Problem framing: "You know what you need to do. It's on your calendar. But staring at a screen doesn't make you start. Paper does."
   - Show the 3 template previews (mockups)
   - CTA: "Get early access" (email signup) or "Buy for $X/month" (fake buy button to measure intent)

2. **Ad Campaign**: 3-5 ad variants on Meta + Reddit

   - Target: ADHD communities, productivity interest groups, planner communities
   - Angles: "Your calendar, but on paper", "ADHD brains work better on paper", "Stop re-copying your calendar by hand"
   - Budget: $200-500 for initial signal
   - Track: CTR, landing page visits, conversion to signup/buy step

3. **Analytics**: Track landing page CTR, email signups, buy-step conversions, time on page

**Success Criteria**:

- CTR from ads: > 2%
- Conversion to buy step: > 10% of landing page visitors
- Email signups: > 5%
- **Decision**: Meet thresholds → build MVP. Miss → adjust messaging or reconsider.

**Timeline**: 1-2 weeks build + 2 weeks data collection

### Phase 2: MVP

**Goal**: Deliver the core loop — connect calendar, pick template, print plan.

**Scope**:

- Google Calendar OAuth connection
- 3 templates (Time Block, Top 3 + Schedule, Week at a Glance)
- PDF generation and print
- User preferences (template, paper size, day range, calendars)
- Simple auth (Google OAuth primary)
- Subscription payment (Stripe, $8/month or $60/year)

**Out of Scope for MVP**:

- Apple Calendar / Outlook support
- Custom template design
- Mobile app (web-only for MVP, mobile-responsive)
- Template marketplace or sharing
- Task management or to-do lists
- Habit tracking or journaling

**Timeline**: 4-6 weeks (solo build with AI assistance)

### Phase 3: Growth (Post-MVP, driven by user feedback)

**Potential additions** (only if validated by user demand):

- Apple Calendar and Outlook support
- Additional templates (2-week view, meeting prep, focus blocks)
- Template customization (adjust sections, fonts, spacing)
- Mobile app (PWA or native)
- Family/shared calendar views
- Integration with task managers (pull Todoist/Things tasks into the "Top 3" section)

**Timeline**: Ongoing, based on retention data and user requests

## Non-Requirements

**Explicitly Out of Scope** (core to product positioning):

1. **Task management**: No to-do lists, task creation, or task tracking. This is a calendar translator, not a productivity suite.
2. **Digital planner**: The output is paper. The app is not designed to be used as a digital planner on a screen.
3. **Habit tracking**: No streaks, no habit logs, no daily check-ins within the app.
4. **Journaling or reflection**: No gratitude prompts, no end-of-day reviews, no mood tracking.
5. **Calendar editing**: Read-only. Best Day Ever never writes to your calendar.
6. **Template design tool**: Users pick from curated templates. They don't build their own layouts.
7. **Social features**: No sharing planners, no community, no leaderboards.
8. **Notification system**: No reminders, no push notifications, no "time to print your plan" nudges.

**Rationale**: Every feature not on this list is a feature that competes with the core value: get your calendar onto paper, fast. ADHD tools that try to do everything end up being used for nothing. Best Day Ever does one thing.

## Future Considerations

**Potential enhancements** (if validated by user demand):

1. **More calendar providers**: Apple Calendar (CalDAV), Outlook (Microsoft Graph API)
2. **Template library expansion**: Meeting-heavy day, light day, half-day, focus session
3. **Accent colors**: Let users pick a single accent color for their printout (headers, dividers)
4. **Quick annotations layer**: Before printing, let users type a note into a text box that appears on the printout — for people who want to pre-fill the "Top 3" digitally
5. **Recurring print schedule**: Auto-generate and email a PDF every morning at 6am so it's ready when you wake up
6. **Print-on-demand partnership**: For users without printers — mail a weekly planner booklet based on their calendar

**Decision Framework**: Only add features if:

- Users explicitly request them (not hypothetical)
- They don't add cognitive load to the core flow (calendar → template → print)
- They support the physical/tactile thesis, not work against it
- They can be built and maintained by one person

## Market Context

**Market Opportunity** (from market research):

- **TAM**: $200M - $350M (ADHD + productivity tool segments, bottom-up)
- **SAM**: $100M - $175M (calendar-integrated, printable format seekers)
- **SOM Year 1**: $210K - $350K (500-1,000 paying customers)
- **Go/No-Go**: GO — proceed with MVP validation

**Competitive Positioning**:

- **vs. Passion Planner / Erin Condren**: They're beautiful but blank. You still have to copy your calendar by hand. Best Day Ever starts with your real schedule.
- **vs. Todoist / Notion**: Great digital tools, but they stay on screen. Best Day Ever gets you off-screen.
- **vs. Google Calendar print**: Technically you can print Google Calendar, but the output is ugly, not designed for daily use, and has no ADHD-aware layout.
- **vs. ADHD apps (Forest, Focus Keeper)**: They help with focus during tasks. Best Day Ever helps with the step before: knowing what to do and starting.

**Key Differentiator**: No other tool takes your real calendar and turns it into a physical, ADHD-optimized daily plan. That's the gap.

---

**Document Version**: 1.0
**Created**: 2026-03-09
**Status**: Draft
