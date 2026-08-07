# Tag Vocabulary

The controlled vocabulary of generic tags used to organize PDFs. Tags are flat
and non-hierarchical — they combine freely to support faceted search.

**This file holds only the generic vocabulary.** Named entities (people,
vendors, providers, schools, employers) and location tags are personal data and
live in the Notion **Entities** database, fetched at runtime by
`prototype/lib/entities-notion.js`. They are deliberately not in this
repository. See `../README.md` for how the two halves combine.

Parsed by `prototype/lib/taxonomy-loader.js`. Section headings and table shape
are load-bearing — the parser matches on `### N. SECTION NAME` and reads the
first column of each table. Add rows freely; don't rename headings.

---

## Tag Database

### 1. DOCUMENT TYPE TAGS
These describe what kind of document it is:

| Tag Slug | Description | Notes |
|----------|-------------|-------|
| `receipt` | Purchase receipts | - |
| `invoice` | Billing invoices | - |
| `statement` | Account statements, summaries | - |
| `bill` | Bills requiring payment | - |
| `tax-form` | Tax-related forms (W-2, 1095-C, etc.) | - |
| `medical-record` | Medical visit notes, test results | - |
| `prescription` | Prescription documents | - |
| `insurance-card` | Insurance cards/verification | - |
| `eob` | Explanation of Benefits | - |
| `registration` | Vehicle or other registrations | - |
| `inspection` | Vehicle inspections | - |
| `contract` | Contracts, agreements | - |
| `letter` | Correspondence, letters | - |
| `form` | Forms (blank or filled) | - |
| `report-card` | School report cards | - |
| `assessment` | School assessments, test results | - |
| `certificate` | Certificates, awards | - |
| `ticket` | Event tickets, passes | - |
| `itinerary` | Travel itineraries | - |
| `map` | Maps, directions | - |
| `menu` | Restaurant menus | - |
| `flyer` | Promotional flyers, advertisements | - |
| `instruction` | Instructions, manuals | - |
| `warranty` | Warranty documents | - |
| `quote` | Service quotes, estimates | - |

### 2. CATEGORY TAGS
Broad subject area:

| Tag Slug | Description | Notes |
|----------|-------------|-------|
| `medical` | Healthcare related | - |
| `dental` | Dental care | - |
| `vision` | Vision/eye care | - |
| `veterinary` | Pet medical care | - |
| `financial` | Banking, investments, loans | - |
| `tax` | Tax documents | - |
| `insurance` | Insurance (health, auto, home, life) | - |
| `school` | K-12 education | - |
| `camp` | Summer camps, activities | - |
| `vehicle` | Car/vehicle related | - |
| `home` | Home maintenance, services | - |
| `utilities` | Electric, water, gas, internet | - |
| `hoa` | Homeowner association | - |
| `retail` | Shopping, purchases | - |
| `grocery` | Food shopping | - |
| `restaurant` | Dining out | - |
| `travel` | Travel, lodging, transportation | - |
| `entertainment` | Entertainment, recreation | - |
| `membership` | Memberships, subscriptions | - |
| `employment` | Work, payroll, benefits | - |
| `legal` | Legal documents | - |
| `government` | Government agencies, DMV, IRS | - |

### 3. STATUS/ACTION TAGS
Document status and required actions:

| Tag Slug | Description | Category | Notes |
|----------|-------------|----------|-------|
| `needs-filing` | Awaiting permanent filing | Action/Workflow | - |
| `needs-payment` | Bill needs to be paid | Action/Workflow | - |
| `paid` | Already paid | Action/Workflow | - |
| `reimbursable` | Can be reimbursed | Action/Workflow | - |
| `tax-deductible` | Tax deductible expense | Action/Workflow | - |
| `follow-up-needed` | Requires follow-up action | Action/Workflow | - |
| `keep-annual` | Keep for 1 year | Retention | - |
| `keep-7yr` | Keep for 7 years (tax requirement) | Retention | - |
| `keep-permanent` | Keep permanently | Retention | - |
| `scan-only` | Original can be discarded after scanning | Retention | - |
| `original-required` | Must keep physical original | Retention | - |
| `active` | Currently active/relevant | Document State | - |
| `expired` | No longer valid | Document State | - |
| `superseded` | Replaced by newer version | Document State | - |
| `duplicate` | Duplicate copy | Document State | - |
| `possible-duplicate` | Suspected duplicate, needs verification | Document State | - |
| `void` | Voided document | Document State | - |
| `draft` | Draft version | Document State | - |
| `needs-deleting` | Document is a mistake and should be deleted (e.g., duplicate scan) | Document State | - |

