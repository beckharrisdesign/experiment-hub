"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Badge,
  Button,
  CardDescription,
  Field,
  Inline,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spacer,
  Stack,
} from "@beckharrisdesign/mvds";
import { convertSvg, type ConvertResult } from "@/lib/svg-to-stitch/convert";
import { readMachineFile } from "@/lib/svg-to-stitch/read";
import StitchPreview from "./StitchPreview";

type Source =
  | { name: string; kind: "svg"; text: string }
  | { name: string; kind: "machine"; format: "dst" | "exp"; bytes: Uint8Array };

const SIZE_OPTIONS = [
  { value: 50, label: "50 mm — small patch" },
  { value: 63.5, label: "63.5 mm — 2.5 in patch" },
  { value: 80, label: "80 mm" },
  { value: 100, label: "100 mm — 4×4 in hoop" },
  { value: 130, label: "130 mm — 5×7 in hoop" },
  { value: 160, label: "160 mm — 6×10 in hoop" },
  { value: 200, label: "200 mm — 8×8 in hoop" },
  { value: 260, label: "260 mm" },
  { value: 300, label: "300 mm" },
];

// Running-stitch length is fixed at the solid 2.5 mm default: the panel
// only carries choices whose effect shows up in the design readout.
const STITCH_LENGTH_MM = 2.5;
const FILL_ANGLE_OPTIONS = [0, 30, 45, 60, 90, 135];
const FILL_SPACING_OPTIONS = [0.35, 0.4, 0.5, 0.6, 0.8];

function baseName(fileName: string): string {
  return fileName.replace(/\.(svg|dst|exp)$/i, "");
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
  if (/not a DST file/i.test(message)) {
    return "That file doesn't look like a DST. Make sure it's a Tajima .dst machine file.";
  }
  if (/truncated (DST|EXP) file/i.test(message)) {
    return "This file looks cut off — the end of the design is missing. Try re-downloading or re-exporting it.";
  }
  if (/no stitches found/i.test(message)) {
    return "Couldn't find any stitches in this file. It may be a different format renamed to .dst or .exp.";
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

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted-foreground)",
      }}
    >
      {children}
    </span>
  );
}

