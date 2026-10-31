# Spec — portfolio-figma-source

## Outcomes

- **Who:** Katy — the portfolio's designer and its only maintainer.
- **Job:** Get a design source of truth for beckharrisdesign.com, which today exists
  only as rendered HTML, and keep it honest as the site moves.
- **Done when:** Every canonical view is a Figma frame built from **measured**
  layout, the tree separates listed views from unlisted patterns, and drift between
  the capture and the live site surfaces as a failing check.
- **Not doing:** Redesign. No proposed changes to the live site, including the
  `sitemap.xml` findings — those are a separate change.

## ADDED Requirements

### Requirement: Measured geometry for every canonical view

Katy can produce the real rendered layout of every canonical view without reading
markup or measuring anything by hand.

**Fails until:** the extractor emits a geometry record for all ten views.

The system SHALL render each canonical route in a browser and emit, per block, its
type, position, size and any column ratios.

#### Scenario: Extractor emits geometry for every canonical view

- **WHEN** Katy runs the geometry extractor against beckharrisdesign.com
- **THEN** it writes one record per canonical view listing every top-level block
  with its type, x, width, height, and the x/width of each column inside it —
  including columns that contain no text

### Requirement: Frames built from measured numbers, not inference

Every frame in the capture reflects the layout the site actually renders, rather
than a layout inferred from class names.

**Fails until:** all ten frames are regenerated from extractor output.

The system SHALL build each view frame from the recorded geometry for that route.

#### Scenario: Every frame matches its measured geometry

- **WHEN** Katy compares a frame against the extractor record for its route
- **THEN** the frame's root padding, column positions and widths, card grid and
  divider count match that record, including empty columns

### Requirement: The tree separates listed views from unlisted patterns

The sitemap shows what a visitor can navigate to, and shows separately what exists
but is reachable only by direct link.

The system SHALL place views reachable through navigation in the tree, and views
reachable only by direct link in a visually separated zone with no connector.

#### Scenario: Unlisted patterns sit outside the tree

- **WHEN** Katy looks at the sitemap page
- **THEN** `/for-*` and the raw database views appear outside the tree, each
  annotated with why it sits there and whether being unlisted is deliberate

### Requirement: Drift between capture and site surfaces as a failing check

When the live site's layout moves, Katy finds out from a check rather than by
noticing a missing column.

**Fails until:** re-running the extractor against changed geometry exits non-zero.

The system SHALL compare freshly measured geometry against the recorded geometry
and fail when they differ.

#### Scenario: A layout change fails the check

- **WHEN** a canonical view's measured geometry differs from what the capture
  recorded
- **THEN** the check exits non-zero and names the route, the block and the
  changed numbers

### Requirement: Tokens read from the stylesheet

The Figma token values are the ones the site actually serves, not values sampled by
eye.

The system SHALL source the token collection from `public/super/site.css`.

#### Scenario: Token values match the served CSS

- **WHEN** Katy inspects the `portfolio tokens` collection
- **THEN** each colour, measure and type value matches the corresponding
  declaration in `public/super/site.css`
