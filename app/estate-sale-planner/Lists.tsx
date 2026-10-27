"use client";

import { useState } from "react";
import { Button, Callout, Field, Grid, Input, Stack } from "@beckharrisdesign/mvds";
import { donateList, keepList, sellList, undecided, type Destination, type NewItemInput, type Session, type SessionItem } from "../../lib/estate-sale-planner/session";
import AddItem from "./AddItem";
import ButtonGroup from "./ButtonGroup";
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
  onDetails: (details: { name: string; location: string }) => void;
}

/**
 * The sale's details, edited in place from the action row: a title and a city or ZIP (founder,
 * 2026-10-27: "a title, yes, but also a city or zipcode"). Both optional.
 */
function SaleDetails({ session, onDetails, onClose }: { session: Session; onDetails: ListsProps["onDetails"]; onClose: () => void }) {
  const [name, setName] = useState(session.name ?? "");
  const [location, setLocation] = useState(session.location ?? "");
  return (
    <Stack gap={16}>
      <Field label="Sale name">
        <Input value={name} maxLength={60} placeholder="Mom's house" autoFocus onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="City or ZIP">
        <Input value={location} maxLength={40} placeholder="Ithaca, NY or 14850" autoComplete="postal-code" onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <ButtonGroup>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => { onDetails({ name, location }); onClose(); }}>Save</Button>
      </ButtonGroup>
    </Stack>
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
 * swipe put it, and tapping a name opens the item. Every action on the sale itself — rename, add
 * an item, sort, add photos — sits in one row of primary buttons in the upper right (founder,
 * 2026-10-27: "none of this scattered everywhere stuff").
 */
export default function Lists({ session, fromFixture, onDestination, onOpen, onAdd, onStartSorting, onAddRoom, onDetails }: ListsProps) {
  const sell = sellList(session);
  const keep = keepList(session);
  const donate = donateList(session);
  const rest = undecided(session);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <Stack gap={48}>
      {fromFixture && (
        <Callout>Demo mode: no vision key is configured, so this is a sample house, not yours. Each time you add photos, the next part of the sample house comes in.</Callout>
      )}

      <Stack gap={32}>
        <Stack gap={16}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Stack gap={8} className="min-w-0">
              <h1 className="break-words text-h1 text-foreground">{session.name?.trim() || "Untitled sale"}</h1>
              <p className="text-small text-muted-foreground">
                {[session.location, `${session.items.length} ${session.items.length === 1 ? "item" : "items"}`, new Date(session.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}
              </p>
            </Stack>
            <ButtonGroup className="w-full md:mt-2 md:w-auto">
              <Button onClick={() => setEditing(true)} disabled={editing}>
                Edit details
              </Button>
              <Button onClick={() => setAdding(true)} disabled={adding}>
                Add more
              </Button>
              {rest.length > 0 && <Button onClick={onStartSorting}>Sort {rest.length} left</Button>}
              <Button onClick={onAddRoom}>Add photos</Button>
            </ButtonGroup>
          </div>
          {editing && <SaleDetails session={session} onDetails={onDetails} onClose={() => setEditing(false)} />}
          {adding && <AddItem onAdd={onAdd} onClose={() => setAdding(false)} />}
        </Stack>
        {session.items.length > 0 && <ValueTally session={session} />}
      </Stack>

      {/* An empty section gets no header (founder, 2026-10-27): "Add more" in the action row is the CTA. */}
      {sell.length > 0 && (
        <Stack gap={24}>
          <h2 className="text-h2 text-foreground">Possible sale</h2>
          <Grid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={16}>
            {sell.map((item) => (
              <ItemCard key={item.id} item={item} onDestination={onDestination} onOpen={onOpen} />
            ))}
          </Grid>
        </Stack>
      )}

      {rest.length > 0 && (
        <Stack gap={24}>
          <Stack gap={8}>
            <p className="text-caption uppercase text-muted-foreground">Still to sort</p>
            <h2 className="text-h2 text-foreground">{rest.length} {rest.length === 1 ? "item" : "items"} left</h2>
          </Stack>
          <RowList items={rest} onDestination={onDestination} onOpen={onOpen} />
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

    </Stack>
  );
}