### 4. TIME PERIOD TAGS
Simple date-based tags for when the filename date alone isn't sufficient. These are dynamically generated based on document dates.

| Tag Pattern | Description | Format | Example |
|-------------|-------------|--------|---------|
| `year-YYYY` | Calendar year | YYYY = 4-digit year | `year-2024`, `year-2025` |
| `month-MM` | Month of year | MM = 01-12 | `month-01` (January), `month-12` (December) |
| `week-WW` | Week of year | WW = 01-52 | `week-01`, `week-26` |
| `day-DD` | Day of month | DD = 01-31 | `day-01`, `day-15` |

**Notes:** 
- Combine as needed: `year-2024 month-03` for March 2024
- Week numbers follow ISO 8601 (week starting Monday)
- Use filename dates for primary dating; these tags are for additional context or grouping
- These tags are generated automatically based on document dates, not manually added

### 5. SPECIAL FLAGS
Important markers:

| Tag Slug | Description | Notes |
|----------|-------------|-------|
| `multi-doc` | Contains multiple separate documents (NEEDS SPLITTING) | - |
| `no-split-needed` | Document is legitimately multi-page and should not be split | - |
| `already-split` | Original document has been split into multiple files | - |
| `from-split` | Document was created from splitting another document | - |
| `confidential` | Contains sensitive information | - |
| `original-scan` | Scanned from physical original | - |
| `incomplete` | Missing pages or information | - |
| `illegible` | Poor quality, hard to read | - |
| `warranty-active` | Active warranty | - |
| `recurring` | Recurring service/subscription | - |

### 6. ENTITY TAGS (external — Notion)

Entity slugs are **not listed here.** They are pulled from the Notion Entities
database at runtime, where `Slug` is the stable join key.

| Source | Produces |
|---|---|
| Entities where `Kind = Person` | people slugs |
| Entities where `Kind = Organization` | vendor / provider / school / employer slugs |
| Distinct `Location` values across entities | `location-*` tags |

Only `Slug`, `Name`, `Aliases`, `Kind`, `Relationship`, `Category`, and `Status`
are read. Contact and account fields are never fetched — see
`prototype/lib/entities-notion.js`.

---

## Tagging Examples

Examples use placeholder entity slugs. Real slugs come from Notion.

**Grocery receipt**
```
receipt, grocery, retail, <vendor-slug>, <person-slug>, paid, scan-only, year-2025, month-03
```

**School report card**
```
report-card, school, <school-slug>, <person-slug>, keep-permanent, year-2025
```

**Tax form**
```
tax-form, financial, insurance, <vendor-slug>, <person-slug>, year-2024, keep-7yr
```

**Multi-page medical bill covering two people**
```
bill, statement, medical, <provider-slug>, <person-slug>, <person-slug>, needs-payment, multi-doc, keep-7yr
```

**Vehicle inspection**
```
inspection, vehicle, <vendor-slug>, <person-slug>, keep-annual, paid, year-2025
```

---

## Usage Instructions

1. Every document gets at least one **document type** and one **category** tag.
2. Add **status/action** tags when the document needs something done to it.
3. Add **retention** tags to drive future cleanup.
4. Add **entity** tags for any person or organization the document concerns,
   using the exact slug from Notion — never a natural name, never an invented slug.
5. Add **time period** tags when the date matters for grouping.
6. If a person or organization appears in a document but has no entity in
   Notion, add it there first. Do not invent a slug locally.
