"use client";

import { useState } from "react";
import { Button, Callout, Grid, Inline, Input, Stack } from "@beckharrisdesign/mvds";
import { byRoom, donateList, keepList, sellList, undecided, type Destination, type NewItemInput, type Session, type SessionItem } from "../../lib/estate-sale-planner/session";
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

/** The sale's name, editable in place: tap Rename, type, Save. */
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
    <Inline gap={8} align="center">
      <span className="text-caption uppercase text-muted-foreground">{name?.trim() || "Untitled sale"}</span>
      <Button size="sm" variant="ghost" onClick={() => { setDraft(name ?? ""); setEditing(true); }}>
        Rename
      </Button>
    </Inline>
  );
}

function RowList({ items, onDestination, onOpen }: { items: SessionItem[]; onDestination: ListsProps["onDestination"]; onOpen: ListsProps["onOpen"] }) {
  return (
    <Stack gap={16}>
      {byRoom(items).map(({ room, items }) => (
        <Stack key={room} gap={4}>
          <h3 className="text-caption uppercase text-muted-foreground">{room}</h3>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} onDestination={onDestination} onOpen={onOpen} />
            ))}
          </ul>
        </Stack>
      ))}
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
    <Stack gap={40}>
      {fromFixture && (
        <Callout>Demo mode: no vision key is configured, so this is a sample house, not yours. Each room you add brings in the next sample room.</Callout>
      )}

      <Stack gap={16}>
        <Stack gap={8}>
          <SaleName name={session.name} onRename={onRename} />
          <p className="text-small text-muted-foreground">
            {session.items.length} {session.items.length === 1 ? "item" : "items"} across {session.passes ?? 1} {(session.passes ?? 1) === 1 ? "room pass" : "room passes"} · {new Date(session.createdAt).toLocaleDateString()}
          </p>
          <div>
            <Button variant="outline" onClick={onAddRoom}>
              Photograph another room
            </Button>
          </div>
        </Stack>
        <ValueTally session={session} />
        <Stack gap={4}>
          <p className="text-caption uppercase text-muted-foreground">Sell</p>
          <h1 className="text-h2 text-foreground">Might be worth something</h1>
        </Stack>
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
        <Stack gap={16}>
          <Stack gap={4}>
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
        <Stack gap={16}>
          <Stack gap={4}>
            <p className="text-caption uppercase text-muted-foreground">Donate</p>
            <h2 className="text-h2 text-foreground">Going to a good home</h2>
          </Stack>
          <RowList items={donate} onDestination={onDestination} onOpen={onOpen} />
        </Stack>
      )}

      {keep.length > 0 && (
        <Stack gap={16}>
          <Stack gap={4}>
            <p className="text-caption uppercase text-muted-foreground">Keep</p>
            <h2 className="text-h2 text-foreground">Staying with the family</h2>
          </Stack>
          <RowList items={keep} onDestination={onDestination} onOpen={onOpen} />
        </Stack>
      )}

      <AddItem onAdd={onAdd} />
    </Stack>
  );
}
