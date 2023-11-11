"use client";

import { useUpdateEncounterParticipant } from "@/app/dashboard/encounters/[id]/hooks";
import { Input } from "@/components/ui/input";
import { EncounterParticipant } from "@/server/api/router";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export default function InitiativeInput({
  participant,
  className,
  tabIndex
}: {
  participant: EncounterParticipant;
  className?: string;
  tabIndex?: number;
}) {
  const [initiative, setInitiative] = React.useState<string | number>(
    participant.initiative
  );
  const { mutate: updateParticipant } =
    useUpdateEncounterParticipant();
  const debouncedUpdate = useDebouncedCallback((initiative: number) => {
    updateParticipant({
      ...participant,
      initiative,
    });
  }, 1000);

  return (
    <label>
      Initiative
      <Input
        type="number"
        value={initiative}
        className={className}
        tabIndex={tabIndex}
        onChange={(e) => {
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "");
          debouncedUpdate(parseInt(e.target.value));
        }}
        placeholder="Initiative"
      />
    </label>
  );
}
