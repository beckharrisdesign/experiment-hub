## Outcomes

See [proposal.md](../../proposal.md) — sellers with live Etsy listings get an honest, objective evaluation in the ELK UI; the paid pack becomes the recommended fix, not the cold pitch.

## ADDED Requirements

### Requirement: Evaluate a listing from its URL

A visitor pastes a public Etsy listing URL into the ELK surface and sees that listing evaluated: Tier A publishability pass/fail, Tier B completeness score, and a ranked "fix these first" list.

**Fails until:** submitting a public listing URL on the ELK surface renders a scored evaluation for that listing.

#### Scenario: A public listing URL returns a rendered evaluation

- **WHEN** a visitor submits the URL of an active, public Etsy listing
- **THEN** the page renders a single current-state card — the listing's real title and primary image, "Etsy's required fields" as pass/fail (never a percentage), "Etsy's recommended extras" as a percentage graded only on the recommended checklist, and an explainer distinguishing the two — followed by the ranked opportunity list, one card per recommendation, each showing the listing's actual data (photos in a slot strip, filled vs. empty) as visible evidence of what was read

#### Scenario: Every recommendation carries its evidence

- **WHEN** the fix-first list renders
- **THEN** each recommendation is a report card showing the current state it rests on, drawn from the fetched listing — in fixed order: the actual photos beside their empty slots (of Etsy's 20 combined photo & video slots), the actual title quoted with its character meter, per-photo alt-text status, and video absence last — so no suggestion appears without its supporting data, and the one gap the kit can't yet fix closes the list

#### Scenario: Recommendations cite Etsy's current documentation

- **WHEN** a report card renders
- **THEN** it shows a quoted excerpt from Etsy's own documentation with its source name and a "checked <date>" stamp, served from a citation registry (quote, source URL, last-checked date) that is re-verified on a recurring basis

#### Scenario: Recommendations speak in opportunities

- **WHEN** any recommendation renders
- **THEN** its language frames what is available rather than what is missing (e.g. "Take advantage of your 18 open image slots", not "Only 2 of 20 slots used"), while the evidence beneath states the plain facts

#### Scenario: Full image slots with weak photos still get an image recommendation

- **WHEN** every image slot is in use but photos fall short of Etsy's recommended quality (measurably: below the recommended 2000px shortest side)
- **THEN** the open-slots recommendation is replaced by "Improve the listing images you already have," showing per-photo quality evidence (resolution chips at minimum) — one image card renders per listing, never both

#### Scenario: A fully populated listing gets opportunities, not invented gaps

- **WHEN** the evaluated listing has every slot, field, and tag populated
- **THEN** the verdict says so plainly (100%, "Nothing to fill — now make it work harder") and the recommendations shift to testing and refresh — a fresh photo set to test against the current one, a title variation to A/B, seasonal keyword rotation through the tags — with the kit offered as the test set

#### Scenario: The free evaluation includes one sample kit suggestion

- **WHEN** the title report card renders for a listing with title gaps
- **THEN** it includes a free sample suggested title for that listing, labeled as a sample of what the paid kit delivers, with its character count shown

#### Scenario: A shop link suggests its featured listing

- **WHEN** the submitted URL is an Etsy shop link rather than a listing link
- **THEN** the shop's featured listing is offered on a confirm card ("Check this one →", with a "paste a different listing" alternative), and nothing is scored until the visitor confirms

#### Scenario: An unusable URL fails honestly

- **WHEN** the submitted URL is not an Etsy URL at all, or the listing is inactive, private, or the fetch fails
- **THEN** the visitor sees a plain-language reason and no score is shown or stored

### Requirement: One rubric, shared with the scorecard

Evaluation scores are computed by the same Tier A/B rubric defined in the `etsy-zero-sales-funnel` discovery — one shared implementation, not a re-derivation.

**Fails until:** a shared rubric module exists and both surfaces import it; a fixture listing scores identically through both entry points.

#### Scenario: The same listing data scores identically everywhere

- **WHEN** identical listing data is scored via the ELK evaluation and via the labs scorecard path
- **THEN** every Tier A verdict and the Tier B percentage match exactly

### Requirement: The evaluation funnel is measurable

Evaluation activity is instrumented so the next ad burst can read evaluation-starts through pack conversions.

**Fails until:** evaluation-start, evaluation-complete, and pack-offer-click events are visible in analytics from a real page session.

#### Scenario: Evaluation events fire without PII

- **WHEN** a visitor submits a URL and views their evaluation
- **THEN** evaluation-start and evaluation-complete events are recorded (with listing id, never buyer or account data), and clicking the in-flow pack offer records a pack-offer-click event
