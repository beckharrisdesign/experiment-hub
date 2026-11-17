# portfolio-header

## Outcomes

(See [proposal.md](../../proposal.md): Who / Job / Done when / Not doing.)
This capability covers HD-1, HD-2 and HD-3 from the
[feedback log](../../../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md).

## ADDED Requirements

### Requirement: The navbar gets out of the way once the reader scrolls

The navbar SHALL be 80px tall at the top of a page and about 56px once the reader has scrolled, at every width.

**Fails until:** On beckharrisdesign.com at 1440×900, scrolled 1200px, `.super-navbar` still measures 80px (`as-is/measurements.json` → `navbarScrolled.h`).

#### Scenario: Navbar shrinks once the reader scrolls

- **WHEN** a reader scrolls any page down from the top
- **THEN** the navbar SHALL settle at about 56px, with the logo, links and "Book a 30m call" button scaled down to fit it

#### Scenario: Navbar grows back at the top

- **WHEN** the reader scrolls back to the top of the page
- **THEN** the navbar SHALL return to 80px

#### Scenario: Reduced motion swaps height without animating

- **WHEN** the reader's system asks for reduced motion (`prefers-reduced-motion: reduce`)
- **THEN** the navbar SHALL change between 80px and 56px instantly, with no transition

### Requirement: The nav says where you are, so the breadcrumb doesn't have to

The nav link for the current section SHALL be marked by more than colour alone, and top-level pages SHALL show no breadcrumb bar.

**Fails until:** On `/bhd-consultation`, every `.super-navbar__item` has the same colour and weight, and a 32px breadcrumb bar sits under the navbar (`measurements.json` → `consulting-desktop.breadcrumbs.h`).

#### Scenario: Consulting page highlights Consulting

- **WHEN** a reader is on the Consulting page
- **THEN** the Consulting link SHALL be shown as current (full-strength colour plus an underline), and the other links SHALL NOT

#### Scenario: A case study highlights Projects

- **WHEN** a reader is on a case study (a child page of the homepage)
- **THEN** the Projects link SHALL be shown as current

#### Scenario: Top-level pages show no breadcrumb

- **WHEN** a reader opens Consulting, Labs, About or Projects
- **THEN** no breadcrumb bar SHALL appear, and the page SHALL start directly under the navbar
