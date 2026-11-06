## Outcomes

See `../../proposal.md`. This capability is part 2 of the change: an item that could
matter gets its band from real sold listings instead of the model's memory, as cheaply as
possible. Done when a Sell item at or above the threshold shows a band set from
matching sales with how many it rests on and links to some of them, a repeat item costs no
lookup, too few matches leave the model's band as it was, and every model call and lookup records its
cost. Not doing: licensed price databases, a pricing model of our own, lookups for
Keep, Donate or low-band items, auction-house or Etsy prices, any upsell.

## ADDED Requirements

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

### Requirement: The band comes from matching sales and cites them

A short text-only pass keeps only the sold listings that are the same object and sets the band
from them, and the item shows what it rests on.

**Fails until:** an item with at least the minimum number of matching sales shows a band derived from them, the count, and links to the listings kept; with fewer, it keeps the model's band and says how many matched.

The comps pass SHALL send the item and its sold listings to a text-only call that returns which listings match, a band from the matching prices and a one-line reason; with at least the minimum number of matches (3 by default) the item SHALL show that band as "Based on N sold" with links to a few kept listings; with fewer, the model's band SHALL stay and the item SHALL say how many matched and how many it takes.

#### Scenario: Enough matching sales

- **WHEN** the comps pass keeps at least three matching listings
- **THEN** the item's band is set from them and the item shows "Based on N sold" with links to some of them

#### Scenario: Too few matching sales

- **WHEN** fewer than three listings match the item
- **THEN** the item keeps the model's band and shows "Found N matching sales. It takes 3 to set the price."

#### Scenario: The family changes the band by hand

- **WHEN** the family sets a band on an item that has comps
- **THEN** their band is shown and kept, and the comps stay visible for reference

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

The server SHALL allow one completed check per item per device per 24 hours, reading `esp_comps_checks` before any lookup; if it cannot read the last check it SHALL NOT run one. Each completed check, "ok" or "too-few", SHALL be saved with its timestamp, what it was given (item, mark, note, set, price before), the search, models, listings source and pull time, found, checked and matched counts, reason, result, matched listings and those left out. The item screen SHALL show the saved check on opening with no lookup, and the button SHALL say when it comes back.

#### Scenario: A second click within the day

- **WHEN** a request arrives for an item whose last completed check was under 24 hours ago on this device
- **THEN** no lookup runs, and the response carries the saved check and when the next is allowed

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
