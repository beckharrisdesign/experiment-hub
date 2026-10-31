## Outcomes

See `../../proposal.md`. This capability is part 2 of the change: a confirmed item that could
matter gets its band from real sold listings instead of the model's memory, as cheaply as
possible. Done when a confirmed Sell item at or above the threshold shows a band set from
matching sales with how many it rests on and links to some of them, a repeat item costs no
lookup, too few matches leave the model's band as it was, and every model call and lookup records its
cost. Not doing: licensed price databases, a pricing model of our own, lookups for unconfirmed,
Keep, Donate or low-band items, auction-house or Etsy prices, any upsell.

## ADDED Requirements

### Requirement: Only confirmed items that could matter are looked up

A lookup runs only for an item the family has confirmed, that is headed to Sell, and whose band
is at or above the threshold; its search query is written at that moment and not before, and again
if the family later changes what the item is.

**Fails until:** a confirmed Sell item at or above the threshold triggers exactly one query-writing call and one lookup, and every other item triggers neither.

The lookup gate SHALL require confirmed, destination Sell and a band at or above the person's threshold from their profile ($25, $100 or $500; $100 by default, the `$100–$250` band and up — `COMPS.minBand`), and the server SHALL accept only one of those choices, treating anything else as the default; only then SHALL a text-only call write the search query from the item's confirmed name, mark reading, family note and lot flag; the walkthrough and the re-read SHALL NOT write queries.

#### Scenario: A confirmed item passes the gate

- **WHEN** an item is confirmed, set to Sell and banded at $100 or more
- **THEN** a search query is written for it and one lookup runs

#### Scenario: An item below the gate

- **WHEN** an item is unconfirmed, set to Keep or Donate, or banded under the threshold
- **THEN** no query is written, no lookup runs, and the item shows the model's band with no comps line

#### Scenario: The family raised their threshold

- **WHEN** the profile threshold is $500+ and a confirmed Sell item is banded `$250–$500`
- **THEN** no query is written and no lookup runs

#### Scenario: A tampered threshold

- **WHEN** a lookup request carries a threshold that is not one of the offered choices (for example `under $1`)
- **THEN** the server gates on the $100 default instead

#### Scenario: A lot is looked up as a set

- **WHEN** a confirmed lot passes the gate
- **THEN** its query describes the set ("set of 6 Pyrex mixing bowls"), not one piece

#### Scenario: A message changes what a confirmed item is

- **WHEN** the family's message changes the name or band of a confirmed Sell item that is at or above the threshold
- **THEN** a new query is written and looked up, and a saved result for that query is reused when it is fresh

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

**Fails until:** an item with at least the minimum number of matching sales shows a band derived from them, the count, and links to the listings kept; with fewer, it keeps the model's band with no comps line.

The comps pass SHALL send the confirmed item and its sold listings to a text-only call that returns which listings match, a band from the matching prices and a one-line reason; with at least the minimum number of matches (3 by default) the item SHALL show that band as "Based on N sold" with links to a few kept listings; with fewer, the model's band SHALL stay, with no comps line.

#### Scenario: Enough matching sales

- **WHEN** the comps pass keeps at least three matching listings
- **THEN** the item's band is set from them and the item shows "Based on N sold" with links to some of them

#### Scenario: Too few matching sales

- **WHEN** fewer than three listings match the item
- **THEN** the item keeps the model's band and shows no comps line

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
band and the reason goes on the cost row.

**Fails until:** with no provider key, a provider error, or a quota response, the gated item shows the model's band with no comps line, the reason is recorded, and nothing else on the screen fails.

When no provider key is configured, the provider errors or times out, or the plan's quota is spent, the item SHALL keep the model's band with no comps line and the reason SHALL be recorded on the cost row; the provider key SHALL never reach the browser; a later visit SHALL retry the lookup.

#### Scenario: No provider key is configured

- **WHEN** a gated item is confirmed on an environment with no provider key
- **THEN** the item keeps the model's band, shows no comps line, and the cost row says lookups are not configured

#### Scenario: The provider fails

- **WHEN** the provider errors, times out or reports the quota is spent
- **THEN** the item keeps the model's band, the cost row records the failed call and its reason, and the next visit tries again