export default function SvgToStitchPage() {
  const [source, setSource] = useState<Source | null>(null);
  // Default to the standard 2.5 in patch (63.5 mm).
  const [widthMm, setWidthMm] = useState(63.5);
  const [fillMode, setFillMode] = useState<"fill" | "outline">("fill");
  const [fillAngle, setFillAngle] = useState(45);
  const [fillSpacing, setFillSpacing] = useState(0.4);
  const [satinStrokes, setSatinStrokes] = useState(true);
  const [satinFills, setSatinFills] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const loadFile = useCallback(async (file: File) => {
    const machine = /\.(dst|exp)$/i.exec(file.name);
    if (machine) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setSource({
        name: file.name,
        kind: "machine",
        format: machine[1].toLowerCase() as "dst" | "exp",
        bytes,
      });
    } else {
      const text = await file.text();
      setSource({ name: file.name, kind: "svg", text });
    }
  }, []);

  // Conversion is pure and fast (milliseconds for typical SVGs), so it just
  // recomputes on every settings change — no server, files never upload.
  // A machine file is already a finished plan: it decodes once and ignores
  // the conversion settings entirely.
  const result = useMemo<
    { ok: ConvertResult } | { error: string } | null
  >(() => {
    if (!source) return null;
    try {
      if (source.kind === "machine") {
        const opened = readMachineFile(
          source.format,
          source.bytes,
          baseName(source.name).toUpperCase(),
        );
        return { ok: { plan: opened.plan, dst: opened.dst, exp: opened.exp } };
      }
      return {
        ok: convertSvg(source.text, {
          targetWidthMm: widthMm,
          stitchLengthMm: STITCH_LENGTH_MM,
          fillMode,
          fillAngleDeg: fillAngle,
          fillSpacingMm: fillSpacing,
          satinStrokes,
          satinFills,
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
  }, [
    source,
    widthMm,
    fillMode,
    fillAngle,
    fillSpacing,
    satinStrokes,
    satinFills,
  ]);

  const isMachine = source?.kind === "machine";

  const plan = result && "ok" in result ? result.ok.plan : null;

  // Which thread color is highlighted in the preview (index into plan.colors).
  // A new plan means new colors, so the selection resets with it.
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [prevPlan, setPrevPlan] = useState(plan);
  if (plan !== prevPlan) {
    setPrevPlan(plan);
    setSelectedColor(null);
  }

  return (
    <main
      style={{
        position: "relative",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* Canvas layer — the whole viewport is the preview / drop zone. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: dragOver ? "inset 0 0 0 2px var(--ring)" : undefined,
        }}
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
          <StitchPreview
            plan={plan}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
          />
        ) : (
          <Stack align="center" justify="center" style={{ height: "100%" }}>
            <CardDescription>
              Drop an SVG to convert it — or a DST/EXP machine file to preview
              exactly what it will sew.
            </CardDescription>
            <CardDescription>
              Everything runs in your browser. Nothing is uploaded.
            </CardDescription>
          </Stack>
        )}
      </div>

      {/* Left panel — hugs the side, floats over the canvas. */}
      {panelOpen ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            bottom: 12,
            width: 300,
            maxWidth: "calc(100vw - 24px)",
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Stack gap={16}>
            <Inline gap={8} align="center">
              <h1 style={{ fontSize: 18, margin: 0 }}>Stitch Check</h1>
              <Spacer />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Hide panel"
                onClick={() => setPanelOpen(false)}
              >
                ⟨
              </Button>
            </Inline>

            <Inline gap={8} align="center" wrap>
              {source && <Badge variant="muted">{source.name}</Badge>}
              <label style={{ cursor: "pointer" }}>
                <input
                  type="file"
                  accept=".svg,image/svg+xml,.dst,.exp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void loadFile(file);
                    e.target.value = "";
                  }}
                />
                <Button variant="secondary" size="sm" asChild>
                  <span>{source ? "Replace file" : "Add file"}</span>
                </Button>
              </label>
            </Inline>

            {result && "error" in result && (
              <Badge variant="destructive" style={{ whiteSpace: "normal" }}>
                {result.error}
              </Badge>
            )}

            {isMachine && plan && (
              <CardDescription style={{ whiteSpace: "normal" }}>
                Machine file — previewing exactly what it sews. Size and
                stitches come from the file; thread colors are placeholders
                (DST/EXP files don&apos;t store them).
              </CardDescription>
            )}

            {!isMachine && (
              <>
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
                  label="Filled shapes"
                  help="Fill covers each filled shape — tatami rows plus underlay, or satin where Narrow fills applies. Outline traces only the edge."
                >
                  <Select
                    value={fillMode}
                    onValueChange={(v) => setFillMode(v as "fill" | "outline")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill">Tatami fill</SelectItem>
                      <SelectItem value="outline">Outline only</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Strokes"
                  help="Satin covers strokes 1–10 mm wide with a smooth zigzag — borders and lettering. Thinner strokes always sew as a running line. The Satin sections stat below shows how many took effect."
                >
                  <Select
                    value={satinStrokes ? "satin" : "running"}
                    onValueChange={(v) => setSatinStrokes(v === "satin")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satin">Satin (1–10 mm)</SelectItem>
                      <SelectItem value="running">
                        Running stitch only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {fillMode === "fill" && (
                  <>
                    <Field
                      label="Fill angle"
                      help="Direction the fill rows run. 45° hides pull best."
                    >
                      <Select
                        value={String(fillAngle)}
                        onValueChange={(v) => setFillAngle(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILL_ANGLE_OPTIONS.map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v}°
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field
                      label="Fill density"
                      help="Row spacing. 0.4 mm is standard coverage; wider is lighter and faster."
                    >
                      <Select
                        value={String(fillSpacing)}
                        onValueChange={(v) => setFillSpacing(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FILL_SPACING_OPTIONS.map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v} mm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field
                      label="Narrow fills"
                      help="Filled shapes up to 10 mm across — bars, block letters, curved ribbons and borders — sew as satin between their own edges, tapering with the shape. Shapes that don't qualify fall back to tatami."
                    >
                      <Select
                        value={satinFills ? "satin" : "tatami"}
                        onValueChange={(v) => setSatinFills(v === "satin")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="satin">Satin (auto)</SelectItem>
                          <SelectItem value="tatami">
                            Tatami everywhere
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}
              </>
            )}

            {plan && (
              <Stack gap={8}>
                <PanelHeading>Design</PanelHeading>
                <StatRow
                  label="Stitches"
                  value={plan.stats.stitches.toLocaleString()}
                />
                <StatRow label="Jumps" value={String(plan.stats.jumps)} />
                {/* Machine formats don't mark satin, so the count would
                    always read 0 there — misleading, not informative. */}
                {!isMachine && (
                  <StatRow
                    label="Satin sections"
                    value={String(plan.stats.satinRuns)}
                  />
                )}
                <StatRow
                  label="Thread colors"
                  value={String(plan.colors.length)}
                />
                <StatRow
                  label="Size"
                  value={`${plan.stats.widthMm.toFixed(0)} × ${plan.stats.heightMm.toFixed(0)} mm`}
                />
              </Stack>
            )}

            {plan && plan.colors.length > 0 && (
              <Stack gap={4}>
                <PanelHeading>Sew order</PanelHeading>
                {plan.colors.map((color, i) => (
                  <Button
                    key={`${color}-${i}`}
                    variant="ghost"
                    aria-pressed={selectedColor === i}
                    onClick={() =>
                      setSelectedColor(selectedColor === i ? null : i)
                    }
                    style={{
                      justifyContent: "flex-start",
                      gap: 8,
                      width: "100%",
                      minHeight: 44,
                      boxShadow:
                        selectedColor === i
                          ? "0 0 0 2px var(--ring)"
                          : undefined,
                    }}
                  >
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
                  </Button>
                ))}
              </Stack>
            )}

            <Stack gap={8}>
              <Button
                disabled={!plan}
                onClick={() =>
                  result && "ok" in result && source
                    ? download(result.ok.dst, `${baseName(source.name)}.dst`)
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
                    ? download(result.ok.exp, `${baseName(source.name)}.exp`)
                    : undefined
                }
              >
                Download EXP
              </Button>
            </Stack>
          </Stack>
        </div>
      ) : (
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Show panel"
            onClick={() => setPanelOpen(true)}
          >
            ⟩ Menu
          </Button>
        </div>
      )}
    </main>
  );
}
