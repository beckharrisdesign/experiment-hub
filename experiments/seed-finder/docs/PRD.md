# Seed Finder - Product Requirements Document

## Overview

Seed Finder is a simple public-facing seed database that helps gardeners discover seeds suited for their zip code. Users can search Google or AI platforms for "seeds for [zip code]" and arrive at a page showing seeds with native/adapted/invasive status and where to buy them.

## Problem Statement

Gardeners struggle to find seeds suited for their location. When searching for seeds, they can't easily see which plants are native, adapted, or invasive for their zip code, or where to buy them. Seed Finder solves this by providing location-based seed discovery pages optimized for search engines.

## Goals & Objectives

### Primary Goals

1. **Location-Based Seed Discovery**: Enable gardeners to find seeds for their zip code via Google/AI search
2. **Geographic Context**: Show native/adapted/invasive status for each seed
3. **Retailer Information**: Display where to buy each seed

### Success Metrics (MVP)

- **Database Size**: 500+ seed entries (manually curated)
- **Public Discovery**: Location-based pages indexed by Google
- **Core Functionality**: Users can find seeds for their zip code and see native status

## Target User/Use Case

**Primary User**: Home gardeners searching for seeds suited for their location

**Primary Use Case**: User searches "seeds for zip code 90210" on Google or AI platform and arrives at a page showing seeds with native/adapted/invasive status and retailer links.

## Core Features (MVP)

### Feature 1: Location-Based Seed Pages

- Dynamic pages for each zip code (e.g., `/seeds/90210`)
- Shows seeds suited for that zip code's hardiness zone
- Displays native/adapted/invasive status for each seed
- Shows retailer links for each seed
- Optimized for search engine indexing (SEO)

### Feature 2: Seed Database

- Seed information: English name, Latin name, category
- Geographic data: native range, hardiness zones, invasive status
- Retailer links: where to buy each seed
- Manual entry via simple admin interface

### Feature 3: Basic Search

- Text search by seed name
- Filter by category (vegetable, herb, flower)
- Filter by native/adapted/invasive status

## User Stories

### Story 1: User discovers seeds via Google/AI search
**As a** gardener, **I want to** search "seeds for [zip code]" on Google or AI platforms, **so that** I can find seeds suited for my location.

#### 1.1 Location-based discovery pages
- System generates pages for each zip code (e.g., `/seeds/90210`)
- Pages show seeds suited for that zip code's hardiness zone
- Pages display native/adapted/invasive status for each seed
- Pages show retailer links for each seed
- Pages are optimized for search engine indexing

#### 1.2 SEO optimization
- Pages include proper meta tags and descriptions
- Pages use structured data (Schema.org) for rich search results
- Pages are mobile-responsive and fast-loading
- Pages are accessible to search engine crawlers

### Story 2: User views seed details
**As a** gardener, **I want to** view seed information, **so that** I can understand what the seed is and where to buy it.

#### 2.1 Seed detail view
- User can view seed information (name, Latin name, category)
- User can see native/adapted/invasive status
- User can see hardiness zones where seed can grow
- User can see retailer links to purchase seed

### Story 3: Administrator adds seeds manually
**As an** administrator, **I want to** add seeds to the database manually, **so that** the database grows over time.

#### 3.1 Manual seed entry
- Administrator can add seed with English name, Latin name, category
- Administrator can add geographic data (native range, hardiness zones, invasive status)
- Administrator can add retailer links
- Simple form-based interface

## Technical Requirements

### Database
- **Supabase PostgreSQL**: Free tier sufficient for MVP
- **Simple Schema**: Seeds table with basic fields
- **Manual Entry**: No automated ingestion initially

### Application
- **Next.js**: Static site generation for location-based pages
- **Simple UI**: Basic search and display
- **SEO**: Meta tags, structured data, sitemap

### Infrastructure
- **Hosting**: Vercel (free tier)
- **Database**: Supabase (free tier)
- **Total Cost**: <$50/mo (likely $0 for MVP)

### Database Schema (Simplified)

**Seeds Table**
```sql
CREATE TABLE seeds (
  id UUID PRIMARY KEY,
  english_name VARCHAR(255) NOT NULL,
  latin_name VARCHAR(255),
  category VARCHAR(50),
  native_range TEXT,
  hardiness_zones INTEGER[],
  invasive_regions TEXT[],
  retailer_links JSONB, -- [{name: "Retailer", url: "https://..."}]
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Implementation Approach

### Phase 1: MVP (Target: <1 month with Cursor)
- Set up Supabase database
- Create Next.js app with location-based pages
- Manual seed entry interface (admin)
- Basic search functionality
- SEO optimization (meta tags, structured data)
- Deploy to Vercel

**That's it. Keep it simple.**

## Non-Requirements (Out of Scope for MVP)

- Newsletter system
- Automated catalog ingestion
- Complex back-of-house tools
- User accounts or preferences
- Advanced filtering
- Image uploads (use external image URLs)
- Care instructions or propagation info (can add later)

## Future Considerations (Post-MVP)

- Newsletter system
- Automated catalog ingestion
- Advanced search and filtering
- Image management
- Care instructions and propagation info
- Garden store directory

---

**Document Version**: 2.0 (Lean MVP)  
**Last Updated**: January 27, 2025
