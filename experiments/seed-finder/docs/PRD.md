# Seed Finder - Product Requirements Document (Local Prototype)

## Overview

Seed Finder is a local prototype for a seed database that helps gardeners discover seeds suited for their zip code. This version focuses on core functionality: matching seeds to zip codes via hardiness zones, displayed in a simple web interface running locally.

**Scope**: Local development and testing only. No deployment, no SEO, no external services.

## Problem Statement

Gardeners struggle to find seeds suited for their location. They can't easily see which seeds will actually grow in their hardiness zone. This prototype demonstrates the core concept: matching seeds to zip codes via hardiness zones.

## Goals & Objectives

### Primary Goals (Prototype)

1. **Hardiness Zone Matching**: Show seeds that actually grow in a zip code's hardiness zone
2. **Zip Code Pages**: Display seeds for any zip code entered
3. **Seed Detail Pages**: Show detailed information about each seed
4. **Local Testing**: Run everything locally with sample data

### Success Criteria (Prototype)

- ✅ Can view seeds for a zip code (e.g., `/zip/90210`)
- ✅ Seeds are filtered by hardiness zone match
- ✅ Can view individual seed details (e.g., `/seeds/tomato-roma`)
- ✅ Sample data loads and displays correctly
- ✅ Runs locally on `localhost:3000`

## Target User/Use Case (Prototype)

**Primary User**: Developer testing the prototype locally

**Primary Use Case**: Developer visits `http://localhost:3000/zip/90210` and sees a list of seeds that grow in hardiness zone 10, with links to seed detail pages.

## Core Features (Prototype)

### Feature 1: Zip Code Pages

- Dynamic pages for each zip code (e.g., `/zip/90210`)
- Shows seeds suited for that zip code's hardiness zone (hardiness zone matching)
- Displays city and state name if available
- Lists seeds with basic info (name, category)
- Links to seed detail pages
- Invalid zip codes show "No seeds found" or 404

### Feature 2: Seed Detail Pages

- Individual pages for each seed (e.g., `/seeds/tomato-roma`)
- Full seed information: English name, Latin name, category, hardiness zones
- Links back to example zip code pages where seed is available
- Simple, clean display

### Feature 3: Seed Database (Local)

- Seed information: English name, Latin name, category, hardiness zones
- Stored in local SQLite database
- Sample data script to populate with 10-20 seeds for testing
- Zip code to hardiness zone mapping (sample data)

## User Stories (Prototype)

### Story 1: View seeds for a zip code

**As a** developer, **I want to** visit a zip code page, **so that** I can see which seeds grow in that area.

#### 1.1 Zip code page

- Visit `/zip/90210` shows seeds for hardiness zone 10
- Seeds are filtered by hardiness zone match
- Page shows city/state if available
- Each seed links to its detail page
- Invalid zip codes show appropriate message

### Story 2: View seed details

**As a** developer, **I want to** view seed information, **so that** I can see all details about a seed.

#### 2.1 Seed detail page

- Visit `/seeds/tomato-roma` shows full seed information
- Shows English name, Latin name, category, hardiness zones
- Links back to example zip codes where seed grows
- Simple, readable format

### Story 3: Load sample data

**As a** developer, **I want to** run a script, **so that** the database is populated with test data.

#### 3.1 Sample data script

- Run script to populate database with 10-20 sample seeds
- Script adds sample zip codes with hardiness zones
- Data is ready for testing immediately

## Technical Requirements (Local Prototype)

### Routing Structure

**Route Architecture:**

- **Home**: `/` - Simple landing page (optional for prototype)
- **Zip Code Pages**: `/zip/[zipCode]` - Dynamic route (e.g., `/zip/90210`)
- **Seed Detail Pages**: `/seeds/[slug]` - Dynamic route (e.g., `/seeds/tomato-roma`)

**URL Examples:**

- `/zip/90210` → Seeds for Beverly Hills, CA (hardiness zone 10)
- `/zip/10001` → Seeds for New York, NY (hardiness zone 7)
- `/seeds/tomato-roma` → Roma tomato seed details
- `/seeds/basil-genovese` → Genovese basil seed details

### Database

- **SQLite**: Local file-based database (`data/seeds.db`)
- **Simple Schema**: Seeds table and zip_hardiness table
- **Sample Data**: Script to populate with test data

### Application

- **Next.js 14+**: App Router, all pages dynamic (no ISR/SSG complexity)
- **Simple UI**: Basic styling, functional layout
- **Local Only**: Runs on `localhost:3000`

### Infrastructure

- **Hosting**: Local development server (`npm run dev`)
- **Database**: SQLite file (no external service)
- **Total Cost**: $0 (everything local)

### Database Schema (Local SQLite)

**Seeds Table**

```sql
CREATE TABLE seeds (
  id TEXT PRIMARY KEY,
  english_name TEXT NOT NULL,
  latin_name TEXT,
  category TEXT, -- vegetable, herb, flower
  hardiness_zones TEXT, -- JSON array as string, e.g., "[5,6,7,8,9]"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Zip Code to Hardiness Zone Mapping Table**

```sql
CREATE TABLE zip_hardiness (
  zip_code TEXT PRIMARY KEY,
  hardiness_zone INTEGER NOT NULL,
  city TEXT,
  state TEXT
);
```

**Note**: Simple schema for prototype. Can expand later when needed.

## Implementation Approach (Local Prototype)

### Step 1: Setup (30 minutes)

- Create Next.js project
- Install SQLite (`better-sqlite3`)
- Set up database connection
- Create database schema
- Create sample data script

### Step 2: Core Pages (2-3 hours)

- Build zip code page (`/zip/[zipCode]`)
  - Fetch zip code hardiness zone
  - Query seeds matching that zone
  - Display list of seeds
- Build seed detail page (`/seeds/[slug]`)
  - Fetch seed by slug
  - Display seed information
  - Show hardiness zones
  - Link to example zip codes

### Step 3: Data & Testing (1 hour)

- Run sample data script
- Test with different zip codes
- Verify hardiness zone matching works
- Test seed detail pages

### Step 4: Polish (Optional, 1-2 hours)

- Add basic styling
- Improve layout
- Add home page
- Test edge cases (invalid zip codes, missing seeds)

**Total Time**: 4-6 hours for working prototype

**That's it. Keep it simple. Just get it working locally.**

## Non-Requirements (Out of Scope for Prototype)

- SEO optimization
- Meta tags and structured data
- Sitemap generation
- Deployment/hosting
- External APIs or services
- Retailer links
- Admin interface
- Search functionality
- User accounts
- Image uploads
- Email functionality
- Analytics

## Future Considerations (When Ready to Deploy)

- Deploy to hosting (Replit, Vercel, etc.)
- Migrate to PostgreSQL (Supabase or Replit database)
- Add SEO optimization
- Add retailer links
- Add search interface
- Add admin interface
- Add more seed data
- Add native/invasive status

---

**Document Version**: 4.0 (Local Prototype - Build and Test Locally)  
**Last Updated**: January 28, 2025  
**Focus**: Get core functionality working locally, no deployment complexity
