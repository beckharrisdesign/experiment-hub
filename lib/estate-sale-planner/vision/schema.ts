/**
 * OpenAI structured outputs run in "strict" mode, which accepts a subset of
 * JSON Schema: every object needs `additionalProperties: false` and all of its
 * properties in `required`, and value-range keywords are not allowed. zod's
 * own validation still enforces the ranges on the way back in, so dropping
 * them from the schema the model sees loses nothing.
 */

const DROP = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "multipleOf",
  "pattern",
  "format",
]);

export function strictJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictJsonSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (DROP.has(key)) continue;
    out[key] = key === "properties" && value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, strictJsonSchema(v)]))
      : strictJsonSchema(value);
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as Record<string, unknown>);
  }
  return out;
}
