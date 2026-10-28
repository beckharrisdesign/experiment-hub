"use client";

import { Button, Callout, Stack } from "@beckharrisdesign/mvds";
import type { PendingPass } from "./(app)/store";
import ButtonGroup from "./ButtonGroup";
import { ItemPlaceholders, Spinner } from "./Loading";

interface PendingPassesProps {
  passes: PendingPass[];
  onRetry: (passId: string) => void;
  onDismiss: (passId: string) => void;
}

const photos = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;

/**
 * Photos the model is still reading, shown where their items will land (founder, 2026-10-27:
 * "let us either watch them get processed or move around to manage other things"). Nothing here
 * blocks: the family can sort, open items or leave, and the items arrive when the pass does.
 */
export default function PendingPasses({ passes, onRetry, onDismiss }: PendingPassesProps) {
  if (passes.length === 0) return null;
  return (
    <Stack gap={16}>
      {passes.map((p) =>
        p.error ? (
          <Callout key={p.id}>
            <Stack gap={16}>
              <span>
                {photos(p.previews.length)} didn&apos;t come back: {p.error}
              </span>
              <Thumbs previews={p.previews} />
              <ButtonGroup>
                <Button variant="secondary" size="sm" onClick={() => onDismiss(p.id)}>
                  Leave them out
                </Button>
                <Button size="sm" onClick={() => onRetry(p.id)}>
                  Try again
                </Button>
              </ButtonGroup>
            </Stack>
          </Callout>
        ) : (
          <section key={p.id} role="status" aria-live="polite" aria-label={`Finding items in ${photos(p.previews.length)}`}>
            <Stack gap={8}>
              <p className="flex items-center gap-2 text-body text-foreground">
                <Spinner />
                Reading {photos(p.previews.length)}…
              </p>
              <Thumbs previews={p.previews} reading />
              <p className="text-small text-muted-foreground">Items show up here as they&apos;re found. Keep sorting, or go anywhere — nothing is lost.</p>
              {/* Room for what's coming, so the list doesn't jump when the items land (2026-10-28). */}
              <ItemPlaceholders rows={Math.min(3, p.previews.length)} />
            </Stack>
          </section>
        ),
      )}
    </Stack>
  );
}

function Thumbs({ previews, reading = false }: { previews: string[]; reading?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {previews.map((src, i) => (
        <li key={i} className="relative size-16 overflow-hidden rounded-md ring-1 ring-foreground/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="size-full object-cover" />
          {reading && <span className="absolute inset-0 animate-pulse bg-background/40 motion-reduce:animate-none" aria-hidden />}
        </li>
      ))}
    </ul>
  );
}
