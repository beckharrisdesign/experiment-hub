export type CaptureMode = "screenshot" | "layout";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportBounds {
  width: number;
  height: number;
}

export interface DomPathSegment {
  tag?: string;
  id?: string;
  classes?: string[];
  index: number;
}

export interface CaptureSource {
  pageUrl: string;
  pageTitle: string;
  viewport: ViewportBounds;
}

export interface CaptureTarget {
  fileKey?: string;
  pageName?: string;
}

export interface CaptureEnvelopeInput<TPayload extends object> {
  mode: CaptureMode;
  source: CaptureSource;
  target: CaptureTarget;
  payload: TPayload;
  capturedAt?: string;
}

export interface CaptureEnvelope<TPayload extends object> {
  schemaVersion: "1.0.0";
  mode: CaptureMode;
  capturedAt: string;
  source: CaptureSource;
  target: CaptureTarget;
  payload: TPayload;
}

export function clampRectToBounds(
  rect: Rect,
  bounds: ViewportBounds,
): Rect {
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const maxWidth = Math.max(0, Math.round(bounds.width) - x);
  const maxHeight = Math.max(0, Math.round(bounds.height) - y);

  return {
    x,
    y,
    width: Math.max(0, Math.min(Math.round(rect.width), maxWidth)),
    height: Math.max(0, Math.min(Math.round(rect.height), maxHeight)),
  };
}

export function buildDomPath(segments: DomPathSegment[]): string {
  return segments
    .map((segment) => {
      const tag = (segment.tag || "unknown").toLowerCase();
      const id = segment.id ? `#${segment.id}` : "";
      const classes =
        segment.classes && segment.classes.length > 0
          ? `.${segment.classes.join(".")}`
          : "";
      const nth = `:nth-of-type(${segment.index + 1})`;
      return `${tag}${id}${classes}${nth}`;
    })
    .join(" > ");
}

export function extractStyleSubset<
  TStyleSource extends Record<string, string>,
  TKeys extends keyof TStyleSource,
>(styleSource: TStyleSource, keys: TKeys[]): Record<TKeys, string> {
  const subset = {} as Record<TKeys, string>;
  keys.forEach((key) => {
    subset[key] = styleSource[key];
  });
  return subset;
}

export function buildCaptureEnvelope<TPayload extends object>(
  input: CaptureEnvelopeInput<TPayload>,
): CaptureEnvelope<TPayload> {
  return {
    schemaVersion: "1.0.0",
    mode: input.mode,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    source: input.source,
    target: input.target,
    payload: input.payload,
  };
}
