import {
  extractTextFromImage,
  parsePacketText,
  type ExtractedSeedData,
} from "./packetReader";
import {
  extractMultipleFromImage,
  extractSingleImageWithAI,
  extractWithAI,
  type AIExtractedData,
} from "./packetReaderAI";
import {
  buildCanonicalExtractionFromSeedData,
  CanonicalExtractionResult,
  OPENAI_PILE_IDENTIFICATION_TECHNIQUE,
  OPENAI_VISION_SINGLE_TECHNIQUE,
  OPENAI_VISION_TWO_IMAGE_TECHNIQUE,
  PacketImageInput,
  TESSERACT_PARSE_TECHNIQUE,
} from "./packetExtraction";

export async function runTesseractParseTechnique(
  images: PacketImageInput[],
): Promise<CanonicalExtractionResult> {
  const texts = await Promise.all(
    images.map(async (image) => ({
      image,
      text: await extractTextFromImage(image.file ?? ""),
    })),
  );
  const combinedText = texts.map(({ text }) => text.text).join("\n\n");
  const parsed = parsePacketText(combinedText);
  const averageConfidence =
    texts.length > 0
      ? texts.reduce((sum, { text }) => sum + text.confidence, 0) / texts.length
      : undefined;

  return buildCanonicalExtractionFromSeedData(parsed, {
    attemptId: "tesseract-parse",
    technique: TESSERACT_PARSE_TECHNIQUE,
    imageLabels: images.map((image) => image.label),
    confidence: averageConfidence,
    rawText: combinedText,
    rawOutput: parsed,
  });
}

export function buildCanonicalFromParsedPacketText(
  text: string,
  attemptId = "fixture-transcript-parse",
): CanonicalExtractionResult {
  const parsed = parsePacketText(text);
  return buildCanonicalExtractionFromSeedData(parsed, {
    attemptId,
    technique: TESSERACT_PARSE_TECHNIQUE,
    imageLabels: ["unknown"],
    confidence: parsed.confidence ?? 0.7,
    rawText: text,
    rawOutput: parsed,
  });
}

export async function runOpenAISingleImageTechnique(
  image: PacketImageInput,
  apiKey?: string,
): Promise<AIExtractedData> {
  const data = await extractSingleImageWithAI(
    image.file ?? "",
    image.label === "back" ? "back" : "front",
    apiKey,
  );
  return attachCanonicalExtraction(data, {
    attemptId: `openai-single-${image.label}`,
    technique: OPENAI_VISION_SINGLE_TECHNIQUE,
    imageLabels: [image.label],
  });
}

export async function runOpenAITwoImageTechnique(
  images: PacketImageInput[],
  apiKey?: string,
): Promise<AIExtractedData> {
  const front = images[0];
  if (!front?.file) {
    throw new Error("At least one packet image is required.");
  }
  const back = images[1];
  const data = await extractWithAI(front.file, back?.file, apiKey);
  return attachCanonicalExtraction(data, {
    attemptId: "openai-two-image",
    technique: OPENAI_VISION_TWO_IMAGE_TECHNIQUE,
    imageLabels: images.map((image) => image.label),
  });
}

export async function runOpenAIPileIdentificationTechnique(
  image: PacketImageInput,
  apiKey?: string,
): Promise<AIExtractedData[]> {
  const seeds = await extractMultipleFromImage(image.file ?? "", apiKey);
  return seeds.map((seed, index) =>
    attachCanonicalExtraction(seed, {
      attemptId: `openai-pile-${index + 1}`,
      technique: OPENAI_PILE_IDENTIFICATION_TECHNIQUE,
      imageLabels: [image.label],
    }),
  );
}

export function attachCanonicalExtraction<T extends ExtractedSeedData>(
  data: T,
  options: Parameters<typeof buildCanonicalExtractionFromSeedData>[1],
): T & { canonicalExtraction: CanonicalExtractionResult } {
  return {
    ...data,
    canonicalExtraction: buildCanonicalExtractionFromSeedData(data, options),
  };
}
