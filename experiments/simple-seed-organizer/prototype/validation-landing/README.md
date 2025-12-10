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

Currently, the form just logs to console. To collect emails, integrate with:

- **Mailchimp**: Use Mailchimp API
- **ConvertKit**: Use ConvertKit API
- **Google Sheets**: Use Google Apps Script
- **Simple API**: Create a simple API endpoint to store emails

### Example: Google Sheets Integration

1. Create a Google Sheet
2. Use Google Apps Script to create an API endpoint
3. Update form submission in `app/page.tsx` to POST to your endpoint

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

### Facebook Pixel

Add to `app/layout.tsx`:

```tsx
<Script id="facebook-pixel" strategy="afterInteractive">
  {`
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', 'YOUR_PIXEL_ID');
    fbq('track', 'PageView');
  `}
</Script>
```

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
