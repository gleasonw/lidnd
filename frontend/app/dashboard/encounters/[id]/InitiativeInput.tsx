"use client";

import { Input } from "@/components/ui/input";
import { EncounterCreature, useUpdateEncounterCreature } from "../api";
import { Button } from "@/components/ui/button";
import React from "react";

export default function InitiativeInput({
  creature,
  className,
}: {
  creature: EncounterCreature;
  className?: string;
}) {
  const [initiative, setInitiative] = React.useState<string | number>(
    creature.initiative
  );
  const { mutate: updateCreature } = useUpdateEncounterCreature();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateCreature({
          ...creature,
          initiative: parseInt(initiative.toString()),
        });
      }}
      className={className}
    >
      <Input
        type="number"
        value={initiative}
        onChange={(e) =>
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "")
        }
        placeholder="Initiative"
      />
      <Button type="submit" variant="outline">
        Update initiative
      </Button>
    </form>
  );
}
