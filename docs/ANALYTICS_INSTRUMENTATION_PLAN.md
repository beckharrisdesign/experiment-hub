# Analytics instrumentation plan

## Goals

- Measure which experiments people engage with across the hub, landing
  pages, and MVP prototypes.
- Standardize naming so reports can be compared across surfaces.
- Start with low-complexity GA4 instrumentation before adding GTM or
  server-side event forwarding.

## Current state

- **Hub** (`app/`) has no analytics wiring yet.
- **Simple Seed Organizer prototype** already loads GA4 directly in its
  nested Next app.
- **Static landing pages** contain `gtag(...)` calls for form submission
  in a couple of places, but the GA script is not consistently loaded.
- There is no shared analytics helper, no event schema module, and no
  consent layer in the repo today.

## Recommended approach

Use **direct GA4** first, not GTM.

Why:

- it matches the one implementation already in the repo
- it is easier to reason about in a multi-surface codebase
- it keeps phase 1 focused on reliable event collection instead of tag
  management overhead

## Streams

- **Hub stream**: use the existing BHD Labs stream for
  `https://labs.beckharrisdesign.com`
  - Measurement ID: `G-120M120GDY`
- **Landing pages on the same domain**: use the same hub stream
- **Standalone public prototypes on separate domains**: create one web
  stream per production domain when those prototypes are publicly hosted

## Event naming principles

- Use GA4-friendly lowercase snake case event names
- Keep names consistent across surfaces
- Include `experiment_slug` and `surface_type` whenever applicable

### Shared event parameters

- `surface_type` — `hub`, `landing`, or `prototype`
- `surface_name` — human-readable surface name when helpful
- `experiment_slug` — slug for the experiment involved
- `page_path`
- `page_title`
- `cta_name`
- `destination_url`
- `utm_source`
- `utm_medium`
- `utm_campaign`

## Phase plan

### Phase 1: instrument the hub

Scope:

- `app/layout.tsx`
- `next.config.js`
- shared analytics helper modules
- core hub navigation and experiment links

Deliverables:

- shared GA4 helper for the root Next app
- pageview tracking on route changes
- delegated click tracking using `data-analytics-*` attributes
- CSP updates required for GA4 network requests
- focused tests for the analytics helpers

Phase 1 events:

- `page_view`
- `navigation_click`
- `experiment_card_click`
- `experiment_score_click`
- `scaffolding_link_click`

### Phase 2: instrument landing pages

Scope:

- `public/landing/*`
- corresponding source landing pages in `experiments/*/landing/*` as needed

Deliverables:

- shared GA snippet/include for static landings
- consistent conversion and CTA tracking
- UTM capture on first page load

Landing events:

- `landing_view`
- `scroll_50`
- `scroll_90`
- `cta_click`
- `form_start`
- `form_submit_success`
- `form_submit_error`

### Phase 3: instrument MVP prototypes

Start with:

- Simple Seed Organizer
- Seed Finder
- Etsy Listing Manager

Deliverables:

- adopt the shared analytics helper pattern in each public prototype
- add 1-3 activation events per prototype

Prototype event examples:

- Simple Seed Organizer:
  - `sign_up`
  - `seed_added`
  - `seed_import_completed`
- Seed Finder:
  - `zipcode_submitted`
  - `results_viewed`
- Etsy Listing Manager:
  - `listing_created`
  - `listing_scored`

### Phase 4: attribution and persistence

- parse and persist UTM params on first touch and latest touch
- attach attribution params to conversion events
- store attribution with backend form submissions where possible

### Phase 5: reporting

Questions to answer:

- Which experiments get the most interest from hub visitors?
- Which landing pages convert best?
- Which prototypes reach activation?
- Which traffic sources lead to meaningful prototype usage?

## Phase 1 implementation notes

### Hub entry points

- `app/layout.tsx` — load GA4 scripts and install client-side tracking
- `app/page-client.tsx` — annotate high-value experiment and scaffolding links
- `components/Header.tsx` — annotate primary navigation links
- `components/Sidebar.tsx` — annotate sidebar navigation links

### CSP updates required

The hub currently blocks GA4 by default. Add the following allowances:

- `script-src`: `https://www.googletagmanager.com`
- `connect-src`:
  - `https://www.google-analytics.com`
  - `https://region1.google-analytics.com`
  - `https://www.googletagmanager.com`
- `img-src`:
  - `https://www.google-analytics.com`
  - `https://www.googletagmanager.com`

### Technical approach

- load GA only when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is set
- keep tracking logic inside a small client component mounted in the
  root layout
- track route changes with `usePathname()` and `useSearchParams()`
- track clicks via a single delegated listener that looks for
  `data-analytics-event` and related attributes on links/buttons

This avoids turning server-rendered routes into client components just
to emit analytics events.

## Rollout checklist

### Phase 1

- [x] Add shared analytics helper modules
- [x] Load GA4 in the hub root layout
- [x] Update CSP for GA
- [x] Track SPA pageviews
- [x] Annotate hub navigation links
- [x] Annotate experiment and scaffolding links
- [x] Add tests for helper behavior

### Phase 2

- [ ] Add GA loading to static landings
- [ ] Standardize landing conversion events
- [ ] Add scroll and CTA tracking

### Phase 3

- [ ] Refactor Simple Seed Organizer to shared helper
- [ ] Instrument Seed Finder
- [ ] Instrument Etsy Listing Manager

### Phase 4+

- [ ] Add UTM persistence
- [ ] Add server-side conversion mirroring where it matters
- [ ] Build simple reporting views/dashboards
