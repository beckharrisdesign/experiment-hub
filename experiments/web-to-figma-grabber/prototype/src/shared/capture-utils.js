export function clampRectToBounds(rect, bounds) {
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

export function buildDomPath(segments) {
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

export function extractStyleSubset(styleSource, keys) {
  const subset = {};
  keys.forEach((key) => {
    subset[key] = styleSource[key];
  });
  return subset;
}

export function buildCaptureEnvelope(input) {
  return {
    schemaVersion: "1.0.0",
    mode: input.mode,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    source: input.source,
    target: input.target,
    payload: input.payload,
  };
}
