## Outcomes

See `../../proposal.md`. This capability is the page: designers and laser makers pick the look by
eye, then export for screen, print or a laser, without an account and without the image leaving the
device. It's also indexable enough to test whether the page can rank. Done when the four-step flow
works by mouse and keyboard, material starting points round-trip through the URL, the page has the
SEO surface and passes Lighthouse on the live URL, and nothing but analytics choices leaves the
browser. Not doing: accounts, payments, per-material landing pages.

## ADDED Requirements

### Requirement: Pick the look by eye, one step at a time

The person moves top to bottom through Image → Pick an effect → Fine-tune → Export, picking
from real previews instead of setting controls.

**Fails until:** step 2 shows eight rendered tiles for the person's image, picking and pressing Next opens fine-tune with four options, and later steps show nothing until reached.

The page SHALL render the eight dither patterns or the eight halftone screens (a Dither | Halftone switch) as a grid that fills its container, SHALL offer four tone variations around the current pick that converge as the step halves each round, and SHALL keep later steps locked, with no previews, until the step above has a pick.

#### Scenario: Pick an effect from all eight, then fine-tune by picking

- **WHEN** the person adds an image, picks one of the eight results and presses Next
- **THEN** fine-tune shows the current result beside four variations (Lighter, Darker, More contrast, Softer)

#### Scenario: Later steps stay locked until a pick

- **WHEN** the page loads
- **THEN** step 2 shows eight previews of the sample image and the fine-tune and export steps render no previews

### Requirement: Export for screen or for a laser, with material starting points

Laser makers get exact millimetres, DPI and material starting points; designers never have to see them.

**Fails until:** choosing Laser and Slate puts `?material=slate` in the URL and turns invert on, `?material=acrylic` arrives with mirror and invert on, and an unknown material falls back without errors.

The export step SHALL offer Screen or print (px) and Laser (mm + DPI, material chips, invert, mirror); material presets SHALL live in `presets.json`, validated by `presets.schema.json`, each marked as a starting point; a material picked in Export SHALL change only invert, mirror and DPI.

#### Scenario: ?material=slate opens with invert on; unknown falls back

- **WHEN** the page is opened with `?material=slate`, `?material=acrylic` or `?material=unobtainium`
- **THEN** slate has invert on, acrylic has mirror and invert on, and the unknown one loads the defaults without errors

### Requirement: Usable without a mouse, and accessible

The whole flow works from the keyboard and meets WCAG checks.

**Fails until:** a keyboard-only run uploads, picks, chooses Laser and a material, and downloads; axe reports zero violations before and after an image loads.

The page SHALL be fully keyboard-operable, and axe SHALL report zero violations before and after an image is loaded.

#### Scenario: Whole flow by keyboard

- **WHEN** a person uses only Tab, Enter and Space
- **THEN** they can upload, pick an effect, fine-tune, choose Laser and a material, and download a 300 DPI PNG

#### Scenario: No axe violations

- **WHEN** axe runs on the page before and after an image is loaded
- **THEN** it reports zero violations

### Requirement: Images never leave the device

Processing happens in the browser; the only data sent anywhere is anonymous analytics.

**Fails until:** no request carries image data during upload and export, and the analytics payload holds only the two choices.

The page SHALL make no network request carrying image data, SHALL load analytics only on the production host, and the download event SHALL carry only `exportFor` and `mode` (never the file name or image data).

#### Scenario: No image data leaves the device

- **WHEN** a person uploads an image and downloads a PNG
- **THEN** no request carries image data, and on production the only requests sent are the analytics page view, `png_downloaded {exportFor, mode}` and the `/downloaded/<exportFor>-<mode>` page view

### Requirement: The page can be found

The page has what search engines need, and it's fast enough to rank on mobile.

**Fails until:** the built page has a ≤ 60-character title, a 120–160-character description, a canonical URL, one H1 and valid JSON-LD, sitemap and robots are in place, and Lighthouse mobile on the live URL scores ≥ 95 ×4 with LCP < 1.5 s and CLS < 0.05.

The page SHALL ship a title, meta description, canonical, Open Graph tags with a share image, WebApplication and FAQPage JSON-LD, `sitemap.xml`, `robots.txt` and a configurable base path, with initial JS ≤ 60 KB gzipped, and SHALL meet the Lighthouse ship gate on the deployed URL.

#### Scenario: The built page is complete for search

- **WHEN** the site is built (with or without a base path)
- **THEN** the title, description, canonical, single H1, JSON-LD, Open Graph image, sitemap and robots all pass, and the canonical, sitemap and robots follow the base path

#### Scenario: Lighthouse passes on the live URL

- **WHEN** Lighthouse mobile runs against the production URL
- **THEN** performance, accessibility, best practices and SEO are each ≥ 95, LCP < 1.5 s and CLS < 0.05
