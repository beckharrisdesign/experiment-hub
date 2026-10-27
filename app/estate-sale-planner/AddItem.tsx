"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Stack } from "@beckharrisdesign/mvds";
import type { Destination, NewItemInput } from "../../lib/estate-sale-planner/session";
import ButtonGroup from "./ButtonGroup";
import DestinationToggle from "./DestinationToggle";

interface AddItemProps {
  onAdd: (input: NewItemInput) => void;
  onClose: () => void;
}

/**
 * Add something the model missed. It gets an honest "no read" until a photo is read. Opened from
 * the sale's action row (founder, 2026-10-27: every sale action in the upper right), so it has
 * no trigger of its own.
 */
export default function AddItem({ onAdd, onClose }: AddItemProps) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState<Destination | undefined>(undefined);

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name, destination });
    onClose();
  };

  return (
    <Card className="ring-foreground/15">
      <CardHeader>
        <CardTitle>Add an item</CardTitle>
        <CardDescription>Name it and pick where it&apos;s headed.</CardDescription>
      </CardHeader>
      <CardContent>
        <Stack gap={24}>
          <Field label="What is it?" required>
            <Input value={name} maxLength={80} placeholder="Oak rolltop desk" onChange={(e) => setName(e.target.value)} />
          </Field>
          <DestinationToggle value={destination} onChange={setDestination} label="Where is it headed?" />
          <ButtonGroup>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              Add it
            </Button>
          </ButtonGroup>
        </Stack>
      </CardContent>
    </Card>
  );
}
