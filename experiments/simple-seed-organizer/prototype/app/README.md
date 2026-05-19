This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Testing (seed persistence)

Persistence-focused Vitest files use a **10s** `testTimeout` (see `lib/storage.save.test.ts`, `lib/seedPhotoSavePolicy.test.ts`, `lib/seedFormYear.test.ts`) so a stuck Supabase or `fetch` mock cannot hang CI indefinitely.

Run only those suites from this directory:

```bash
npm run test -- lib/storage.save.test.ts lib/seedPhotoSavePolicy.test.ts lib/seedFormYear.test.ts
```

To include converter contracts for JSONB/year:

```bash
npm run test -- lib/storage.save.test.ts lib/seedPhotoSavePolicy.test.ts lib/seedFormYear.test.ts lib/seedConverters.test.ts
```

## Supabase (migrations and PR branching)

This app keeps database migrations under **`supabase/migrations/`** (next to this README).

**GitHub integration (Supabase Branching):** In the Supabase Dashboard, set the integration **Working directory** to the parent of `supabase/` from the monorepo root:

`experiments/simple-seed-organizer/prototype/app`

That path is the directory that contains **`supabase/`**; do not use `.` at the repo root or migrations will not be found.

**Layout Supabase expects:**

| Path                        | Purpose                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/*.sql` | Applied on preview branches and production deploys when integration is enabled                                                                                                           |
| `supabase/config.toml`      | Branch and service config as code ([branching configuration](https://supabase.com/docs/guides/deployment/branching/configuration)); add via `supabase init` in this directory if missing |
| `supabase/seed.sql`         | Optional preview seed data ([seeding](https://supabase.com/docs/guides/cli/seeding-your-database))                                                                                       |

**New migrations:** Prefer CLI-generated timestamp names (`supabase migration new <name>` → `YYYYMMDDHHMMSS_<name>.sql`) so ordering stays clear across rebases; see [branching troubleshooting](https://supabase.com/docs/guides/deployment/branching/troubleshooting). Existing `001_`–`007_` files remain valid for lexicographic order.

**Docs:** [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
