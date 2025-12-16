# Embroidery Pattern Manager - Prototype

Workflow automation tool for embroidery pattern creators. This MVP prototype helps plan products, author Etsy listings, generate listing images, and optimize SEO/keywords.

## Quick Start

**Port**: This prototype runs on **port 3001** (Hub is on 3000)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.local.example .env.local
   # Add your OPENAI_API_KEY to .env.local
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   [http://localhost:3001](http://localhost:3001)

## Features (MVP)

- ✅ **Brand Identity Setup**: Define store name, tone, and creative direction
- ✅ **Product Planning**: Track pattern ideas and plan releases (kanban board)
- ✅ **Listing Authoring**: Generate optimized Etsy listing content with SEO
- 🚧 **Customer Communication**: Generate order confirmations and support messages (coming soon)
- 🚧 **Image Generation**: Generate store assets and product images (coming soon)
- 🚧 **SEO & Keywords**: Research and optimize keywords (coming soon)
- ✅ **Export**: Copy listing content to clipboard

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3) - local-first
- **LLM**: OpenAI API (for content generation)
- **Image Processing**: Sharp (for future image generation)

## Usage

### 1. Set Up Brand Identity (Required First Step)

1. Navigate to "Brand Identity" from the home page
2. Complete the 3-step wizard:
   - **Store Name**: Enter or generate a store name
   - **Brand Tone**: Select your writing style (friendly, professional, whimsical, etc.)
   - **Creative Direction**: Choose visual style and color palette
3. Save your brand identity

### 2. Plan Products

1. Go to "Product Planning"
2. Click "+ New Pattern" to add pattern ideas
3. Track patterns through statuses: Idea → In Progress → Ready → Listed
4. Use the kanban board to visualize your pipeline

### 3. Generate Listings

1. Go to "Listing Authoring"
2. Select a pattern with status "ready"
3. Click "Generate Listing" to create SEO-optimized content
4. Review and edit the generated title, description, and tags
5. Click "Copy to Clipboard" to export for Etsy

## Project Structure

```
prototype/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── brand-identity/    # Brand identity setup
│   ├── patterns/          # Product planning
│   ├── listings/          # Listing authoring
│   └── page.tsx           # Home dashboard
├── components/            # React components
├── lib/                   # Utility functions
│   ├── db.ts             # Database setup
│   ├── brand-identity.ts # Brand identity logic
│   ├── patterns.ts        # Pattern management
│   ├── listings.ts        # Listing generation
│   └── openai.ts         # OpenAI integration
├── types/                 # TypeScript types
├── data/                  # Database and config files
└── public/                # Static files and uploads
```

## Database Schema

The SQLite database includes tables for:
- `brand_identity`: Store brand configuration
- `patterns`: Pattern ideas and metadata
- `releases`: Release planning
- `listings`: Generated listing content
- `customer_messages`: Generated customer communication
- `generated_images`: Image generation metadata

## Development

### Adding New Features

1. Create API routes in `app/api/[feature]/`
2. Add library functions in `lib/[feature].ts`
3. Create pages in `app/[feature]/page.tsx`
4. Add types in `types/index.ts`

### Database Migrations

The database schema is initialized automatically on first run. For schema changes, update `lib/db.ts` and the database will be recreated (data will be lost in development).

## Next Steps

- [ ] Implement Customer Communication feature
- [ ] Add Image Generation with Sharp
- [ ] Implement SEO/Keyword optimization
- [ ] Add export package functionality
- [ ] Improve UI/UX with better components
- [ ] Add pattern file upload
- [ ] Generate store assets (header, profile image)

## Notes

- This is an MVP prototype focused on core workflow automation
- All data is stored locally (SQLite + file system)
- OpenAI API is required for content generation
- Pattern design in Procreate is out of scope (manual process)
- Etsy API integration is future work (manual copy/paste for MVP)

## License

Private prototype - not for distribution
