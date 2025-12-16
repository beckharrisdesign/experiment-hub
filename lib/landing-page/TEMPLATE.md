# Landing Page Template Guide

This document describes how to create a validation landing page for any experiment.

## Architecture

Landing pages are **static HTML/CSS/JS files** that can be deployed anywhere. This is intentional:

- Landing pages are deployed to unique URLs/subdomains for ad campaigns
- They can run on different ports during development (any static server)
- They're self-contained for easy, cheap deployment
- No server runtime needed - just static file hosting

**Centralized Submissions**: All landing page form submissions are routed to the Experiment Hub's `/api/landing-submission` endpoint. This means:

- Landing pages don't need the Notion SDK or authentication logic
- All submissions go through one centralized API
- The hub handles Notion integration and data storage
- Landing pages only need to set `HUB_API_URL` in their JavaScript

## Quick Start

1. Copy the template from `experiments/simple-seed-organizer/landing/` to your experiment:
   ```bash
   cp -r experiments/simple-seed-organizer/landing experiments/YOUR-EXPERIMENT/landing
   ```

2. Update `index.html`:
   - Update the page title and meta description
   - Update the experiment name, headline, subheadline
   - Customize problem/solution sections
   - Update pricing if applicable
   - Add analytics scripts (Meta Pixel, Google Analytics) to `<head>`

3. Update `script.js`:
   - Change `HUB_API_URL` to your deployed hub URL
   - Update the `experiment` field in form data
   - Modify form fields if needed

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
    ├── landing/                      # Static landing page
    │   ├── index.html               # Main HTML page
    │   ├── script.js                # Form handling
    │   └── README.md                # Setup instructions
    ├── prototype/                    # Actual product prototype (separate)
    └── notes/
```

## Running Landing Pages Locally

Use any static file server:

```bash
cd experiments/your-experiment/landing

# Python
python -m http.server 3001

# Node.js
npx serve -p 3001

# PHP
php -S localhost:3001
```

Then open http://localhost:3001

## Form Submission

Forms POST to the hub's `/api/landing-submission` endpoint with this structure:

```javascript
{
  email: 'user@example.com',
  name: 'User Name',
  experiment: 'your-experiment-name',
  source: 'landing-page',
  optedIn: true,
  // ... custom fields as notes
}
```

Update `HUB_API_URL` in `script.js`:
- Development: Your local hub (e.g., `http://localhost:5000`)
- Production: Your deployed hub (e.g., `https://experiment-hub.replit.app`)

## Deployment

Since these are static files, deploy to any static hosting:

### Replit Static Deployment
1. Create a new Replit (or separate deployment)
2. Set deployment type to "Static"
3. Set public directory to the landing folder
4. Add your custom subdomain in deployment settings

### Other Options
- Netlify (free tier available)
- Vercel (free tier available)
- GitHub Pages (free)
- Cloudflare Pages (free tier available)
- AWS S3 + CloudFront

## Key Sections

### Hero Section
- Clear headline communicating the main value proposition
- Subheadline with supporting context
- Primary CTA button
- Uses Tailwind CSS via CDN for styling

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

Add tracking scripts to `<head>` in index.html:

```html
<!-- Meta Pixel -->
<script>
  !function(f,b,e,v,n,t,s) { ... }
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

The form submission in `script.js` automatically tracks:
- `CompleteRegistration` (Meta Pixel)
- `form_submission` event (Google Analytics)

## Best Practices

1. **Mobile-first**: Most ad traffic is mobile
2. **Fast loading**: Static files load fast, Tailwind CDN adds minimal overhead
3. **Clear CTA**: One obvious action to take
4. **Social proof**: Add testimonials when available
5. **Trust indicators**: Privacy note, unsubscribe info
6. **No navigation away**: Keep users on the page

## Production Notes

For production deployments, consider:
- Replacing Tailwind CDN with a pre-built CSS file (use Tailwind CLI)
- Minifying HTML and JavaScript
- Adding proper caching headers
- Setting up SSL certificate for custom domain
