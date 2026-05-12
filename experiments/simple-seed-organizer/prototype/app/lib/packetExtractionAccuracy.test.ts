import { describe, expect, it } from "vitest";
import { KNOWN_GOOD_SEED_PACKET_FIXTURES } from "./packet-fixtures/knownGoodSeedPackets";
import {
  formatAccuracyFailures,
  isLiveExtractionEvaluationEnabled,
  scoreExtractionFixture,
} from "./packetExtractionAccuracy";
import { TESSERACT_PARSE_TECHNIQUE } from "./packetExtraction";
import { buildCanonicalFromParsedPacketText } from "./packetExtractionTechniques";

// ---------------------------------------------------------------------------
// Deterministic fixture scoring
// ---------------------------------------------------------------------------

describe("packet extraction accuracy fixtures", () => {
  it("scores known-good transcript fixtures without live AI calls", () => {
    const reports = KNOWN_GOOD_SEED_PACKET_FIXTURES.map((fixture) => {
      const transcript = fixture.transcripts?.combined;
      expect(transcript).toBeDefined();
      const extraction = buildCanonicalFromParsedPacketText(transcript!);
      return scoreExtractionFixture(
        fixture,
        extraction,
        TESSERACT_PARSE_TECHNIQUE.id,
      );
    });

    for (const report of reports) {
      expect(formatAccuracyFailures(report)).toBe("");
      expect(report.failed).toBe(0);
      expect(report.passed).toBe(report.total);
    }
  });

  it("reports actionable field-level failures", () => {
    const fixture = KNOWN_GOOD_SEED_PACKET_FIXTURES[0];
    const extraction = buildCanonicalFromParsedPacketText("Pepper\nFull Shade");
    const report = scoreExtractionFixture(
      fixture,
      extraction,
      TESSERACT_PARSE_TECHNIQUE.id,
    );
    const failures = formatAccuracyFailures(report);

    expect(report.failed).toBeGreaterThan(0);
    expect(failures).toContain(fixture.name);
    expect(failures).toContain(TESSERACT_PARSE_TECHNIQUE.id);
    expect(failures).toContain("expected");
    expect(failures).toContain("got");
  });

  it("keeps live OCR/AI evaluation opt-in", () => {
    expect(isLiveExtractionEvaluationEnabled({})).toBe(false);
    expect(
      isLiveExtractionEvaluationEnabled({ SEED_PACKET_LIVE_EVAL: "1" }),
    ).toBe(true);
  });
});
