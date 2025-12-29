# Simple Seed Organizer - Product Requirements Document

## Design

**Figma Make Prototype**: [Seed Collection Tracker App](https://www.figma.com/make/3KLrBwkhXzE52TfcsyOdBZ/Seed-Collection-Tracker-App?node-id=0-1&t=9nRR5RQyd7y32aNE-1)

**Figma Design File**: [Simple Seed Organizer](https://www.figma.com/design/3OcfOyLd4qDonrA44TcE46/Simple-Seed-Organizer?node-id=5-29)

## Prototype

**Location**: `experiments/simple-seed-organizer/prototype/app/`

**Run locally**:

```bash
cd experiments/simple-seed-organizer/prototype/app
npm run dev
# Opens at http://localhost:3001
```

## Overview

Simple Seed Organizer is a super simple mobile/web app that lets home gardeners store seed information and retrieve it when needed—nothing more, nothing less. It eliminates the complexity of garden planning, calendars, and design features found in other gardening apps, focusing exclusively on seed inventory tracking. The product will be validated through a landing page and targeted ads before building the MVP to ensure there's genuine buying intent for this simplicity-focused approach.

## Problem Statement

Home gardeners who collect seeds face a frustrating problem: they can't easily track what seeds they have, which ones are still viable, and what information they need when planting. Existing gardening apps solve this by adding garden planning, planting calendars, design tools, and complex features that overwhelm users who just want to:

- Know what seeds they own
- Find seed information quickly (planting depth, spacing, days to maturity)
- Track seed viability (which packets are still good)
- Avoid rebuying seeds they already have
- Prioritize which seeds to use first (before they expire)

The market is underserved: most solutions are either too complex (garden planning apps) or too basic (free apps with calendar features). There's a clear gap for a simple, paid tool that does one thing well: seed inventory management.

## Goals & Objectives

### Primary Goals

1. **Simplicity First**: Build the simplest possible seed organizing tool—no garden planning, no calendars, no design features
2. **Mobile-First Access**: Users can quickly access their seed inventory on their phone when shopping or planning
3. **Validate Demand**: Measure buying intent through landing page + ads before building MVP
4. **Fast Information Retrieval**: Users can find seed info in < 10 seconds
5. **Viability Tracking**: Help users know which seeds are still good to plant

### Success Metrics

**Validation Phase (Phase 1)**:

- Landing page CTR: > 2% from targeted ads
- Conversion to "buy" step: > 10% of landing page visitors
- Email signups: > 5% of landing page visitors
- **Threshold**: If metrics meet targets, proceed to MVP build

**MVP Phase (Phase 2)**:

- Time to add a seed: < 30 seconds
- Time to find seed info: < 10 seconds
- User retention: > 40% active after 30 days
- User satisfaction: > 4.0/5.0 rating

## Target User/Use Case

**Primary User**: Home gardener (hobbyist) who:

- Owns 20+ seed packets
- Wants simple inventory tracking (not garden planning)
- Uses smartphone regularly
- Frustrated with complex gardening apps
- Willing to pay $12-24/year for simplicity

**Market Context** (from market research):

- **TAM**: $162M - $243M (10.8M - 16.2M US households)
- **Target Segment**: 10-15% of 108M US gardening households
- **Primary Use Cases**:
  1. **Shopping**: "Do I already have this seed?" (check inventory before buying)
  2. **Planting**: "What's the planting depth for this seed?" (quick info lookup)
  3. **Viability**: "Which seeds should I use first?" (prioritize expiring seeds)
  4. **Organization**: "What seeds do I have?" (browse/search inventory)

## Core Features

### Feature 1: Seed Inventory

**Description**: Store and organize seed information in a simple list/collection.

**Key Capabilities**:

- Add seeds with basic info (name, variety, source, purchase date)
- View all seeds in a searchable list
- Edit/delete seeds
- Simple categorization (optional: vegetables, flowers, herbs, etc.)

**Design Principle**: Minimal fields, maximum speed. No complex forms or required fields.

### Feature 2: Seed Information Storage

**Description**: Store essential seed information for quick retrieval.

**Key Information Stored**:

- Seed name and variety
- Source/retailer (where purchased)
- Purchase date (for viability tracking)
- Planting depth (optional)
- Spacing (optional)
- Days to maturity (optional)
- Notes (free text, optional)

**Design Principle**: All fields optional except name. Users add what they need, when they need it.

### Feature 3: Quick Search & Filter

**Description**: Find seeds quickly when needed.

**Key Capabilities**:

- Search by name/variety
- Filter by category (if categorized)
- Sort by name, purchase date, or recently added
- Fast, responsive search (results in < 1 second)

**Design Principle**: Search is primary navigation. No complex filtering or advanced search needed.

### Feature 4: "Use-First" List

**Description**: Prioritize which seeds to use before they expire.

**Key Capabilities**:

- Automatically identify older seeds (based on purchase date or user-set expiration)
- Show "use-first" list of seeds that should be planted soon
- Simple visual indicator (badge or highlight) for seeds approaching expiration
- Manual override (user can mark seeds as "use first" or "still good")

**Design Principle**: Helpful but not prescriptive. Users control what's prioritized.

### Feature 5: Mobile-First Design

**Description**: Optimized for smartphone use (primary platform).

**Key Capabilities**:

- Fast loading (< 2 seconds)
- Touch-friendly interface (large buttons, easy taps)
- Works offline (data stored locally, syncs when online)
- Simple navigation (minimal taps to find info)
- Responsive design (works on web too, but mobile-optimized)

**Design Principle**: Mobile is primary, web is secondary. Design for thumb navigation.

## User Stories

### Story 1: Add a seed to inventory

**As a** home gardener, **I want to** quickly add a seed to my inventory, **so that** I can track what seeds I own.

#### 1.1 Basic seed addition

- User can add a seed with just a name (minimum required field)
- User can optionally add: variety, source, purchase date, category
- User can optionally add: planting depth, spacing, days to maturity, notes
- All optional fields can be added later (edit after creation)
- Save button adds seed to inventory immediately

#### 1.2 Quick add from shopping

- User can add seed while shopping (mobile-optimized flow)
- Camera option to take photo of seed packet (for later reference)
- Pre-fill source if user selects "add from [retailer name]"
- Auto-save purchase date to current date
- Fast save (< 2 seconds from form to saved)

#### 1.3 Edit existing seed

- User can edit any seed information after creation
- Changes save immediately
- No confirmation dialogs (undo available if needed)

### Story 2: Find seed information quickly

**As a** home gardener, **I want to** quickly find information about a seed I own, **so that** I can plant it correctly or decide if I need to buy more.

#### 2.1 Search by name

- User can search seeds by typing name or variety
- Search results appear as user types (instant search)
- Results show: name, variety, category (if set), purchase date
- Tap result to see full seed details
- "No results" message if seed not found

#### 2.2 Browse all seeds

- User can view all seeds in a scrollable list
- List shows: name, variety, category badge, purchase date
- List is sortable: by name (A-Z), by date (newest first), by date (oldest first)
- Tap any seed to view details

#### 2.3 View seed details

- User can view full information for any seed
- Details page shows: all stored information, purchase date, notes
- User can edit from details page
- User can delete from details page (with confirmation)
- Back button returns to list/search

### Story 3: Know which seeds to use first

**As a** home gardener, **I want to** see which seeds I should use soon, **so that** I don't waste seeds that are expiring.

#### 3.1 Use-first list

- App shows a "Use First" list/section
- List includes seeds older than 2 years (or user-set threshold)
- List sorted by purchase date (oldest first)
- Visual indicator (badge or highlight) shows seeds approaching expiration
- User can tap to view seed details

#### 3.2 Manual priority

- User can manually mark seeds as "use first" or "still good"
- User can set custom expiration dates for specific seeds
- User can remove seeds from use-first list if still viable
- Changes persist across app sessions

#### 3.3 Viability indicators

- App shows purchase date for each seed
- App calculates age (years since purchase)
- Visual indicator: green (new), yellow (1-2 years), red (2+ years)
- User can override indicators if seed is still viable

### Story 4: Avoid rebuying seeds

**As a** home gardener, **I want to** quickly check if I already own a seed, **so that** I don't buy duplicates.

#### 4.1 Quick check while shopping

- User can search inventory from mobile app
- Search is fast (< 1 second results)
- Clear indication if seed is already in inventory
- Shows purchase date if found (help decide if need more)

#### 4.2 Duplicate detection

- App can warn if user tries to add duplicate seed (same name/variety)
- User can choose: add anyway, edit existing, or cancel
- App suggests similar names if search finds close matches

### Story 5: Access seed info when planting

**As a** home gardener, **I want to** quickly access planting information for a seed, **so that** I can plant it correctly.

#### 5.1 Quick info access

- User can search and find seed in < 10 seconds
- Seed details show: planting depth, spacing, days to maturity (if stored)
- Information is clearly displayed (no scrolling needed for key info)
- User can add missing info on the spot (edit from details page)

#### 5.2 Offline access

- App works offline (data stored locally)
- User can view all seeds and information without internet
- Sync happens when online (if multi-device support added later)

## Technical Requirements

### Platform & Architecture

- **Primary Platform**: Mobile (iOS and Android native apps, or React Native/PWA)
- **Secondary Platform**: Web app (responsive, mobile-optimized)
- **Data Storage**: Local-first (device storage, sync optional for future)
- **Backend**: Minimal (user accounts, optional sync, payment processing)
- **Authentication**: Simple email/password or social login (Google/Apple)

### Performance Requirements

- **App Launch**: < 2 seconds to usable state
- **Search Response**: < 1 second for results
- **Add Seed**: < 2 seconds from form to saved
- **Offline Capable**: Full functionality without internet
- **Data Sync**: Optional, can be added in future phase

### Technical Constraints

- **Solo Buildable**: Must be buildable by one person with AI assistance (Cursor)
- **Simple Stack**: Use well-documented, familiar technologies
- **Low Infrastructure**: Minimal backend, low ongoing costs (< $200/month initially)
- **App Store Compliance**: Follow iOS and Android guidelines
- **Privacy**: Local data storage, optional cloud sync (future)

### Data Model

**Seed Object**:

- id (unique identifier)
- name (required, string)
- variety (optional, string)
- source (optional, string)
- purchaseDate (optional, date)
- category (optional, enum: vegetables, flowers, herbs, other)
- plantingDepth (optional, string/number)
- spacing (optional, string/number)
- daysToMaturity (optional, number)
- notes (optional, text)
- useFirst (optional, boolean)
- customExpirationDate (optional, date)
- createdAt (timestamp)
- updatedAt (timestamp)

## Implementation Approach

### Phase 1: Validation (Pre-MVP)

**Goal**: Measure buying intent before building the product.

**Deliverables**:

1. **Landing Page**: One-page site describing the problem and product promise

   - Headline: "Your simple seed inventory & 'use-first' list, on your phone"
   - Problem statement: Stop rebuying seeds, know viability, find info quickly
   - Value proposition: No planning, no calendars, just store and retrieve
   - Fake "Buy Now" or "Get Early Access for $X/year" CTA
   - Email signup form (capture interest)

2. **Ad Campaign**: 3-6 ad variants on Meta/Pinterest

   - Angles: "Stop rebuying the same seeds", "Know which packets are still viable", "Turn your messy seed box into a searchable library"
   - Target: Gardening interests, seed-related keywords
   - Budget: Small ($100-500 to start)
   - Track: CTR, landing page visits, conversion to "buy" step, email signups

3. **Analytics Setup**: Track key metrics
   - Landing page views
   - CTA clicks (fake buy button)
   - Email signups
   - Time on page
   - Bounce rate

**Success Criteria**:

- CTR from ads: > 2%
- Conversion to "buy" step: > 10% of landing page visitors
- Email signups: > 5% of landing page visitors
- **Decision Threshold**: If metrics meet targets, proceed to Phase 2. If not, pivot or abandon.

**Timeline**: 1-2 weeks (landing page build + ad setup + 1-2 weeks of data collection)

### Phase 2: MVP (Minimum Viable Product)

**Goal**: Build the simplest version that delivers core value.

**Scope**: Core features only (Stories 1-5, basic implementation)

**Deliverables**:

1. **Mobile App** (iOS + Android, or React Native/PWA)

   - Seed inventory (add, view, edit, delete)
   - Search functionality
   - Seed details page
   - Use-first list (basic implementation)
   - Local data storage

2. **User Accounts**: Simple authentication

   - Email/password signup
   - Login/logout
   - Password reset

3. **Payment Integration**: Subscription setup

   - $12-15/year pricing
   - Stripe or similar payment processor
   - Free trial period (7-14 days)

4. **Basic Analytics**: Track usage
   - User signups
   - Active users
   - Feature usage
   - Retention metrics

**Out of Scope for MVP**:

- Multi-device sync
- Photo uploads
- Advanced filtering
- Export functionality
- Social features
- Garden planning features (explicitly excluded)

**Timeline**: 2-3 months (solo build with AI assistance)

### Phase 3: Growth Features (Post-MVP)

**Goal**: Enhance product based on user feedback and usage data.

**Potential Features** (to be validated with users):

- Photo uploads for seed packets
- Multi-device sync (cloud backup)
- Export data (CSV, PDF)
- Barcode scanning (if seed packets have barcodes)
- Seed sharing (optional social feature)
- Reminders (nudge to use expiring seeds)

**Timeline**: Ongoing, based on user feedback and business needs

## Non-Requirements

**Explicitly Out of Scope** (core to product positioning):

1. **Garden Planning**: No plot design, layout planning, or garden design features
2. **Planting Calendars**: No planting schedules, frost dates, or calendar features
3. **Plant Care Guides**: No watering schedules, fertilizing reminders, or care instructions
4. **Weather Integration**: No weather data, frost warnings, or climate features
5. **Social Features**: No sharing gardens, community features, or social networking (initially)
6. **Plant Identification**: No AI plant ID, photo recognition, or identification features
7. **Retailer Integration**: No direct integration with seed retailers or e-commerce
8. **Complex Filtering**: No advanced search, complex filters, or query builders

**Rationale**: These features add complexity and move away from the core value proposition: simple seed inventory management. If users request these, it may indicate the product isn't right for them, or they should use a different tool.

## Future Considerations

**Potential Enhancements** (if validated by user demand):

1. **Photo Storage**: Allow users to upload photos of seed packets for visual reference
2. **Cloud Sync**: Multi-device sync so users can access inventory on phone, tablet, and web
3. **Data Export**: Export seed inventory to CSV or PDF for backup or sharing
4. **Barcode Scanning**: Scan barcodes on seed packets to auto-populate information
5. **Seed Swapping**: Optional feature to share seed inventory with other gardeners
6. **Reminders**: Push notifications to remind users about expiring seeds
7. **Batch Operations**: Add multiple seeds at once, bulk edit, bulk delete

**Decision Framework**: Only add features if:

- Users explicitly request them
- They don't add significant complexity
- They align with "simple inventory" positioning
- They don't require garden planning or calendar features

## Success Metrics & Validation

### Validation Phase Metrics

- **Landing Page CTR**: Target > 2% from ads
- **Conversion to Buy Step**: Target > 10% of landing page visitors
- **Email Signups**: Target > 5% of landing page visitors
- **Cost per Signup**: Track to understand acquisition cost
- **Qualitative Feedback**: Survey signups about pain points and willingness to pay

### MVP Phase Metrics

- **User Acquisition**: Track signups, conversion from trial to paid
- **Activation**: % of users who add at least 5 seeds (meaningful usage)
- **Retention**: % of users active after 7, 30, 90 days
- **Engagement**: Average seeds per user, search frequency, use-first list usage
- **Satisfaction**: App store ratings, user feedback, NPS score
- **Revenue**: MRR, churn rate, LTV

### Go/No-Go Decision Points

**After Validation Phase**:

- If metrics meet thresholds → Proceed to MVP
- If metrics below thresholds → Pivot positioning, adjust messaging, or abandon
- If unclear → Extend validation period, test different ad angles

**After MVP Launch**:

- If retention > 40% after 30 days → Continue building, add growth features
- If retention < 40% → Analyze why, iterate on core features, or consider pivot
- If revenue path unclear → Reassess pricing, positioning, or market fit

## Market Context

**Market Opportunity** (from market research):

- **TAM**: $162M - $243M
- **Target Users**: 10.8M - 16.2M US households
- **Pricing**: $12-15/year (competitive with Planter, cheaper than SeedTime)
- **Differentiation**: Simple inventory-only vs. complex planning tools

**Competitive Positioning**:

- **vs. SeedTime** ($109/year): Simpler, cheaper, no planning features
- **vs. Planter** ($12/year): Similar price, but we focus on inventory not planning
- **vs. SeedSync** (free): Paid simplicity with better UX, no calendar features

**Key Success Factors**:

1. Maintain simplicity (resist feature creep)
2. Fast, intuitive mobile UX
3. Clear value proposition (simple inventory, not planning)
4. Validate demand before building
5. Focus on core use cases (shopping, planting, viability)
