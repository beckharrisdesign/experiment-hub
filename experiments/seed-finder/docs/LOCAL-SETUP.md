# Seed Finder - Local Development Setup

## Overview

Simple setup guide for running Seed Finder locally on your machine. No deployment, no hosting, no SEO setup - just get the prototype running.

**Goal**: Test the prototype locally  
**Time**: ~30 minutes  
**Cost**: $0 (everything free/local)

---

## What You Need

### 1. Database: SQLite (Local File)

**Why SQLite?**
- No external service needed
- File-based database (stored locally)
- Perfect for prototyping
- Can migrate to Supabase/PostgreSQL later

**Setup**: Automatic - just install the package

**Cost**: $0

### 2. Development Environment

**Requirements:**
- Node.js 18+ installed
- npm or yarn
- Code editor (VS Code, Cursor, etc.)

**Cost**: $0

---

## Quick Start (5 Steps)

### Step 1: Create Next.js Project

```bash
npx create-next-app@latest seed-finder --typescript --tailwind --app
cd seed-finder
```

### Step 2: Install Dependencies

```bash
npm install
npm install better-sqlite3 @types/better-sqlite3
```

### Step 3: Set Up Local Database

Create `lib/db.ts`:

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'seeds.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS seeds (
    id TEXT PRIMARY KEY,
    english_name TEXT NOT NULL,
    latin_name TEXT,
    category TEXT,
    hardiness_zones TEXT, -- JSON array as string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS zip_hardiness (
    zip_code TEXT PRIMARY KEY,
    hardiness_zone INTEGER NOT NULL,
    city TEXT,
    state TEXT
  );
`);

export default db;
```

### Step 4: Create Sample Data Script

Create `scripts/seed-db.ts`:

```typescript
import db from '../lib/db';

// Sample seeds data
const sampleSeeds = [
  {
    id: '1',
    english_name: 'Roma Tomato',
    latin_name: 'Solanum lycopersicum',
    category: 'vegetable',
    hardiness_zones: JSON.stringify([5, 6, 7, 8, 9, 10])
  },
  {
    id: '2',
    english_name: 'Genovese Basil',
    latin_name: 'Ocimum basilicum',
    category: 'herb',
    hardiness_zones: JSON.stringify([4, 5, 6, 7, 8, 9, 10])
  },
  {
    id: '3',
    english_name: 'Zinnia',
    latin_name: 'Zinnia elegans',
    category: 'flower',
    hardiness_zones: JSON.stringify([3, 4, 5, 6, 7, 8, 9, 10])
  }
];

// Sample zip codes
const sampleZips = [
  { zip_code: '90210', hardiness_zone: 10, city: 'Beverly Hills', state: 'CA' },
  { zip_code: '10001', hardiness_zone: 7, city: 'New York', state: 'NY' },
  { zip_code: '60601', hardiness_zone: 6, city: 'Chicago', state: 'IL' }
];

// Insert data
const insertSeed = db.prepare(`
  INSERT OR REPLACE INTO seeds (id, english_name, latin_name, category, hardiness_zones)
  VALUES (?, ?, ?, ?, ?)
`);

const insertZip = db.prepare(`
  INSERT OR REPLACE INTO zip_hardiness (zip_code, hardiness_zone, city, state)
  VALUES (?, ?, ?, ?)
`);

sampleSeeds.forEach(seed => {
  insertSeed.run(seed.id, seed.english_name, seed.latin_name, seed.category, seed.hardiness_zones);
});

sampleZips.forEach(zip => {
  insertZip.run(zip.zip_code, zip.hardiness_zone, zip.city, zip.state);
});

console.log('✅ Database seeded with sample data');
```

Run it:
```bash
npx tsx scripts/seed-db.ts
```

### Step 5: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - you're running locally!

---

## Project Structure

```
seed-finder/
├── app/
│   ├── page.tsx              # Home page
│   ├── zip/
│   │   └── [zipCode]/
│   │       └── page.tsx      # Zip code pages
│   └── seeds/
│       └── [slug]/
│           └── page.tsx      # Seed detail pages
├── lib/
│   ├── db.ts                 # SQLite database connection
│   └── data.ts               # Data access functions
├── data/
│   └── seeds.db              # SQLite database file (auto-created)
└── scripts/
    └── seed-db.ts            # Sample data script
```

---

## Local Development Features

### What Works Locally

✅ **Database**: SQLite file in `data/seeds.db`  
✅ **Zip Code Pages**: `/zip/90210` - shows seeds for that zip  
✅ **Seed Detail Pages**: `/seeds/tomato-roma` - shows seed info  
✅ **Hardiness Zone Matching**: Seeds filtered by zone  
✅ **Hot Reload**: Changes reflect immediately  

### What's Not Needed (Yet)

❌ No domain registration  
❌ No hosting setup  
❌ No email configuration  
❌ No SEO setup  
❌ No external APIs  

---

## Adding More Data

### Option 1: Add Seeds Manually

Edit `scripts/seed-db.ts` and add more seeds to the array, then run:
```bash
npx tsx scripts/seed-db.ts
```

### Option 2: Import from CSV

Create `scripts/import-csv.ts` to import seeds from a CSV file.

### Option 3: Use Database Tool

Install a SQLite browser (like DB Browser for SQLite) to view/edit data directly.

---

## Environment Variables (None Needed!)

For local development, you don't need any environment variables. Everything is local:
- Database: SQLite file
- No external APIs
- No API keys

When you're ready to deploy later, you can add environment variables then.

---

## Testing the Prototype

### Test Zip Code Pages
- Visit `http://localhost:3000/zip/90210`
- Should show seeds for hardiness zone 10
- Visit `http://localhost:3000/zip/10001`
- Should show seeds for hardiness zone 7

### Test Seed Detail Pages
- Visit `http://localhost:3000/seeds/roma-tomato`
- Should show seed information
- Should link back to zip codes where it grows

### Test Home Page
- Visit `http://localhost:3000`
- Should show basic landing page
- Can add zip code entry form later

---

## Next Steps (When Ready)

When you're ready to deploy:
1. Migrate SQLite → Supabase (or Replit database)
2. Set up hosting (Replit or Vercel)
3. Add domain
4. Set up SEO

But for now: **Just build and test locally!**

---

## Troubleshooting

### Database not found?
- Make sure you ran `npx tsx scripts/seed-db.ts` first
- Check that `data/seeds.db` file exists

### Port 3000 already in use?
```bash
# Use different port
npm run dev -- -p 3001
```

### TypeScript errors?
```bash
# Make sure types are installed
npm install --save-dev @types/node @types/better-sqlite3
```

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2025  
**Focus**: Local development only, no deployment complexity

