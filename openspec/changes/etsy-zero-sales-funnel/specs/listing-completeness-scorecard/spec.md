# Spec — listing-completeness-scorecard

## Outcomes

(See [proposal.md](../../proposal.md) Outcomes.)

- **Who:** Katy (super-early Etsy shop, ~20 listings, zero sales) + anyone reading the public labs page.
- **Job:** See per listing whether it is objectively *finished* to Etsy's standard, separating "not done yet" from "done, needs a real test."
- **Done when:** The labs project page publicly shows each listing's completeness score and a ranked "fix these first" list, computed only from already-captured data.
- **Not doing:** No Etsy writes; no A/B tests or copy suggestions; no sales/reviews data; no favorites-trend (L2) or tag-map (L3); attributes/properties deferred.

## ADDED Requirements

### Requirement: Tier A publishability gate

Every captured listing is judged pass/fail on the hard, Etsy-enforced "can this even be a good published listing" criteria, and any failing check is named.

**Fails until:** a listing missing a required field (e.g. no photo, `quantity` = 0) is shown as gate-complete.

The scorecard SHALL mark a listing Tier-A **complete** only when all applicable gate criteria (title, description, price > 0, `quantity` > 0, ≥ 1 image, `who_made`/`when_made`/`is_supply`, `taxonomy_id`, `state = active`, plus `shipping_profile_id` and `readiness_state_id` for physical listings) are present, and SHALL list each failing criterion by name otherwise.

#### Scenario: Listing missing a required field is flagged with the reason

- **WHEN** a captured listing has no image, or `quantity` = 0, or an empty title/description, or `price` = 0
- **THEN** it is marked "Not publishable-complete" and the specific failing gate criterion (or criteria) is named.

#### Scenario: Fully-gated listing passes Tier A

- **WHEN** a listing has every applicable Tier-A criterion present
- **THEN** it is marked Tier-A complete with no failing criteria.

### Requirement: Tier B completeness percentage

Every captured listing receives a 0–100% completeness score over the soft quality/SEO criteria that are computable from already-captured data.

The scorecard SHALL compute Tier B as the share of *applicable* criteria met (photo count vs. 10, has video, image alt text, tag count vs. 13, title length, materials, styles, section assigned, return policy set, description depth), weighting each applicable criterion equally in v1, and SHALL exclude criteria that do not apply to the listing type from its denominator.

#### Scenario: Percentage reflects how many criteria are met

- **WHEN** a listing meets 6 of its 10 applicable Tier-B criteria
- **THEN** its completeness score reads ~60%, with the unmet criteria itemized.

#### Scenario: Digital listing excludes physical-only criteria

- **WHEN** a listing's `listing_type` is `download`
- **THEN** shipping, processing, and return-policy criteria are excluded from its denominator rather than counted as failures.

### Requirement: Full sortable scorecard table, fix-first by default

Every captured listing appears as one condensed row in a sortable table that defaults to fix-first order, so the founder can both scan the whole shop and re-sort to explore.

The scorecard SHALL render every captured listing as exactly one single-line row (no truncation or "+N more" collapse) using the same table component/conventions as the hub's main experiments table, SHALL default-sort with any Tier-A-failure listing above all Tier-A-complete listings and ascending Tier-B percentage within each group, SHALL let the user re-sort by a column with the active sort indicated, and SHALL link each listing (in both the table and the "fix these first" list) to its Etsy listing edit view.

#### Scenario: Every captured listing shows as one condensed row

- **WHEN** a shop with 20+ captured listings is scored
- **THEN** every listing renders as its own single-line row and none are hidden behind a "+N more" affordance.

#### Scenario: Table loads in fix-first order

- **WHEN** the scorecard table first loads
- **THEN** listings with a Tier-A failure appear above every Tier-A-complete listing, and within each group the lowest Tier-B % appears first.

#### Scenario: User re-sorts by a column

- **WHEN** the user activates a sortable column header (e.g. Completeness or Publishable)
- **THEN** the rows reorder by that column and the active sort column and direction are indicated.

#### Scenario: Each listing links to its Etsy edit view

- **WHEN** the founder clicks a listing in the table or the fix-first list
- **THEN** it opens that listing's Etsy edit view (`etsy.com/your/shops/me/listing-editor/edit/{listing_id}`) so the fix can be made immediately.

### Requirement: Public read-only surface on the labs project page

The scorecard is a public artifact on the labs project page; the sync trigger stays authenticated and no buyer/account data is exposed.

**Fails until:** the scorecard requires auth to view, or a sync trigger appears on the public page, or any buyer/account PII is rendered.

The scorecard SHALL render on the public experiment page (`app/experiments/[slug]/page.tsx`) without authentication, showing each listing's Tier-A status, Tier-B %, and the fix-first list, and SHALL expose no sync trigger and no buyer/account PII (scores and listing-field flags only).

#### Scenario: Scores are visible to an anonymous visitor

- **WHEN** an unauthenticated visitor opens the etsy-notion-sync labs project page
- **THEN** they see each listing's Tier-A status, Tier-B %, and the fix-first list, with no buyer or account data present.

#### Scenario: Sync trigger stays on the authenticated admin

- **WHEN** viewing the public scorecard
- **THEN** there is no way to kick off a sync from it; the trigger remains only on the authenticated admin panel.

### Requirement: Computed from already-captured data, no new Etsy calls

Producing the scorecard reads the latest captured snapshot and makes no live Etsy request.

The scorecard SHALL derive every scored criterion from the most recent captured listing snapshot (the existing `includes` set + inventory), SHALL NOT issue any new Etsy API call, and SHALL show attributes/properties as "deferred — not scored" rather than fetching them.

#### Scenario: Scorecard produced without contacting Etsy

- **WHEN** a scorecard is generated
- **THEN** it is computed from the latest stored snapshot only, with no new Etsy request, and the deferred attributes criterion is labeled "not scored" rather than silently omitted.
