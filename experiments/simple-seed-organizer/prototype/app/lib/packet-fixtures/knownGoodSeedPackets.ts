import type { SeedPacketFixture } from "../packetExtractionAccuracy";

export const KNOWN_GOOD_SEED_PACKET_FIXTURES: SeedPacketFixture[] = [
  {
    name: "burpee-cherry-tomato-transcript",
    description:
      "Starter deterministic transcript fixture; replace or extend with user-provided packet photos and expected values.",
    expected: {
      name: "Tomato",
      brand: "Burpee",
      year: 2024,
      quantity: "30 Seeds",
      daysToGermination: "10-20",
      daysToMaturity: "70-80",
      plantingDepth: "1/4 inch",
      spacing: "12-18 inches",
      sunRequirement: "full-sun",
    },
    transcripts: {
      combined: `
BURPEE
TOMATO
CHERRY TOMATO
Packed for 2024

30 Seeds

Days to Germination: 10-20 days
Days to Maturity: 70-80 days

Planting Depth: 1/4 inch
Spacing: 12-18 inches apart

Full Sun
`,
    },
    tolerances: {
      sunRequirement: { match: "normalized" },
    },
  },
];
