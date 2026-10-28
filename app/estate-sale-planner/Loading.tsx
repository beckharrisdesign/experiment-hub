import { Stack } from "@beckharrisdesign/mvds";

/**
 * A placeholder while something on its way has no content yet (founder, 2026-10-28: "add in
 * indicators that the items are loading"): a screen reading the device, or items a photo pass
 * hasn't returned. Rows echo an item row (thumb, name, value) so the page doesn't jump when the
 * real ones land. A polite status for screen readers; the shimmer stops for reduced motion.
 */
export function ItemPlaceholders({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          data-testid="item-placeholder"
          className="flex items-center gap-4 py-4"
        >
          <span className="size-11 shrink-0 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <span
            className="h-4 flex-1 animate-pulse rounded bg-muted motion-reduce:animate-none"
            style={{ maxWidth: `${70 - i * 12}%` }}
          />
          <span className="h-4 w-16 shrink-0 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </li>
      ))}
    </ul>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary motion-reduce:animate-none"
    />
  );
}

export default function Loading({
  label,
  rows = 3,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div role="status" aria-live="polite">
      <Stack gap={24}>
        <span className="flex items-center gap-2 text-small text-muted-foreground">
          <Spinner />
          {label}
        </span>
        <span
          aria-hidden
          className="block h-8 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none"
        />
        <ItemPlaceholders rows={rows} />
      </Stack>
    </div>
  );
}
