// ESLint for the hub app itself — app/, lib/, components/, scripts/, tests/.
//
// The repo carried a root .eslintrc.json (`extends: next/core-web-vitals`) that
// had been dead since the ESLint 9 upgrade: v9 looks for eslint.config.* and
// errors out with "couldn't find an eslint.config.(js|mjs|cjs) file" rather than
// falling back, so the hub's own code was never linted by anything. The
// Typecheck job covers types; this covers the lint rules types cannot see.
//
// Mirrors experiments/simple-seed-organizer/prototype/app/eslint.config.js,
// which is the one config in this repo that already worked.
//
// eslint-config-next 16+ ships native flat config — no FlatCompat bridge.
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

module.exports = [
  ...(nextCoreWebVitals.default || nextCoreWebVitals),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      // Each experiment prototype is its own app with its own toolchain and its
      // own config; the seed organizer's runs in seed-organizer-ci.yml. Linting
      // them from here would apply the hub's rules to code that never opted in.
      "experiments/**",
      // Workspace packages are typechecked by the Typecheck job via their own
      // lint scripts.
      "packages/**",
      // Generated/vendored.
      "openspec/**",
      "public/**",
      ".turbo/**",
    ],
  },
  {
    // These three React Compiler rules are new in eslint-config-next 16 /
    // react-hooks 6 and fire on code written before they existed — 9 findings
    // across 8 files. They are downgraded to `warn`, NOT off: the findings stay
    // in every lint run, but they do not block the gate on code that predates
    // the rule. Fixing them is real React work per component and belongs in its
    // own PR where each one can be exercised, not buried in a CI change.
    //
    //   set-state-in-effect (6) — app/etsy-listing-kit/page.tsx:51,
    //     app/etsy-listing-kit/result/page.tsx:35, components/EtsySyncPanel.tsx:104,
    //     components/LandingPageLink.tsx:16, components/PrototypeServerStatus.tsx:60,
    //     components/PrototypeStatus.tsx:67. Mostly initial load from window/
    //     localStorage. The seed organizer turned this rule off outright for the
    //     same pattern; warn keeps it visible here instead.
    //   purity (2) — app/etsy-listing-kit/result/page.tsx:18,
    //     components/MermaidDiagram.tsx:16. Math.random() during render for an
    //     element id; useId is the fix.
    //   error-boundaries (1) — app/page.tsx:105. catch/log/rethrow in a server
    //     component.
    //
    // Raise each back to error as its findings are cleared.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
];
