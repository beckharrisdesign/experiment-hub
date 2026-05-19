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
