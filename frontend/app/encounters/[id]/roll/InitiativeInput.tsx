"use client";

import { Input } from "@/components/ui/input";
import { EncounterCreature, useUpdateEncounterCreature } from "../../api";
import { Button } from "@/components/ui/button";
import React from "react";

export default function InitiativeInput({
  creature,
}: {
  creature: EncounterCreature;
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
    >
      <Input
        value={initiative}
        onChange={(e) =>
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "")
        }
        placeholder="Initiative"
        type="text"
      />
      <Button type="submit" variant="secondary">
        Update initiative
      </Button>
    </form>
  );
}
