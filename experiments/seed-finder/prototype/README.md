# Seed Finder - Local Prototype

A simple local prototype for testing seed-to-zip-code matching via hardiness zones.

**Port**: 3002 (configured in `package.json` and `data/prototypes.json`)

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Seed the database** with sample data:
   ```bash
   npm run seed
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   - Home: http://localhost:3002
   - Example zip code: http://localhost:3002/zip/90210
   - Example seed: http://localhost:3002/seeds/roma-tomato

## What's Included

- **15 sample seeds** (vegetables, herbs, flowers)
- **10 sample zip codes** with hardiness zones
- **Zip code pages**: `/zip/[zipCode]` - shows seeds for that zip's hardiness zone
- **Seed detail pages**: `/seeds/[slug]` - shows seed information and example zip codes

## Database

- **SQLite database**: `data/seeds.db`
- **Tables**: `seeds`, `zip_hardiness`
- **Sample data**: Run `npm run seed` to populate

## Project Structure

```
prototype/
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
├── scripts/
│   └── seed-db.ts            # Sample data script
└── data/
    └── seeds.db              # SQLite database (auto-created)
```

## Testing

Try these URLs:
- `/zip/90210` - Beverly Hills, CA (Zone 10)
- `/zip/10001` - New York, NY (Zone 7)
- `/zip/60601` - Chicago, IL (Zone 6)
- `/seeds/roma-tomato`
- `/seeds/genovese-basil`
- `/seeds/zinnia`

## Next Steps

When ready to deploy:
1. Migrate to PostgreSQL (Supabase or Replit database)
2. Add more seed data
3. Add SEO optimization
4. Deploy to hosting
