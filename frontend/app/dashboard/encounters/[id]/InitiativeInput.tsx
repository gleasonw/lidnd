"use client";

import { Input } from "@/components/ui/input";
import { EncounterCreature, useUpdateEncounterCreature } from "../api";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

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
  const debouncedUpdate = useDebouncedCallback((initiative: number) => {
    updateCreature({
      ...creature,
      initiative: parseInt(initiative.toString()),
    });
  }, 500);

  return (
    <label>
      Initiative
      <Input
        type="number"
        value={initiative}
        onChange={(e) => {
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "");
          debouncedUpdate(parseInt(e.target.value));
        }}
        placeholder="Initiative"
      />
    </label>
  );
}
