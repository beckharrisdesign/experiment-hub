# Google Analytics Setup

The app uses Google Analytics 4 (GA4) for page views and basic analytics.

## 1. Get your Measurement ID

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a property (or use an existing one)
3. Set up a **Web** data stream for your app URL
4. Copy the **Measurement ID** (format: `G-XXXXXXXXXX`)

## 2. Add to your environment

**Local (.env.local):**
```
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

**Vercel:** Add `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` in Project → Settings → Environment Variables.

## 3. Where it's used

The GA script is loaded in `app/layout.tsx`. It only runs when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is set. Page views are tracked automatically.

## 4. Custom events (optional)

To track custom events (e.g. signup, conversion), use the global `gtag`:

```ts
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Example: track signup
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', 'sign_up', { method: 'email' });
}
```
