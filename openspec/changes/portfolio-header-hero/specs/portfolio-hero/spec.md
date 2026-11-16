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

The homepage hero SHALL run the full width of the screen in a colour taken from its personal visual (pattern, photo or doodle), with the visual itself bleeding off the screen edge beside the text. The visual SHALL come from Notion so it can be changed without a code change.

**Fails until:** At 1440 wide, the right half of the homepage hero is empty.

#### Scenario: Hero colour comes from the picture

- **WHEN** the homepage opens with a personal image
- **THEN** the hero SHALL span the full viewport width in the colour at the image's edge, darkened only as far as needed for the title, supporting line and button label to keep at least 4.5:1 contrast, and the image SHALL fade into that colour where they meet

#### Scenario: Visual sits beside the text on desktop

- **WHEN** the homepage opens at 1024px wide or more
- **THEN** the image SHALL sit to the right of the text column and bleed off the top, right and bottom of the hero, and no hero text SHALL sit on the image

#### Scenario: Picture shows clearly below the text on a phone

- **WHEN** the homepage opens at phone width
- **THEN** the image SHALL sit below the call to action at full width, bleeding off the bottom and sides, and SHALL NOT push the button out of the first screen

#### Scenario: Swapping the visual needs no pull request

- **WHEN** Katy replaces the hero image in Notion and Super republishes
- **THEN** the live hero SHALL show the new image with no change to `public/super/`

#### Scenario: No image yet shows a built-in pattern, not an empty half

- **WHEN** the homepage hero has no personal image in Notion
- **THEN** the hero SHALL use the site's own band colour and show a placeholder pattern drawn by `site.css` in the area the image would take, and SHALL NOT show an empty area or a broken-image box

### Requirement: Subpage heroes read as heroes

Subpage heroes SHALL sit on a band a step off the page colour, and a case study with a cover SHALL take its hero colour from the cover and show the cover beside the title, instead of an empty box.

**Fails until:** The Consulting hero sits straight on the page colour, and the case study draws an empty 54px cover box above the title (`measurements.json` → `casestudy-desktop.cover.h`).

#### Scenario: Consulting hero sits on a band

- **WHEN** a reader opens Consulting, About or a case study
- **THEN** the hero SHALL sit on a full-width band in a colour distinct from the page body, and the band SHALL end before the first body section

#### Scenario: Case study hero takes its colour from the cover

- **WHEN** a case study has a Notion cover image and is opened at 1024px wide or more
- **THEN** the hero SHALL span the full viewport width in the colour at the cover's edge (darkened only as far as the text needs for 4.5:1), the cover SHALL sit to the right of the title, properties and summary, bleeding off the top, right and bottom, and the title SHALL start in the first screen

#### Scenario: Case study without a cover shows no empty box

- **WHEN** a case study has no cover image
- **THEN** no empty cover box SHALL be drawn, and the title SHALL start at the top of the band
