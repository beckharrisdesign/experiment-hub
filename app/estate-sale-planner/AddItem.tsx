"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Inline, Input, Stack } from "@beckharrisdesign/mvds";
import type { Destination, NewItemInput } from "../../lib/estate-sale-planner/session";
import DestinationToggle from "./DestinationToggle";

interface AddItemProps {
  onAdd: (input: NewItemInput) => void;
}

/** Add something the model missed. It gets an honest "no read" until a detail photo is re-read. */
export default function AddItem({ onAdd }: AddItemProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [destination, setDestination] = useState<Destination | undefined>(undefined);

  if (!open) {
    return (
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Add something the model missed
        </Button>
      </div>
    );
  }

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name, room, destination });
    setName("");
    setRoom("");
    setDestination(undefined);
    setOpen(false);
  };

  return (
    <Card className="ring-foreground/15">
      <CardHeader>
        <CardTitle>Add an item</CardTitle>
        <CardDescription>Name it, say where it is, and pick where it is headed. Open it afterwards to add a photo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Stack gap={16}>
          <Field label="What is it?" required>
            <Input value={name} maxLength={80} placeholder="Oak rolltop desk" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Room">
            <Input value={room} maxLength={40} placeholder="Study" onChange={(e) => setRoom(e.target.value)} />
          </Field>
          <DestinationToggle value={destination} onChange={setDestination} label="Where is it headed?" />
          <Inline gap={8}>
            <Button onClick={submit} disabled={!name.trim()}>
              Add it
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </Inline>
        </Stack>
      </CardContent>
    </Card>
  );
}
