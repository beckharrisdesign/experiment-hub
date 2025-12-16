# Simple Seed Organizer - Landing Page

A static HTML landing page for validating interest in the Simple Seed Organizer app.

## Files

- `index.html` - Main landing page
- `script.js` - Form handling and interactions

## Development

To run locally, use any static file server:

```bash
# Python
python -m http.server 3001

# Node.js (npx)
npx serve -p 3001

# PHP
php -S localhost:3001
```

Then open http://localhost:3001

## Form Submission

The form submits to the Experiment Hub's API endpoint:
- Development: Update `HUB_API_URL` in `script.js` to point to your local hub
- Production: Update `HUB_API_URL` to your deployed hub URL (e.g., `https://experiment-hub.replit.app`)

## Deployment

This is a static site - deploy to any static hosting:
- Replit (Static deployment)
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

For Replit static deployment:
1. Create a new Replit or use a separate deployment
2. Set deployment type to "Static"
3. Set public directory to the landing folder
4. Add your custom subdomain in deployment settings

## Form Data

The form collects:
- Email (required)
- Name (optional)
- Seed count category
- Biggest organizing challenges

All data is submitted to the shared Notion landing database with the experiment name tagged.

## Analytics

The page supports:
- Meta Pixel (Facebook) - `CompleteRegistration` event on form submission
- Google Analytics - `form_submission` event

Add your tracking scripts to the `<head>` section of `index.html`.
