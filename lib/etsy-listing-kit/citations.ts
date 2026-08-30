/**
 * Citation registry for the listing evaluation
 * (openspec/changes/elk-listing-evaluation, design decision 11).
 *
 * Every recommendation card cites Etsy's own documentation with a
 * last-checked date, so the rubric visibly tracks living guidance.
 *
 * Verification posture: etsy.com and help.etsy.com return 403 to automated
 * fetches, so quotes are captured via search excerpts and must be re-verified
 * verbatim in a real browser. `verifiedVerbatim` stays false until that pass
 * happens; flipping it (and bumping `lastCheckedAt`) is a manual, recurring
 * maintenance touch — never automated.
 */

export interface Citation {
  /** Rubric criterion key this quote supports (matches lib/etsy-scorecard.ts). */
  criterion: string;
  quote: string;
  sourceTitle: string;
  sourceUrl: string;
  /** ISO date of the most recent human check. */
  lastCheckedAt: string;
  /** True only after a human has confirmed the quote verbatim in a browser. */
  verifiedVerbatim: boolean;
}

export const CITATIONS: Citation[] = [
  {
    criterion: 'photos',
    quote:
      'Using multiple images may increase your conversion rate because each additional image you add gives shoppers more information about your product.',
    sourceTitle: 'Etsy Seller Handbook, “Creating Listings That Convert”',
    sourceUrl: 'https://www.etsy.com/seller-handbook/article/366469719354',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
  {
    criterion: 'photo_quality',
    quote:
      'The recommended size for listing images is 2000px for the shortest side of the image.',
    sourceTitle: 'Etsy Seller Handbook photography guidance',
    sourceUrl: 'https://www.etsy.com/seller-handbook/article/366469719354',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
  {
    criterion: 'title_length',
    quote:
      'Focus on writing short, clear, descriptive titles that make it easy for shoppers who are scanning a busy search results page to see what you’re selling.',
    sourceTitle: 'Etsy Help, “SEO for Shop and Listing Pages”',
    sourceUrl:
      'https://help.etsy.com/hc/en-us/articles/115015663987-Search-Engine-Optimization-SEO-for-Shop-and-Listing-Pages',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
  {
    criterion: 'alt_text',
    quote:
      'When writing alt text, clearly and accurately describe what’s in the photo. Consider including information like color, texture, and material.',
    sourceTitle: 'Etsy Help, “How to Add a Text Alternative to Your Listing Images”',
    sourceUrl:
      'https://help.etsy.com/hc/en-us/articles/4406604492823-How-to-Add-a-Text-Alternative-to-Your-Listing-Images',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
  {
    criterion: 'video',
    quote:
      'Add up to 2 videos to each listing, if possible… they could increase your visibility in Google.',
    sourceTitle: 'Etsy Help, “SEO for Shop and Listing Pages”',
    sourceUrl:
      'https://help.etsy.com/hc/en-us/articles/115015663987-Search-Engine-Optimization-SEO-for-Shop-and-Listing-Pages',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
  {
    criterion: 'tags',
    quote: 'The 13 tags you add should all be as unique as possible.',
    sourceTitle: 'Etsy Seller Handbook, “Keywords 101: Everything You Need to Know”',
    sourceUrl: 'https://www.etsy.com/seller-handbook/article/382774281517',
    lastCheckedAt: '2026-08-30',
    verifiedVerbatim: false,
  },
];

export function citationFor(criterion: string): Citation | undefined {
  return CITATIONS.find((c) => c.criterion === criterion);
}

/** "checked Aug 30, 2026" — the render used on every card. */
export function checkedLabel(citation: Citation): string {
  const d = new Date(citation.lastCheckedAt + 'T00:00:00Z');
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `checked ${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
