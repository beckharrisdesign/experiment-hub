"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  EXPORT_FILENAME,
  FILTER_PRESETS,
  type BannerOverlay,
  type FilterPreset,
} from "@/lib/constants";
import { downloadCanvasPng, paintComposite } from "@/lib/composite";
import {
  decodeImageFile,
  isOversized,
  oversizeMessage,
} from "@/lib/ingest";

export default function PhotoStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [filter, setFilter] = useState<FilterPreset>("normal");
  const [headerBanner, setHeaderBanner] = useState(false);
  const [footerBanner, setFooterBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const photoSectionId = useId();
  const filterSectionId = useId();
  const bannerSectionId = useId();

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const banners: BannerOverlay[] = [
      ...(headerBanner ? (["header"] as const) : []),
      ...(footerBanner ? (["footer"] as const) : []),
    ];
    paintComposite(canvas, source, filter, banners);
  }, [source, filter, headerBanner, footerBanner]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setWarning(null);
    setBusy(true);
    try {
      const img = await decodeImageFile(file);
      if (isOversized(img.naturalWidth, img.naturalHeight)) {
        setWarning(oversizeMessage(img.naturalWidth, img.naturalHeight));
      }
      setSource(img);
    } catch (err) {
      setSource(null);
      setError(err instanceof Error ? err.message : "Could not load image.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    downloadCanvasPng(canvas, EXPORT_FILENAME);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-4 p-4 lg:flex-row lg:gap-8 lg:p-8 lg:px-16">
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:max-w-[340px]">
        <header>
          <h1 className="text-2xl font-semibold text-[#c9d1d9]">
            Photo banner studio
          </h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Upload, filter, add a banner, download PNG.
          </p>
        </header>

        {(error || warning) && (
          <div
            role={error ? "alert" : "status"}
            className={`rounded-md border px-3 py-2 text-sm ${
              error
                ? "border-[#f85149] bg-[#f851491a] text-[#f85149]"
                : "border-[#d29922] bg-[#d299221a] text-[#d29922]"
            }`}
          >
            {error ?? warning}
          </div>
        )}

        <fieldset className="flex flex-col gap-3" aria-labelledby={photoSectionId}>
          <legend id={photoSectionId} className="text-xs font-semibold text-[#c9d1d9]">
            1 · Photo
          </legend>
          <input
            id="photo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileChange}
            disabled={busy}
          />
          <label
            htmlFor="photo-file"
            className="inline-flex w-fit cursor-pointer items-center justify-center rounded-md border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm font-medium text-[#c9d1d9] transition hover:border-[#58a6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff]"
          >
            {busy ? "Loading…" : "Choose photo"}
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3" aria-labelledby={filterSectionId}>
          <legend id={filterSectionId} className="text-xs font-semibold text-[#c9d1d9]">
            2 · Filters
          </legend>
          <div role="radiogroup" aria-label="Filter presets" className="flex flex-wrap gap-2">
            {FILTER_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#58a6ff] ${
                  filter === preset.id
                    ? "border-[#58a6ff] bg-[#58a6ff1a] text-[#c9d1d9]"
                    : "border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#58a6ff]"
                }`}
              >
                <input
                  type="radio"
                  name="filter-preset"
                  value={preset.id}
                  checked={filter === preset.id}
                  onChange={() => setFilter(preset.id)}
                  className="sr-only"
                />
                {preset.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-[#6e7681]">
            Normal · Slate · Mono pop · High contrast
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3" aria-labelledby={bannerSectionId}>
          <legend id={bannerSectionId} className="text-xs font-semibold text-[#c9d1d9]">
            3 · Banners
          </legend>
          <div className="flex flex-wrap gap-2">
            <BannerToggle label="Header band" checked={headerBanner} onChange={setHeaderBanner} />
            <BannerToggle label="Footer ribbon" checked={footerBanner} onChange={setFooterBanner} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-semibold text-[#c9d1d9]">4 · Export</legend>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!source}
            className="inline-flex w-fit items-center justify-center rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-medium text-[#0d1117] transition hover:bg-[#79c0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PNG
          </button>
          <p className="text-xs text-[#6e7681]">
            Exports up to 2048px longest edge smoothly on typical laptops.
          </p>
        </fieldset>
      </aside>

      <section
        aria-label="Live preview"
        className="flex min-h-[280px] flex-1 flex-col gap-4 rounded-lg border border-[#30363d] bg-[#161b22] p-6"
      >
        <h2 className="text-center text-xs font-semibold text-[#c9d1d9]">Live preview</h2>
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-md border border-[#30363d] bg-[#21262d] p-4">
          {source ? (
            <canvas
              ref={canvasRef}
              className="max-h-[min(60vh,656px)] max-w-full object-contain"
              role="img"
              aria-label="Composited photo preview"
            />
          ) : (
            <p className="max-w-xs text-center text-xs text-[#6e7681]">
              Composite appears here (photo + filter + banner)
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function BannerToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#58a6ff] ${
        checked
          ? "border-[#58a6ff] bg-[#58a6ff1a] text-[#c9d1d9]"
          : "border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#58a6ff]"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
