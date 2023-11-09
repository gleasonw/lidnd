"use client";

import { useUpdateEncounterParticipant } from "@/app/dashboard/encounters/[id]/hooks";
import { Input } from "@/components/ui/input";
import { EncounterParticipant } from "@/server/api/router";
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
    useUpdateEncounterParticipant(participant);
  const debouncedUpdate = useDebouncedCallback((initiative: number) => {
    updateParticipant({
      participant_id: participant.id,
      encounter_id: participant.encounter_id,
      initiative: parseInt(initiative.toString()),
      hp: participant.hp,
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
