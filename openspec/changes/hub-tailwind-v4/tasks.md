# Tasks — hub-tailwind-v4

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Hub looks unchanged on Tailwind v4 — home, experiment detail, and navigation render identically to production (or with founder-approved deltas)
- [ ] 1.2 MVDS components render on the dev route — Button, Badge, Card, Section styled by MVDS tokens, light and dark
- [ ] 1.3 CI installs without registry credentials — clean install succeeds with no GitHub Packages token or scoped-registry config anywhere

## 2. Migration prep

- [x] 2.1 Disk hygiene before install (~92% full machine): `npm cache clean --force`, prune stale `.next`/build artifacts, then a single dependency install in the working tree
- [x] 2.2 Run `npx @tailwindcss/upgrade`; review every diff it produces (no blind acceptance)

## 3. Implementation

- [x] 3.1 Swap PostCSS to `@tailwindcss/postcss` (drop `autoprefixer`); remove `tailwindcss@3` and `tailwind.config.ts` once its theme is fully migrated
- [x] 3.2 Port the theme to CSS-first: `@theme` variables in `app/globals.css` for all hub colors/fonts (flattened names preserve existing utility classes); `darkMode: "class"` → `@custom-variant dark`
- [x] 3.3 Install `@beckharrisdesign/mvds` from public npm; wire per MVDS docs (`styles.css` as the single Tailwind entry, `@source` for MVDS dist + hub globs); confirm `tw-animate-css` resolves (add if peer); delete the `.npmrc` `@beckharrisdesign:registry` line
- [x] 3.4 Dev-only proof route `app/dev/mvds/page.tsx` (`notFound()` in production) rendering Button/Badge/Card/Section in light and dark

## 4. QA

- [x] 4.1 Full vitest suite + `npm run build` green on v4
- [ ] 4.2 Visual parity pass against production (Vercel preview): home, experiment detail, header/nav, dark sections — explicitly checking the v4 preflight traps (border color, rings, shadows); screenshot the MVDS proof route light + dark
- [ ] 4.3 Vercel deploy preview builds green (final gate); PR notes any founder-approved visual deltas
