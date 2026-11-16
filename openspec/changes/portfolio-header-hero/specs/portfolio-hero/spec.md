# portfolio-hero

## Outcomes

(See [proposal.md](../../proposal.md): Who / Job / Done when / Not doing.)
This capability covers HR-1, HR-2, HR-3 and HR-4 from the
[feedback log](../../../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md).

## ADDED Requirements

### Requirement: The homepage hero is the front door, not another subpage

The homepage hero SHALL use a display size larger than any subpage title, carry one supporting line instead of a paragraph, and keep its call to action well inside the first phone screen.

**Fails until:** The homepage H1 is 45px, the same as every subpage H1, and the phone CTA ends at 778px of an 844px screen (`measurements.json` → `home-desktop.h1.size`, `home-mobile.firstCtaBottom`).

#### Scenario: Homepage title is larger than any subpage title

- **WHEN** the homepage and any subpage are opened at the same width
- **THEN** the homepage H1 SHALL be set in a homepage-only display size that is larger than the subpage H1

#### Scenario: One supporting line under the title

- **WHEN** the homepage hero renders
- **THEN** it SHALL show the title, one short supporting line and the call to action, and no multi-sentence paragraph

#### Scenario: Call to action is in the first phone screen

- **WHEN** the homepage opens at 390×844
- **THEN** the bottom of the "Book a 30m call" button SHALL sit at or above 600px

### Requirement: The homepage hero carries a personal visual that Katy can swap

The homepage hero SHALL carry a personal visual (pattern, photo or doodle) that runs the full width of the screen behind the hero text, and that comes from Notion so it can be changed without a code change.

**Fails until:** At 1440 wide, the right half of the homepage hero is empty.

#### Scenario: Visual runs full width behind the hero text

- **WHEN** the homepage opens at any width
- **THEN** the personal visual SHALL span the full viewport width behind the title, supporting line and call to action, and the title, line and button label SHALL each keep at least 4.5:1 contrast against what is behind them

#### Scenario: Picture shows clearly below the text on a phone

- **WHEN** the homepage opens at phone width
- **THEN** the visual SHALL show with little or no dimming in the area below the call to action, and SHALL NOT push the button out of the first screen

#### Scenario: Swapping the visual needs no pull request

- **WHEN** Katy replaces the hero image in Notion and Super republishes
- **THEN** the live hero SHALL show the new image with no change to `public/super/`

#### Scenario: No image yet shows a built-in pattern, not an empty half

- **WHEN** the homepage hero has no personal image in Notion
- **THEN** the hero SHALL show a placeholder pattern drawn by `site.css` in the site's own colours, across the same full-width area the image would take, and SHALL NOT show an empty area or a broken-image box

### Requirement: Subpage heroes read as heroes

Subpage heroes SHALL sit on a band a step off the page colour, and a case study SHALL show its project visual as a full-width cover above the title instead of an empty box.

**Fails until:** The Consulting hero sits straight on the page colour, and the case study draws an empty 54px cover box above the title (`measurements.json` → `casestudy-desktop.cover.h`).

#### Scenario: Consulting hero sits on a band

- **WHEN** a reader opens Consulting, About or a case study
- **THEN** the hero SHALL sit on a full-width band in a colour distinct from the page body, and the band SHALL end before the first body section

#### Scenario: Case study cover runs full width above the title

- **WHEN** a case study has a Notion cover image
- **THEN** the cover SHALL span the full viewport width directly under the navbar, above the title, and SHALL be no taller than half the screen, so the title starts in the first screen

#### Scenario: Case study without a cover shows no empty box

- **WHEN** a case study has no cover image
- **THEN** no empty cover box SHALL be drawn, and the title SHALL start at the top of the band
