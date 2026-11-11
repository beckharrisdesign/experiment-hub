# sold-comps-lookup Specification

## Purpose
An item that could matter gets its price from real sold listings, as cheaply as possible: the family clicks Check sold prices, the app offers possible matches, and a person picks the sale that sets the price (D23–D25). Every model call and lookup records its cost. From `estate-sale-planner-sold-comps` (archived 2026-11-11).

## Requirements

### Requirement: Only items that could matter are looked up

A lookup runs only for an item headed to Sell whose band is at or above the threshold, and only
when the family clicks its button (D23); there is no confirmed state (review queue #60). Its
search query is written on the first check and not before, and again if the family later changes
what the item is.

**Fails until:** clicking the button on a Sell item at or above the threshold triggers exactly one query-writing call and one lookup, nothing runs without a click, and every other item has no button.

The lookup gate SHALL require destination Sell and a band at or above the person's threshold from their profile ($25, $100 or $500; $100 by default, the `$100–$250` band and up — `COMPS.minBand`), and the server SHALL accept only one of those choices, treating anything else as the default; only then SHALL a text-only call write the search query from the item's current name, mark reading, family note and lot flag; the walkthrough and the re-read SHALL NOT write queries.

#### Scenario: An item passes the gate

- **WHEN** the family clicks **Check sold prices** on a Sell item banded at $100 or more
- **THEN** a search query is written for it and one lookup runs

#### Scenario: Nothing runs without a click

- **WHEN** an item is set to Sell at $100 or more, or an eligible item is opened or renamed
- **THEN** no query is written and no lookup runs

#### Scenario: Sold prices pull an item under the threshold

- **WHEN** a check sets a Sell item's band below the threshold
- **THEN** the item stays eligible, judged on its price from before sold prices, and can be checked again after 24 hours

#### Scenario: An item below the gate

- **WHEN** an item is set to Keep or Donate, has no destination yet, or is banded under the threshold
- **THEN** there is no button, no query is written, no lookup runs, and the item shows the model's band and says why it wasn't checked

#### Scenario: The family raised their threshold

- **WHEN** the profile threshold is $500+ and a Sell item is banded `$250–$500`
- **THEN** no query is written and no lookup runs

#### Scenario: A tampered threshold

- **WHEN** a lookup request carries a threshold that is not one of the offered choices (for example `under $1`)
- **THEN** the server gates on the $100 default instead

#### Scenario: A lot is looked up as a set

- **WHEN** a lot passes the gate
- **THEN** its query describes the set ("set of 6 Pyrex mixing bowls"), not one piece

#### Scenario: A correction changes what the item is

- **WHEN** a message or a photo correction changes the name or band of a Sell item that is at or above the threshold
- **THEN** the old result no longer applies, and the next click writes a new query and looks it up

### Requirement: Lookups are saved and reused

Every lookup goes through one provider interface and is saved, so a repeat item costs nothing.

**Fails until:** a second lookup for the same normalized query inside the freshness window returns from `esp_comps` without calling the provider.

Lookups SHALL go through a provider adapter (CompsAPI first, selected by configuration) called only server-side with a server key; every response SHALL be stored in `esp_comps` under the normalized query with provider, fetch time and the sold listings (price, date, title, link, image when given); a stored result younger than the freshness window (90 days by default) SHALL be used instead of a new call.

#### Scenario: First lookup for a query

- **WHEN** a query has never been looked up
- **THEN** the provider is called once and the results are saved under that query

#### Scenario: A repeat query inside the freshness window

- **WHEN** the same normalized query was looked up within the window, from any sale
- **THEN** the saved results are used and the provider is not called

#### Scenario: A stale saved result

- **WHEN** the saved results for a query are older than the window
- **THEN** the provider is called again and the new results replace the old ones

### Requirement: Matches are offered, and a person sets the price

A short text-only pass keeps the sold listings that look like the same object, but it reads only
their titles. So it offers them, and the family compares the photos and picks.

**Fails until:** a check leaves the price alone and offers up to five ranked matches with photos and links, picking one sets the price from that sale, and tapping it again restores the price.

The comps pass SHALL send the item and its sold listings to a text-only call that returns which listings match, closest first, and a one-line reason. A check SHALL NOT change the item's band. The item SHALL offer up to five kept listings, each with its photo, title, price, sold date and link. Picking one SHALL set the band from that sale's price and show that price; tapping it again SHALL restore the band from before. A pick SHALL survive a rename, a re-read and a message, and SHALL give way to a band the family sets by hand. Rejected listings SHALL NOT be offered.

#### Scenario: Matches found

- **WHEN** a check keeps five listings
- **THEN** the price doesn't change, five are offered, and the item shows "5 possible matches. Not priced until you pick one."

#### Scenario: A single match

- **WHEN** a check keeps one listing
- **THEN** it's offered, and picking it sets the price: there's no three-sale minimum

#### Scenario: Nothing matches

- **WHEN** a check keeps no listings
- **THEN** no carousel shows, and the item says the price is still the first estimate

#### Scenario: Picking a sale

- **WHEN** the family picks a sale that sold for $900
- **THEN** the band becomes `$500–$2,000` and the item shows "Based on the sale you picked · $900"

#### Scenario: Undoing a pick

- **WHEN** the family taps the picked sale again, even after switching between sales
- **THEN** the band goes back to what it was before the first pick

#### Scenario: A later check

- **WHEN** an item with a picked sale is checked again
- **THEN** the pick and its price stay, and the picked sale stays on show even if the new check didn't find it

#### Scenario: An item priced by text before this rule

- **WHEN** an item whose band was set automatically from sold listings is checked again
- **THEN** its band goes back to the first estimate until a sale is picked

#### Scenario: The family sets a band by hand

- **WHEN** the family sets a band on an item with a picked sale
- **THEN** their band is shown and the pick is cleared

### Requirement: Every model call and lookup records its cost

What a room costs is a query, not a guess.

**Fails until:** each walkthrough, re-read, query-writing, comps and lookup call writes one `esp_costs` row with its kind, model or provider, tokens and cost.

Every walkthrough, re-read, query-writing and comps call SHALL write an `esp_costs` row with the call kind, model, input and output tokens and estimated cost in cents, and every provider lookup SHALL write one with the provider and its per-request price; cache hits SHALL be recorded at zero cost; recording SHALL never fail the request it describes.

#### Scenario: A walkthrough is recorded

- **WHEN** a room's walkthrough call returns
- **THEN** one cost row records the model, the tokens and the estimated cents for that sale

#### Scenario: A lookup and a cache hit are recorded

- **WHEN** one item triggers a provider lookup and another is answered from the store
- **THEN** the first writes a row with the provider's price and the second writes a zero-cost cache-hit row

#### Scenario: The cost table is unavailable

- **WHEN** writing a cost row fails
- **THEN** the walkthrough, re-read or lookup still returns normally and the failure is logged

### Requirement: When a lookup cannot run, the item keeps the model's band

A missing key, a provider outage or a spent quota never breaks the item; it keeps the model's
band, the item says so, and the reason goes on the cost row.

**Fails until:** with no provider key, a provider error, or a quota response, the item shows the model's band and a line saying why, the reason is recorded, today's check isn't used up, and nothing else on the screen fails.

When no provider key is configured, the provider errors or times out, or the plan's quota is spent, the item SHALL keep the model's band and say why, and the reason SHALL be recorded on the cost row; the provider key SHALL never reach the browser; the failure SHALL NOT count against the daily limit, and the button SHALL offer another try.

#### Scenario: No provider key is configured

- **WHEN** an item passes the gate on an environment with no provider key
- **THEN** the item keeps the model's band, says checks aren't set up, and the cost row says lookups are not configured

#### Scenario: The provider fails

- **WHEN** the provider errors, times out or reports the quota is spent
- **THEN** the item keeps the model's band and says the check didn't use today's, the cost row records the failed call and its reason, and the button offers **Try again**

### Requirement: A check is limited, saved and shown

Each check is a click, limited to one a day per item to keep costs low, and what it was given and
what it found are kept so the item can show them without running again.

**Fails until:** a second completed check within 24 hours is refused on the server with no lookup, and reopening an item shows its saved check, timestamp and sources with no model or provider call.

The server SHALL allow one check per item per device per 24 hours and 100 per device across all items, except for a device listed in `TEST_DEVICE_HASHES`, which SHALL skip those two limits and nothing else; it SHALL refuse a sale saved by another device, and SHALL reserve the check in `esp_comps_checks` before any paid work; if it cannot confirm any of these it SHALL NOT run one. A check that couldn't run SHALL give its reservation back; a paid check that can't be saved SHALL keep its reservation and so its limit. Each completed check, "ok" or "too-few", SHALL be saved with its timestamp, what it was given (item, mark, note, set, price before), the search, models, listings source and pull time, found, checked and matched counts, reason, result, matched listings and those left out. The item screen SHALL show the saved check on opening with no lookup, and the button SHALL say when it comes back.

#### Scenario: A second click within the day

- **WHEN** a request arrives for an item whose last completed check was under 24 hours ago on this device
- **THEN** no lookup runs, and the response carries the saved check and when the next is allowed

#### Scenario: A listed test device

- **WHEN** a device in `TEST_DEVICE_HASHES` checks an item it checked less than 24 hours ago
- **THEN** the check runs and is reserved and saved as usual, its button stays enabled, and another device's sale is still refused

#### Scenario: A paid check can't be saved

- **WHEN** a check completes but writing its result fails
- **THEN** the item still gets the answer, the response says it wasn't saved, and the item stays limited for 24 hours

#### Scenario: Someone else's sale

- **WHEN** a request names a sale saved by another device
- **THEN** it gets a 404 and nothing is spent

#### Scenario: Made-up item ids

- **WHEN** one device has used 100 checks across all items in the last 24 hours
- **THEN** no lookup runs, whatever item id is sent

#### Scenario: The screen is left open

- **WHEN** an item screen stays open past the time the limit expires
- **THEN** the button re-enables without a reload

#### Scenario: The button says when it comes back

- **WHEN** an item was checked in the last 24 hours
- **THEN** its button is disabled and reads "You can check this item again Nov 7 at 10:12 AM."

#### Scenario: A rename doesn't reset the day

- **WHEN** a checked item is renamed within 24 hours
- **THEN** the button stays disabled and the saved check still shows the name it was given

#### Scenario: Reopening costs nothing

- **WHEN** an item with a saved check is opened
- **THEN** the check, its timestamp and its sources show, with no model or provider call and no cost row

#### Scenario: The sources can be followed

- **WHEN** a saved check is on screen
- **THEN** its matched listings link out with price and sold date, and those left out are one click away

#### Scenario: Another device

- **WHEN** a different device opens the same sale and item id
- **THEN** it sees no saved check and has its own limit, until sign-in moves this to the person

### Requirement: A search that finds too little is broadened

An item without a famous maker should still find its comparable sales, and a search that found
nothing should never get stuck.

**Fails until:** an item whose first search finds too few listings tries broader ones, up to the limit, and an empty search is never reused.

The lookup SHALL search a year of sold listings, SHALL read on while fewer than 3 listings match, up to 3 paid reads, and SHALL take words for what isn't known out of every search before sending it with no model call, SHALL try broader searches when one finds fewer than 5 listings, up to 3 searches a check and never a single word, SHALL use the search that found the most, and SHALL NOT remember a search that found nothing. When the first 25 listings keep too few matches it SHALL read the next 25, then broader searches, never reading a listing twice. For an object with no known maker, the comps pass SHALL keep comparable pieces of the same kind, material, era and size, and SHALL NOT keep a different kind of object.

#### Scenario: The first search finds nothing

- **WHEN** an item's first search finds no listings and a broader one finds 50
- **THEN** the broader one is used, and the saved check shows both searches and what each found

#### Scenario: A placeholder in a search

- **WHEN** a search reads "Unknown Maker tambour desk"
- **THEN** "tambour desk" is what's sent

#### Scenario: A remembered search has gone stale

- **WHEN** an item's remembered search no longer finds enough listings
- **THEN** a new search is written and remembered if it finds any

#### Scenario: Small look-alikes crowd the first batch

- **WHEN** the first 25 listings are organizers and the real desks are further down
- **THEN** the next 25 are read, and the matches from both are offered

#### Scenario: No known maker

- **WHEN** a teak roll top desk with no known maker is checked against full-size teak roll top desks and small desk organizers
- **THEN** the desks are kept whoever made them, and the organizers are dropped

#### Scenario: A known maker stays strict

- **WHEN** a Lodge No. 8 skillet is checked
- **THEN** only Lodge No. 8 skillets are kept

#### Scenario: Plenty of listings, few matches

- **WHEN** a search finds 15 listings and one matches
- **THEN** a broader search is read too, and matches from both are offered without repeats

#### Scenario: Thin data

- **WHEN** broadening still finds few matching sales
- **THEN** the item keeps its price and offers what it found
