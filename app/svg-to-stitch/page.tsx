"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Badge,
  Button,
  CardDescription,
  Inline,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spacer,
  Stack,
  Switch,
} from "@beckharrisdesign/mvds";
import { convertSvg, type ConvertResult } from "@/lib/svg-to-stitch/convert";
import { readMachineFile } from "@/lib/svg-to-stitch/read";
import StitchPreview from "./StitchPreview";
import SewOrder from "./SewOrder";

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

// Fabric swatches the stitches preview on. Black is the most common thread
// color there is — on the app's near-black canvas a black-thread design is
// invisible, so Auto picks whichever swatch contrasts with the file.
const FABRIC_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "#1a1a1c", label: "Charcoal" },
  { value: "#ebe2d0", label: "Natural" },
  { value: "#f7f5f0", label: "White" },
];
const DARK_FABRIC = "#1a1a1c";
const LIGHT_FABRIC = "#ebe2d0";

function threadLuminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 1;
  return (
    (0.2126 * parseInt(m[1], 16) +
      0.7152 * parseInt(m[2], 16) +
      0.0722 * parseInt(m[3], 16)) /
    255
  );
}
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

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = `switch-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Inline gap={8} align="center" style={{ minHeight: 32 }}>
      <Label htmlFor={id}>{label}</Label>
      <Spacer />
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Inline>
  );
}

// One-row select fields — label left, control right — per the founder's
// dropdown pattern in the stitch-brushes design (Figma 02.1 Proposed).
function SelectRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Inline gap={8} align="center" style={{ minHeight: 32 }}>
      <Label>{label}</Label>
      <Spacer />
      {children}
    </Inline>
  );
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
  const [fabric, setFabric] = useState("auto");
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

  // Auto fabric: if the design's typical thread is dark, preview on light
  // fabric, and vice versa — so black-thread line art is never invisible.
  const effectiveFabric = useMemo(() => {
    if (fabric !== "auto") return fabric;
    if (!plan || plan.colors.length === 0) return undefined;
    const lums = plan.colors.map(threadLuminance).sort((a, b) => a - b);
    const median = lums[Math.floor(lums.length / 2)];
    return median < 0.35 ? LIGHT_FABRIC : DARK_FABRIC;
  }, [fabric, plan]);

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
            fabric={effectiveFabric}
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
                Machine file — thread colors are placeholders.
              </CardDescription>
            )}

            {/* Document settings first — what am I making — then the
                stitch toggles. Order follows the founder's 02.1 layout. */}
            {!isMachine && (
              <SelectRow label="Design size">
                <Select
                  value={String(widthMm)}
                  onValueChange={(v) => setWidthMm(Number(v))}
                >
                  <SelectTrigger style={{ width: "auto" }}>
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
              </SelectRow>
            )}

            {plan && (
              <SelectRow label="Fabric">
                <Select value={fabric} onValueChange={setFabric}>
                  <SelectTrigger style={{ width: "auto", minWidth: 110 }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FABRIC_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectRow>
            )}

            {!isMachine && (
              <>
                {/* Everything stays visible — controls read as on/off. */}
                <SwitchRow
                  label="Fill shapes"
                  checked={fillMode === "fill"}
                  onChange={(on) => setFillMode(on ? "fill" : "outline")}
                />
                <SwitchRow
                  label="Satin narrow fills"
                  checked={satinFills}
                  onChange={setSatinFills}
                />
                <SwitchRow
                  label="Satin strokes (min 0.5 mm)"
                  checked={satinStrokes}
                  onChange={setSatinStrokes}
                />
              </>
            )}

            {plan && plan.colors.length > 0 && (
              <Stack gap={4}>
                <PanelHeading>Sew order</PanelHeading>
                <SewOrder
                  plan={plan}
                  selectedColor={selectedColor}
                  onSelectColor={setSelectedColor}
                />
              </Stack>
            )}

            {plan && (
              <Stack gap={8}>
                <PanelHeading>Design</PanelHeading>
                <StatRow
                  label="Stitches"
                  value={plan.stats.stitches.toLocaleString()}
                />
                <StatRow label="Jumps" value={String(plan.stats.jumps)} />
                {/* Machine formats don't mark satin or brushes, so those
                    counts would always read 0 there — misleading, not
                    informative. */}
                {!isMachine && (
                  <StatRow
                    label="Satin sections"
                    value={String(plan.stats.satinRuns)}
                  />
                )}
                {!isMachine && (
                  <StatRow
                    label="Brush runs"
                    value={String(plan.stats.brushRuns)}
                  />
                )}
                <StatRow
                  label="Thread colors"
                  value={String(plan.colors.length)}
                />
              </Stack>
            )}

            {!isMachine && (
              <>
                <SelectRow label="Fill angle">
                  <Select
                    value={String(fillAngle)}
                    onValueChange={(v) => setFillAngle(Number(v))}
                  >
                    <SelectTrigger style={{ width: "auto" }}>
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
                </SelectRow>

                <SelectRow label="Fill density">
                  <Select
                    value={String(fillSpacing)}
                    onValueChange={(v) => setFillSpacing(Number(v))}
                  >
                    <SelectTrigger style={{ width: "auto" }}>
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
                </SelectRow>
              </>
            )}

            {plan && (
              <StatRow
                label="Size"
                value={`${plan.stats.widthMm.toFixed(0)} × ${plan.stats.heightMm.toFixed(0)} mm`}
              />
            )}

            {/* Export last — Design size moved up with the document
                settings per the founder's 02.1 layout. */}
            <Stack gap={8}>
              <PanelHeading>Export</PanelHeading>
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
