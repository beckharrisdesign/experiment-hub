"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Callout, Field } from "@beckharrisdesign/mvds";
import { convertSvg, type ConvertResult } from "@/lib/svg-to-stitch/convert";
import { StitchPreview } from "./StitchPreview";

interface Source {
  name: string;
  text: string;
}

const INPUT_CLASSES =
  "w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, "");
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
      return { error: e instanceof Error ? e.message : "conversion failed" };
    }
  }, [source, widthMm, stitchMm]);

  const plan = result && "ok" in result ? result.ok.plan : null;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1024px] flex-col gap-5 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">SVG to Stitch</h1>
        {source && <Badge variant="muted">{source.name}</Badge>}
        <span className="ml-auto" />
        <label className="cursor-pointer">
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
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
        <section className="flex w-full shrink-0 flex-col gap-4 md:w-[300px]">
          <h2 className="text-sm font-semibold">Settings</h2>

          <Field
            label="Design size (mm)"
            help="Larger side of the design. Check your hoop before going big."
          >
            <input
              type="number"
              min={10}
              max={400}
              step={5}
              value={widthMm}
              onChange={(e) => setWidthMm(Number(e.target.value))}
              className={INPUT_CLASSES}
            />
          </Field>

          <Field
            label="Stitch length (mm)"
            help="2.5mm is a solid default running stitch. Shorter follows curves tighter."
          >
            <input
              type="number"
              min={1}
              max={7}
              step={0.5}
              value={stitchMm}
              onChange={(e) => setStitchMm(Number(e.target.value))}
              className={INPUT_CLASSES}
            />
          </Field>

          {plan && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-border p-3 text-xs">
              <dt className="text-muted-foreground">Stitches</dt>
              <dd className="text-right font-medium">
                {plan.stats.stitches.toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">Jumps</dt>
              <dd className="text-right font-medium">{plan.stats.jumps}</dd>
              <dt className="text-muted-foreground">Thread colors</dt>
              <dd className="text-right font-medium">{plan.colors.length}</dd>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="text-right font-medium">
                {plan.stats.widthMm.toFixed(0)} ×{" "}
                {plan.stats.heightMm.toFixed(0)} mm
              </dd>
            </dl>
          )}

          {plan && plan.colors.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Sew order
              </h3>
              <ol className="flex flex-col gap-1 text-xs">
                {plan.colors.map((color, i) => (
                  <li key={`${color}-${i}`} className="flex items-center gap-2">
                    <span className="w-4 text-muted-foreground">{i + 1}.</span>
                    <span
                      className="inline-block h-3 w-3 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="font-mono">{color}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <Button
              onClick={() =>
                result && "ok" in result && source
                  ? download(result.ok.dst, `${baseName(source.name)}.dst`)
                  : undefined
              }
              disabled={!plan}
            >
              Download DST
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                result && "ok" in result && source
                  ? download(result.ok.exp, `${baseName(source.name)}.exp`)
                  : undefined
              }
              disabled={!plan}
            >
              Download EXP
            </Button>
            <Callout className="text-xs">
              Wilcom&apos;s EMB format is proprietary with no public spec, so no
              converter can write it directly. DST is the universal machine
              format. EXP covers Melco. Both open in Wilcom and Hatch, which can
              save EMB from there.
            </Callout>
          </div>
        </section>

        <section className="flex min-h-[320px] flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Stitch preview</h2>
            {result && "error" in result && (
              <Badge variant="destructive">{result.error}</Badge>
            )}
            <span className="ml-auto" />
            {plan && (
              <span className="text-[10px] text-muted-foreground">
                dashed = jump · outlines only, fills stitch as outlines
              </span>
            )}
          </div>
          <div
            className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border ${
              dragOver ? "border-primary" : "border-border"
            } bg-background`}
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
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                Drop an SVG here (or use Add SVG) to see its stitch path.
                Everything runs in your browser. Nothing is uploaded.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
