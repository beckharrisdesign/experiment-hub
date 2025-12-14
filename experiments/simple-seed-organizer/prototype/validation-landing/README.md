# Simple Seed Organizer - Validation Landing Page

This is the landing page for validating demand for Simple Seed Organizer before building the MVP.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy automatically

### Netlify

1. Push to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`

## Email Integration

The form is currently set up to save submissions to a Notion database.

### Notion Integration (Current Setup)

1. **Create a Notion Integration**:

   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name (e.g., "Simple Seed Organizer Waitlist")
   - Copy the "Internal Integration Token" (starts with `secret_`)

2. **Create a Notion Database**:

   - Create a new database in Notion
   - Add the following properties:
     - `Email` (type: Email) - required
     - `Name` (type: Text) - optional
     - `Seed Count` (type: Select) - optional
     - `Challenges` (type: Multi-select) - optional
     - `Signed Up` (type: Date) - auto-populated
   - Click "..." menu → "Connections" → Add your integration

3. **Get Database ID**:

   - Open the database in Notion
   - Copy the database ID from the URL: `https://www.notion.so/workspace/DATABASE_ID?v=...`
   - The database ID is the 32-character string before the `?`

4. **Set Environment Variables**:

   - Create a `.env.local` file in the project root
   - Add:
     ```
     NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
     ```

5. **Test the Integration**:
   - Submit the form on the landing page
   - Check your Notion database for the new entry

### Alternative Integrations

- **Mailchimp**: Use Mailchimp API
- **ConvertKit**: Use ConvertKit API
- **Google Sheets**: Use Google Apps Script

## Analytics Setup

### Google Analytics

Add to `app/layout.tsx`:

```tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  `}
</Script>
```

### Meta Pixel (Facebook Pixel)

The Meta Pixel is already integrated and will track:

- **PageView**: Automatically tracked on page load
- **CompleteRegistration**: Tracked when users submit the waitlist form (value: $0.25, currency: USD)

**Setup**:

1. Get your Pixel ID from [Meta Events Manager](https://business.facebook.com/events_manager)
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
   ```

The pixel is configured in `app/layout.tsx` and the CompleteRegistration event is tracked in the form submission handler.

## UTM Tracking

The page automatically tracks UTM parameters from ad campaigns. Make sure your ad links include:

```
?utm_source=meta&utm_medium=social&utm_campaign=validation&utm_content=variant1
```

## Success Metrics

Track these metrics to evaluate validation:

- **Landing page views**: Total visitors
- **CTA clicks**: Clicks on "Get Early Access" buttons
- **Form starts**: Users who begin filling the form
- **Form completions**: Users who submit the form
- **Conversion rate**: Form completions / Landing page views (target: > 10%)

## Next Steps

1. Set up email collection (Mailchimp, ConvertKit, etc.)
2. Add analytics (Google Analytics, Facebook Pixel)
3. Deploy to production (Vercel, Netlify)
4. Launch ad campaigns (see `../docs/ad-campaign-content.md`)
5. Monitor metrics for 1-2 weeks
6. Evaluate against success criteria (see PRD Phase 1)

## Files

- `app/page.tsx`: Main landing page component
- `app/layout.tsx`: Root layout with metadata
- `app/globals.css`: Global styles with Tailwind
- `docs/landing-page-content.md`: Content reference
- `docs/ad-campaign-content.md`: Ad campaign content
