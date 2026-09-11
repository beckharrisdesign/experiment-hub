"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Col,
  Field,
  Grid,
  Inline,
  MediaFrame,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spacer,
  Stack,
} from "@beckharrisdesign/mvds";
import { convertSvg, type ConvertResult } from "@/lib/svg-to-stitch/convert";
import StitchPreview from "./StitchPreview";

interface Source {
  name: string;
  text: string;
}

const SIZE_OPTIONS = [
  { value: 50, label: "50 mm — small patch" },
  { value: 80, label: "80 mm" },
  { value: 100, label: "100 mm — 4×4 in hoop" },
  { value: 130, label: "130 mm — 5×7 in hoop" },
  { value: 160, label: "160 mm — 6×10 in hoop" },
  { value: 200, label: "200 mm — 8×8 in hoop" },
  { value: 260, label: "260 mm" },
  { value: 300, label: "300 mm" },
];

const STITCH_OPTIONS = [1.5, 2, 2.5, 3, 3.5, 4];

function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, "");
}

// Settings errors are already written for people; parser internals are not.
// Map those to recovery guidance instead of leaking token positions.
function friendlyError(message: string): string {
  if (
    /malformed path data|unsupported path command|invalid arc flag/i.test(
      message,
    )
  ) {
    return "Couldn't read a path in this SVG. Try re-exporting it as a plain SVG from your design tool.";
  }
  if (/could not parse|not an SVG/i.test(message)) {
    return "That file doesn't look like an SVG. Export as plain SVG and try again.";
  }
  if (/no stitchable geometry/i.test(message)) {
    return "No stitchable outlines found. Make sure the SVG has visible paths or shapes (not just images or text).";
  }
  return message;
}

function download(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline gap={8} align="center">
      <CardDescription>{label}</CardDescription>
      <Spacer />
      <Badge variant="neutral">{value}</Badge>
    </Inline>
  );
}

export default function SvgToStitchPage() {
  const [source, setSource] = useState<Source | null>(null);
  const [widthMm, setWidthMm] = useState(100);
  const [stitchMm, setStitchMm] = useState(2.5);
  const [dragOver, setDragOver] = useState(false);

  const loadFile = useCallback(async (file: File) => {
    const text = await file.text();
    setSource({ name: file.name, text });
  }, []);

  // Conversion is pure and fast (milliseconds for typical SVGs), so it just
  // recomputes on every settings change — no server, files never upload.
  const result = useMemo<
    { ok: ConvertResult } | { error: string } | null
  >(() => {
    if (!source) return null;
    try {
      return {
        ok: convertSvg(source.text, {
          targetWidthMm: widthMm,
          stitchLengthMm: stitchMm,
          designName: baseName(source.name).toUpperCase(),
        }),
      };
    } catch (e) {
      return {
        error: friendlyError(
          e instanceof Error ? e.message : "conversion failed",
        ),
      };
    }
  }, [source, widthMm, stitchMm]);

  const plan = result && "ok" in result ? result.ok.plan : null;

  return (
    <main>
      <Section py={24} innerSize="lg">
        <Stack gap={24}>
          <Inline gap={8} align="center" wrap>
            <h1>SVG to Stitch</h1>
            {source && <Badge variant="muted">{source.name}</Badge>}
            <Spacer />
            <label style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadFile(file);
                  e.target.value = "";
                }}
              />
              <Button variant="secondary" size="sm" asChild>
                <span>{source ? "Replace SVG" : "Add SVG"}</span>
              </Button>
            </label>
          </Inline>

          <Grid cols={{ base: 1, md: 12 }} gap={24}>
            <Col span={{ base: 1, md: 4 }}>
              <Stack gap={16}>
                <Field
                  label="Design size"
                  help="Larger side of the design. Check your hoop before going big."
                >
                  <Select
                    value={String(widthMm)}
                    onValueChange={(v) => setWidthMm(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Stitch length"
                  help="2.5 mm is a solid default running stitch. Shorter follows curves tighter."
                >
                  <Select
                    value={String(stitchMm)}
                    onValueChange={(v) => setStitchMm(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STITCH_OPTIONS.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v} mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {plan && (
                  <Card size="sm">
                    <CardContent>
                      <Stack gap={8}>
                        <StatRow
                          label="Stitches"
                          value={plan.stats.stitches.toLocaleString()}
                        />
                        <StatRow
                          label="Jumps"
                          value={String(plan.stats.jumps)}
                        />
                        <StatRow
                          label="Thread colors"
                          value={String(plan.colors.length)}
                        />
                        <StatRow
                          label="Size"
                          value={`${plan.stats.widthMm.toFixed(0)} × ${plan.stats.heightMm.toFixed(0)} mm`}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {plan && plan.colors.length > 0 && (
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Sew order</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Stack gap={8}>
                        {plan.colors.map((color, i) => (
                          <Inline key={`${color}-${i}`} gap={8} align="center">
                            <CardDescription>{i + 1}.</CardDescription>
                            <span
                              aria-hidden
                              style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: color,
                                border: "1px solid var(--border)",
                              }}
                            />
                            <CardDescription>{color}</CardDescription>
                          </Inline>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                <Stack gap={8}>
                  <Button
                    disabled={!plan}
                    onClick={() =>
                      result && "ok" in result && source
                        ? download(
                            result.ok.dst,
                            `${baseName(source.name)}.dst`,
                          )
                        : undefined
                    }
                  >
                    Download DST
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!plan}
                    onClick={() =>
                      result && "ok" in result && source
                        ? download(
                            result.ok.exp,
                            `${baseName(source.name)}.exp`,
                          )
                        : undefined
                    }
                  >
                    Download EXP
                  </Button>
                </Stack>

                <Callout>
                  Wilcom&apos;s EMB format is proprietary with no public spec,
                  so no converter can write it directly. DST is the universal
                  machine format. EXP covers Melco. Both open in Wilcom and
                  Hatch, which can save EMB from there.
                </Callout>
              </Stack>
            </Col>

            <Col span={{ base: 1, md: 8 }}>
              <Card>
                <CardHeader>
                  <Inline gap={8} align="center" wrap>
                    <CardTitle>Stitch preview</CardTitle>
                    {result && "error" in result && (
                      <Badge variant="destructive">{result.error}</Badge>
                    )}
                    <Spacer />
                    {plan && (
                      <CardDescription>
                        dashed = jump · fills stitch as outlines
                      </CardDescription>
                    )}
                  </Inline>
                </CardHeader>
                <CardContent>
                  <MediaFrame
                    ratio="video"
                    style={
                      dragOver
                        ? { boxShadow: "0 0 0 2px var(--ring)" }
                        : undefined
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void loadFile(file);
                    }}
                  >
                    {plan ? (
                      <StitchPreview plan={plan} />
                    ) : (
                      <Stack
                        align="center"
                        justify="center"
                        style={{ height: "100%" }}
                      >
                        <CardDescription>
                          Drop an SVG here (or use Add SVG) to see its stitch
                          path.
                        </CardDescription>
                        <CardDescription>
                          Everything runs in your browser. Nothing is uploaded.
                        </CardDescription>
                      </Stack>
                    )}
                  </MediaFrame>
                </CardContent>
              </Card>
            </Col>
          </Grid>
        </Stack>
      </Section>
    </main>
  );
}
