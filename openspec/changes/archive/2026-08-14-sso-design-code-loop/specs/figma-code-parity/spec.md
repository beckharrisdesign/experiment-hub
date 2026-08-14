## Outcomes

- **Who:** Solo founder editing the Simple Seed Organizer prototype across Figma and React.
- **Job:** Edit a component in Figma against a shared token vocabulary, with parity status tracked in one place, and see the rendered code without booting the whole app to the right route.
- **Done when:** Spacing/sizing + typography Figma Variables mirror Tailwind; `figma-source.md` has a parity status column; `/dev/components` renders priority components in isolation; 1–2 components pass end-to-end through the loop.
- **Not doing:** Storybook/Ladle, formal inventory format, auto token sync, Figma Dev Mode paid features.

## ADDED Requirements

### Requirement: Spacing and sizing token parity

Figma Variables for the SSO prototype's spacing and sizing scale share names and pixel values with the corresponding Tailwind utility classes used in `experiments/simple-seed-organizer/prototype/app/`.

**Fails until:** Opening the SSO Figma file shows a `space/*` (or equivalently named) Variables collection where every value matches its Tailwind utility (e.g. `space/4 = 16px` corresponds to `gap-4` / `p-4`).

SHALL: The SSO Figma file exposes a spacing/sizing Variables collection whose token names and pixel values match the Tailwind classes consumed by SSO prototype components.

#### Scenario: Spacing variable lookup matches Tailwind utility

- **WHEN** a Figma frame uses Auto Layout `gap = {space/4}` and the corresponding React container uses `className="… gap-4 …"`
- **THEN** both resolve to 16px and the variable name (`space/4`) is referenced verbatim in the parity row in `figma-source.md`

### Requirement: Typography token parity

Figma Variables (or styles) for font family, font size, line height, and font weight share names and values with the prototype's type system, so a type-size or weight change on either side maps to the same named token on the other.

**Fails until:** The SSO Figma file has named type tokens (e.g. `text/sm`, `text/base`, `text/lg`) whose family, size, line height, and weight match the prototype's Tailwind type classes for those same names.

SHALL: The SSO Figma file exposes a typography token set (Variables or text styles) whose names and resolved values match the Tailwind type classes used by SSO prototype components.

#### Scenario: Typography token lookup matches Tailwind class

- **WHEN** a Figma text node uses `text/sm` and the corresponding React element uses `className="… text-sm …"`
- **THEN** both resolve to the same font-family, font-size, line-height, and font-weight, and the parity row in `figma-source.md` cites `text/sm` as the shared token

### Requirement: Parity status column in `figma-source.md`

The component table in [`experiments/simple-seed-organizer/docs/figma-source.md`](../../../../experiments/simple-seed-organizer/docs/figma-source.md) gains a "Parity" column whose value for each row is one of `full`, `partial`, `drifted`, or `not-yet-linked`, defined in a short legend at the top of the section.

**Fails until:** Every row in the existing component table has a Parity value filled in (no blanks), and the four status values are defined in a legend immediately above the table.

SHALL: `figma-source.md` defines the four parity status values in a legend and records a status value on every component-table row.

#### Scenario: Reader checks parity at a glance

- **WHEN** I open `figma-source.md` and scan the component table
- **THEN** every row shows a parity status from the defined set, and the legend explains what each value means

### Requirement: `/dev/components` preview route

The SSO Next.js prototype exposes a `/dev/components` route that renders the priority components with mock-data props in isolation, without auth, navigation, or app-state setup, and the existing dev server hot-reloads changes to those components.

**Fails until:** Running `npm run dev` in the SSO prototype and visiting `http://localhost:<port>/dev/components` shows the priority components rendered with mock data, reachable without signing in.

SHALL: The SSO prototype serves `/dev/components` from the existing Next.js dev server, rendering priority components with mock props and bypassing auth.

#### Scenario: Visit preview route without signing in

- **WHEN** I run `npm run dev` in `experiments/simple-seed-organizer/prototype/app/` and open `/dev/components` in an unauthenticated browser
- **THEN** I see each priority component rendered with mock props, and editing one of its source files triggers an HMR update on the page

### Requirement: End-to-end parity proof on at least one component

At least one priority component completes the full loop — Figma Variables applied to its frame, parity status set to `full` in `figma-source.md`, and the component rendered on `/dev/components` — and the change description records which component(s) and the time it took.

**Fails until:** `figma-source.md` shows at least one row with Parity = `full`, that component is listed and rendered on `/dev/components`, and the change folder records the component name and rough effort.

SHALL: At least one priority SSO component reaches `Parity: full` with a corresponding `/dev/components` entry, and the change folder records the component(s) and rough effort.

#### Scenario: Walk the loop on one component end-to-end

- **WHEN** I pick a small priority component, swap its Figma frame to use the spacing/typography Variables, fill its parity row to `full`, and ensure it renders on `/dev/components`
- **THEN** the parity row, the Figma file, and the rendered preview agree on token names and structure, and I can edit a token on either side and see the other side track without ambiguity
