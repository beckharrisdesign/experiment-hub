# Simple Seed Organizer - Landing Page

This is the validation landing page for the Simple Seed Organizer experiment. It's used to validate market demand through ad campaigns before building a full prototype.

## Running the Landing Page

```bash
cd experiments/simple-seed-organizer/landing
npm install
npm run dev
```

The landing page runs on port 3008 by default.

## Environment Variables

- `HUB_API_URL` - URL of the Experiment Hub API (defaults to `http://localhost:5000`)
- `NEXT_PUBLIC_META_PIXEL_ID` - (Optional) Meta/Facebook Pixel ID for conversion tracking

All form submissions are sent to the hub's centralized `/api/landing-submission` endpoint, which handles Notion storage.

## Structure

```
landing/
├── app/
│   ├── api/waitlist/    # API endpoint for form submissions
│   ├── globals.css      # Tailwind styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main landing page component
├── components/
│   └── Mockups.tsx      # App mockup components for the landing page
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Form Data

The form collects:
- Email (required)
- Name (optional)
- Seed count category
- Biggest organizing challenges

All data is submitted to the shared Notion landing database with the experiment name tagged.

## Analytics

The page includes tracking for:
- Meta Pixel (CompleteRegistration event)
- Google Analytics events (cta_click, form_submission)

Update the tracking pixels in `app/layout.tsx` for your specific campaign.
