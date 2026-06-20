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

## 4. Custom events

Don't call `gtag` directly. Use the typed helpers in [`lib/analytics.ts`](lib/analytics.ts),
which no-op safely when GA is not loaded (local dev, tests, GA ID unset):

```ts
import { trackSeedAdded } from '@/lib/analytics';

trackSeedAdded({ method: 'manual', seedType: 'tomato' });
```

### Events currently emitted

These map 1:1 to the PRD "failing tests" (`docs/PRD.md` → Success Metrics), so the
GA4 dashboard can answer each one directly.

| Event | Key params | PRD signal it measures |
|---|---|---|
| `sign_up` | `method` | Baseline acquisition; `user_id` is also set on the session for return-use analysis |
| `seed_added` | `method` (`manual` / `import_review` / `import_auto`), `seed_type` | Import vs. manual mix — is the capture path carrying weight? |
| `search_performed` | `query_length`, `result_count`, `ms_to_results` | Search is actually used to narrow the list |
| `seed_opened` | `from_search`, `ms_since_search_start` | True time-to-find: search → open a known packet (target <10s) |
| `use_first_filter_used` | `result_count` | Use First filter adoption (not zero after onboarding) |
| `save_error` | `context`, `message` | Manual-add reliability |
| `import_error` | `context`, `message` | Import reliability |

### Suggested GA4 setup

- Mark `sign_up` and `seed_added` as **key events** (conversions).
- Build an exploration on `seed_opened` filtered to `from_search = true`, charting
  the `ms_since_search_start` distribution against the 10s target.
- Segment `seed_added` by `method` to watch the import-vs-manual ratio over 30 days.
