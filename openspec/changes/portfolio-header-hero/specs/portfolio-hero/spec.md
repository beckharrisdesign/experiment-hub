# portfolio-hero

## Outcomes

(See [proposal.md](../../proposal.md): Who / Job / Done when / Not doing.)
This capability covers HR-1, HR-2, HR-3 and HR-4 from the
[feedback log](../../../../../experiments/super-css-control/docs/portfolio-feedback-2026-11/README.md).

## ADDED Requirements

### Requirement: The homepage hero is the front door, not another subpage

The homepage hero SHALL use a display size larger than any subpage title and hold the title alone. The intro paragraph and the call to action SHALL follow directly below the hero, and a "Book a 30m call" button SHALL stay in the first phone screen.

**Fails until:** The homepage H1 is 45px, the same as every subpage H1, and the phone CTA ends at 778px of an 844px screen (`measurements.json` → `home-desktop.h1.size`, `home-mobile.firstCtaBottom`).

#### Scenario: Homepage title is larger than any subpage title

- **WHEN** the homepage and any subpage are opened at the same width
- **THEN** the homepage H1 SHALL be set in a homepage-only display size that is larger than the subpage H1

#### Scenario: The hero holds the title alone

- **WHEN** the homepage hero renders
- **THEN** the hero SHALL show the title over its art, and the intro paragraph and the "Book a 30m call" button SHALL follow directly below the hero, on the page colour, at the hero's text width

#### Scenario: A "Book a 30m call" button is in the first phone screen

- **WHEN** the homepage opens at 390×844
- **THEN** a "Book a 30m call" button SHALL be visible with its bottom at or above 600px (the navbar's button counts)

### Requirement: The homepage hero carries a personal visual that Katy can swap

The homepage hero SHALL run the full width of the screen with its personal visual (pattern, photo or doodle) as hero art behind the content, anchored to the right of the content grid. The art SHALL come from Notion so it can be changed without a code change, and it arrives finished, with its own edges.

**Fails until:** At 1440 wide, the right half of the homepage hero is empty.

#### Scenario: Hero art is anchored to the content grid, behind the content

- **WHEN** the homepage opens at any width
- **THEN** the hero SHALL span the full viewport width in the hero colour, and the art SHALL sit behind the title, supporting line and call to action, at 150% of the hero's height, centred vertically on the hero and horizontally on the gutter between the second and third columns of a three-column grid as wide as the content at that breakpoint, clipped to the hero
- **AND** the site SHALL add no mask, wash or colour taken from the art

#### Scenario: Hero text stays readable over the art

- **WHEN** hero art sits behind hero text
- **THEN** the title, supporting line and button label SHALL each keep at least 4.5:1 contrast against what is behind them

#### Scenario: Hero art never moves the intro or the button

- **WHEN** the homepage opens at 390×844 with hero art
- **THEN** the art SHALL follow the same anchoring, and the intro and the button SHALL sit where they would without it

#### Scenario: Swapping the visual needs no pull request

- **WHEN** Katy replaces the hero image in Notion and Super republishes
- **THEN** the live hero SHALL show the new image with no change to `public/super/`

#### Scenario: No image yet shows the plain hero, not a placeholder

- **WHEN** the homepage hero has no personal image in Notion
- **THEN** the hero SHALL show only its colour behind the title, supporting line and call to action, with no placeholder pattern, empty box or broken-image box

### Requirement: Subpage heroes read as heroes

Consulting and About heroes SHALL sit on a band a step off the page colour. A case study SHALL set its title, properties and summary on a card in the hero colour, over hero art that fills the hero, and the art SHALL be the page's Notion cover, instead of an empty box above the title.

**Fails until:** The Consulting hero sits straight on the page colour, and the case study draws an empty 54px cover box above the title (`measurements.json` → `casestudy-desktop.cover.h`).

#### Scenario: Consulting hero sits on a band

- **WHEN** a reader opens Consulting or About, or a case study narrower than 1024px
- **THEN** the hero SHALL sit on a full-width band in a colour distinct from the page body, and the band SHALL end before the first body section

#### Scenario: Case study cover fills the hero behind a text card

- **WHEN** a case study has a Notion cover image and is opened at 1024px wide or more
- **THEN** the cover SHALL fill a hero area at least 480px tall and as wide as the screen, scaled to cover it and centred, at most 1920px per copy of the image, repeated sideways on wider screens, and the title, properties and summary SHALL sit on a card in the hero colour, aligned to the content's left edge, with the title starting in the first screen
- **AND** the site SHALL add no mask, wash or colour taken from the cover

#### Scenario: Case study cover sits above the title on narrower screens

- **WHEN** a case study has a Notion cover image and is opened narrower than 1024px
- **THEN** the cover SHALL run the full width above the title at a 39:20 ratio, and the title, properties and summary SHALL follow on the band

#### Scenario: Case study without a cover shows the default art

- **WHEN** a case study has no cover image
- **THEN** no empty cover box SHALL be drawn, and the default art (`hero/generic.png`) SHALL stand in for the cover: at 1024px wide or more the card SHALL sit on it, sized and tiled like a cover; narrower than that it SHALL run the full width above the title at 39:20, 16px above the title
