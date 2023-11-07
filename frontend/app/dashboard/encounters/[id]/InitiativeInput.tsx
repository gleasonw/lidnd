"use client";

import { Input } from "@/components/ui/input";
import { EncounterParticipant } from "@/server/api/router";
import { api } from "@/trpc/react";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export default function InitiativeInput({
  participant,
  className,
}: {
  participant: EncounterParticipant;
  className?: string;
}) {
  const [initiative, setInitiative] = React.useState<string | number>(
    participant.initiative
  );
  const { mutate: updateParticipant } =
    api.updateEncounterParticipant.useMutation();
  const debouncedUpdate = useDebouncedCallback((initiative: number) => {
    updateParticipant({
      ...participant,
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
