"use client";

import { useState } from "react";
import { Button, Callout, Grid, Inline, Input, Stack } from "@beckharrisdesign/mvds";
import { donateList, keepList, sellList, undecided, type Destination, type NewItemInput, type Session, type SessionItem } from "../../lib/estate-sale-planner/session";
import AddItem from "./AddItem";
import ItemCard, { ItemRow } from "./ItemCard";
import ValueTally from "./ValueTally";

interface ListsProps {
  session: Session;
  fromFixture: boolean;
  onDestination: (itemId: string, to: Destination) => void;
  onOpen: (itemId: string) => void;
  onAdd: (input: NewItemInput) => void;
  onStartSorting: () => void;
  onAddRoom: () => void;
  onRename: (name: string) => void;
}

/** The sale's name is the page title (same treatment as every page), editable in place: Rename, type, Save. */
function SaleName({ name, onRename }: { name?: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  if (editing) {
    return (
      <Inline gap={8} align="center" className="flex-wrap">
        <Input value={draft} maxLength={60} placeholder="Mom's house" aria-label="Sale name" onChange={(e) => setDraft(e.target.value)} />
        <Button size="sm" onClick={() => { onRename(draft); setEditing(false); }}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setDraft(name ?? ""); setEditing(false); }}>
          Cancel
        </Button>
      </Inline>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4">
      <h1 className="min-w-0 break-words text-h1 text-foreground">{name?.trim() || "Untitled sale"}</h1>
      <Button size="sm" variant="secondary" className="mt-2 shrink-0" onClick={() => { setDraft(name ?? ""); setEditing(true); }}>
        Rename
      </Button>
    </div>
  );
}

function RowList({ items, onDestination, onOpen }: { items: SessionItem[]; onDestination: ListsProps["onDestination"]; onOpen: ListsProps["onOpen"] }) {
  return (
    <Stack gap={16}>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onDestination={onDestination} onOpen={onOpen} />
        ))}
      </ul>
    </Stack>
  );
}

/**
 * Items (round 05a; was Lists) — the sale by destination. Sell items are full cards; Keep,
 * Donate and the still-to-sort pile are rows. Every item carries its own
 * sell / donate / keep toggle, so nothing is ever stuck where the model or a
 * swipe put it, and tapping a name opens the item.
 */
export default function Lists({ session, fromFixture, onDestination, onOpen, onAdd, onStartSorting, onAddRoom, onRename }: ListsProps) {
  const sell = sellList(session);
  const keep = keepList(session);
  const donate = donateList(session);
  const rest = undecided(session);

  return (
    <Stack gap={48}>
      {fromFixture && (
        <Callout>Demo mode: no vision key is configured, so this is a sample house, not yours. Each time you add photos, the next part of the sample house comes in.</Callout>
      )}

      <Stack gap={32}>
        <Stack gap={16}>
          <Stack gap={8}>
            <SaleName name={session.name} onRename={onRename} />
            <p className="text-small text-muted-foreground">
              {session.items.length} {session.items.length === 1 ? "item" : "items"} · {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </Stack>
          <div>
            <Button variant="outline" onClick={onAddRoom}>
              Add more photos
            </Button>
          </div>
        </Stack>
        <ValueTally session={session} />
      </Stack>

      <Stack gap={24}>
        <h2 className="text-h2 text-foreground">Possible sale</h2>
        {sell.length === 0 ? (
          <p className="text-body-lg text-muted-foreground">
            Nothing is marked to sell. Toggle any item below, or add one the model missed.
          </p>
        ) : (
          <Grid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={16}>
            {sell.map((item) => (
              <ItemCard key={item.id} item={item} onDestination={onDestination} onOpen={onOpen} />
            ))}
          </Grid>
        )}
      </Stack>

      {rest.length > 0 && (
        <Stack gap={24}>
          <Stack gap={8}>
            <p className="text-caption uppercase text-muted-foreground">Still to sort</p>
            <h2 className="text-h2 text-foreground">{rest.length} {rest.length === 1 ? "item" : "items"} left</h2>
          </Stack>
          <RowList items={rest} onDestination={onDestination} onOpen={onOpen} />
          <div className="flex justify-center">
            <Button size="lg" onClick={onStartSorting}>
              Sort the rest, one at a time
            </Button>
          </div>
        </Stack>
      )}

      {donate.length > 0 && (
        <Stack gap={24}>
          <h2 className="text-h2 text-foreground">Possible donation</h2>
          <RowList items={donate} onDestination={onDestination} onOpen={onOpen} />
        </Stack>
      )}

      {keep.length > 0 && (
        <Stack gap={24}>
          <h2 className="text-h2 text-foreground">Possible keep</h2>
          <RowList items={keep} onDestination={onDestination} onOpen={onOpen} />
        </Stack>
      )}

      <AddItem onAdd={onAdd} />
    </Stack>
  );
}
