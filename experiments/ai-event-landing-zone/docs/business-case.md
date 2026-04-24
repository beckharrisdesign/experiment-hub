# Landing Zone — Business Case

## Hypothesis

Working parents, sandwich-generation caregivers, and other **event-in-inbox** people will pay for automation that turns email, **PDFs**, and newsletters into calendar events—because manual retyping is a hidden tax on top of an already heavy coordination load.

---

## Why This Matters to Me

The market research rationale is personal: the same years often include kids **and** aging parents; calendar and email load compounds. I’m in the demographic; the pain is not theoretical.

_Also captured in `experiments.json` score rationale:_ this is a ten-year problem window for the core family-caregiving season of life, not a one-off productivity tweak.

---

## Who It's For

**Primary:** Dual-earner and single-parent households who live out of email and a primary calendar. **In scope explicitly:** “sandwich generation” and caregivers (school PDFs, medical paperwork, community newsletters), not only generic “productivity power users.”

---

## What It Does

- Parse unstructured sources (email bodies, **PDFs**, newsletter formats—not only plain text)
- Propose and confirm events into Google Calendar and/or Outlook
- **Positioning edge:** family- and caregiver-oriented messaging vs. generic inbox tools

Not MVP: every edge case in international locales and every attachment type—ship a narrow, honest slice first.

---

## Market

| Segment           | Size        | Basis                                                                   |
| ----------------- | ----------- | ----------------------------------------------------------------------- |
| Total market      | $500M–$1B   | US working-parent + heavy calendar users receiving event info via email |
| Reachable segment | $100M–$300M | Subset with willingness to pay for automation                           |
| Year 1 target     | $100K–$350K | ~1.4K–5K users at ~$70/yr                                               |
| Year 3 target     | $1M–$3M     | If conversion and retention hold                                        |

Benchmark incumbents (e.g. NUET ~$70/yr) validate paid demand for “inbox to calendar” even before PDF/newsletter differentiation is proven.

---

## Existing Options

| Product                  | Price             | Strength                           | Limitation                                                   |
| ------------------------ | ----------------- | ---------------------------------- | ------------------------------------------------------------ |
| NUET                     | ~$7/mo or ~$70/yr | Inbox → calendar, family use cases | No explicit PDF/newsletter-first positioning in the same way |
| MailToCal                | Freemium          | Forwarding → Google Calendar       | Google-centric; different multi-format bet                   |
| Parseur, Airparser, etc. | B2B / usage       | Extraction at scale                | Not consumer, not calendar-first UX                          |
| Google / Apple / Outlook | Free              | Some smart features                | Weak on arbitrary PDFs and newsletter layouts                |

**Gap:** A consumer product that owns **“email + PDF + newsletter → my calendar”** with parent/caregiver-native positioning.

---

## Biggest Unknown

**Willingness to pay** for a narrow tool vs. “just forward to calendar / copy-paste / tolerate chaos”—validation must de-risk this before a full build.

---

## Validation Plan

|                | Detail                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- |
| Method         | Landing page + demand test (waitlist, pricing signal, or fake door)                         |
| Traffic        | Parent communities, Reddit, targeted ads on coordination pain                               |
| Budget         | Modest; optimize for learning per dollar                                                    |
| Success        | Clear conversion to paid trial at benchmark ARPU, plus qualitative pull on PDF/newsletter   |
| Decision point | If conversion is soft, narrow who it’s for (e.g. school-year parents only) or tighten wedge |

**Status (hub):** Archived.

---

## Scorecard

| Dimension                 | Score     | Criterion met                                                                  |
| ------------------------- | --------- | ------------------------------------------------------------------------------ |
| B — Business opportunity  | 4/5       | Large productivity adjacency; segment sizing model-based but plausible         |
| P — Personal impact       | 5/5       | Day-to-day pain; long horizon relevance                                        |
| C — Competitive advantage | 3/5       | Differentiation is positioning + multi-format, not a hard moat                 |
| $ — Platform cost         | 3/5       | Integrations, parsing quality, and trust (email access) are real work          |
| S — Social impact         | 5/5       | Reducing coordination load for parents and caregivers has outsized human value |
| **Total**                 | **20/25** | **Validation-first GO**                                                        |

---

## Recommendation

**GO on validation, not on a big build yet.** The MR and scores agree: the category has analogs, the pain is loud, and the unique bet is **PDF + newsletter + caregiver-native UX**. The next move is a cheap proof of demand; archive status fits “idea strong, not shipped.”
