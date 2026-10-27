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
    onAdd({ name, destination });
    setName("");
    setDestination(undefined);
    setOpen(false);
  };

  return (
    <Card className="ring-foreground/15">
      <CardHeader>
        <CardTitle>Add an item</CardTitle>
        <CardDescription>Name it and pick where it's headed.</CardDescription>
      </CardHeader>
      <CardContent>
        <Stack gap={16}>
          <Field label="What is it?" required>
            <Input value={name} maxLength={80} placeholder="Oak rolltop desk" onChange={(e) => setName(e.target.value)} />
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
