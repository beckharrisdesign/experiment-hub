# Landing Page Template Guide

This document describes how to create a validation landing page for any experiment.

## Architecture

Landing pages are **standalone Next.js applications** that run independently from the main Experiment Hub. This is intentional:

- Landing pages are deployed to unique URLs for ad campaigns
- They can run on different ports during development
- They're self-contained for easy deployment

**Centralized Submissions**: All landing page form submissions are routed to the Experiment Hub's `/api/landing-submission` endpoint. This means:

- Landing pages don't need the Notion SDK or authentication logic
- All submissions go through one centralized API
- The hub handles Notion integration and data storage
- Landing pages only need to set `HUB_API_URL` environment variable

The main hub's `lib/landing-page/` module defines shared types and helpers for the centralized submission endpoint.

## Quick Start

1. Copy the template from `experiments/simple-seed-organizer/landing/` to your experiment:
   ```bash
   cp -r experiments/simple-seed-organizer/landing experiments/YOUR-EXPERIMENT/landing
   ```

2. Update `package.json`:
   - Change the name to `your-experiment-landing`
   - Update the port if needed (use a unique port like 3009, 3010, etc.)

3. Update `app/page.tsx`:
   - Update the experiment name, headline, subheadline
   - Customize problem/solution sections
   - Update form fields for your specific data collection needs
   - Update pricing if applicable

4. Update `app/api/waitlist/route.ts`:
   - Change the experiment name in the 'Experiment' select field
   - Update the form data fields being collected

5. Update `app/layout.tsx`:
   - Add your Meta Pixel ID (NEXT_PUBLIC_META_PIXEL_ID)
   - Add your Google Analytics ID if using

## Directory Structure

Each experiment with a landing page should have:

```
experiments/
└── your-experiment/
    ├── docs/
    │   ├── market-research.md
    │   ├── PRD.md
    │   ├── landing-page-content.md  # Copy/messaging reference
    │   └── ad-campaign-content.md   # Ad variations
    ├── landing/                      # Standalone Next.js landing page
    │   ├── app/
    │   │   ├── api/waitlist/
    │   │   ├── globals.css
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/
    │   ├── package.json
    │   └── tailwind.config.ts
    ├── prototype/                    # Actual product prototype (separate)
    └── notes/
```

## Environment Variables

All landing pages share the same Notion database for submissions:

- `NOTION_LANDING_DATABASE_ID` - Shared database ID for all landing page submissions

The database has these columns:
- Experiment (select) - Which experiment the signup is for
- Email (email) - User's email
- Opted In (checkbox) - Whether they opted in
- Opt-Out Reason (text) - If they didn't opt in, why
- Source (select) - Landing Page, Ad, etc.
- Notes (text) - Additional form data
- Timestamp (date) - Auto-populated

## Running Landing Pages

Each landing page is a standalone Next.js app that runs on its own port:

```bash
cd experiments/your-experiment/landing
npm install
npm run dev
```

## Key Components

### Hero Section
- Clear headline communicating the main value proposition
- Subheadline with supporting context
- Primary CTA button
- Optional hero image or mockup

### Problem Section
- 3-4 problem points your target audience experiences
- Each with icon, title, and brief description

### Solution Section  
- Features that solve the problems
- Visual mockups if available
- "What makes it different" differentiators

### Pricing Section
- Clear price display
- What's included list
- Early bird discount if applicable

### Interest Form
- Email (required)
- Name (optional)
- Segmentation questions (optional)
- Submit button
- Privacy note

## Analytics Events

Track these events for campaign optimization:

1. `page_view` - Landing page loaded
2. `cta_click` - Any CTA button clicked
3. `form_start` - User focuses on email field
4. `form_submission` - Form successfully submitted

For Meta Pixel, use `CompleteRegistration` event on form submission.

## Best Practices

1. **Mobile-first**: Most ad traffic is mobile
2. **Fast loading**: Keep under 3 seconds
3. **Clear CTA**: One obvious action to take
4. **Social proof**: Add testimonials when available
5. **Trust indicators**: Privacy note, unsubscribe info
6. **No navigation away**: Keep users on the page
