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

## Simplified vs Full Landing Pages

Landing pages can range from minimal to comprehensive. Start simple and add complexity only if needed.

### Minimal Landing Page (Recommended to Start)

A minimal landing page has just:
- **Headline**: One clear value proposition
- **Subheadline**: 1-2 sentences of context
- **Email capture form**: Just email field + submit button
- **Simple styling**: Tailwind CDN, no custom assets

This is ~50-100 lines of HTML. Use this to quickly validate if there's any interest before investing in design.

**index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Product - One Line Value Prop</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Your Headline Here</h1>
    <p class="text-gray-600 mb-6">Brief description of what you're building and who it's for.</p>
    <form id="signup-form" class="space-y-4">
      <input type="email" name="email" required placeholder="Enter your email"
             class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500">
      <button type="submit" class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
        Get Early Access
      </button>
    </form>
    <p class="text-xs text-gray-500 mt-4">We'll notify you when it's ready. No spam.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>
```

**script.js:**
```javascript
const HUB_API_URL = 'https://your-hub.replit.app';

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const btn = e.target.querySelector('button');
  
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  
  try {
    await fetch(`${HUB_API_URL}/api/landing-submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        experiment: 'your-experiment-name',
        source: 'landing-page',
        optedIn: true
      })
    });
    document.querySelector('.max-w-md').innerHTML = `
      <h2 class="text-2xl font-bold text-green-600 mb-2">You're on the list!</h2>
      <p class="text-gray-600">We'll email you when it's ready.</p>
    `;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Try Again';
  }
});
```

### Full Landing Page

A full landing page adds:
- Problem/pain points section
- Solution/features section
- Pricing information
- Social proof/testimonials
- Multiple CTAs
- App mockups or screenshots
- FAQ section

Use the Simple Seed Organizer landing page as a reference for a full implementation.

### When to Use Each

| Scenario | Recommendation |
|----------|----------------|
| Testing a new idea quickly | Minimal |
| Running first ad campaign | Minimal |
| Idea validated, scaling ads | Full |
| High-ticket product | Full |
| B2B with complex value prop | Full |

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
