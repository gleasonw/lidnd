"use client";

import { useUpdateEncounterParticipant } from "./hooks";
import { Input } from "@/components/ui/input";
import type { Participant } from "@/server/api/router";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

export default function InitiativeInput({
  participant,
  className,
  tabIndex,
  inputProps,
}: {
  participant: Participant;
  className?: string;
  tabIndex?: number;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const [initiative, setInitiative] = React.useState<string | number>(
    participant.initiative
  );
  const { mutate: updateParticipant } = useUpdateEncounterParticipant();
  const debouncedUpdate = useDebouncedCallback((initiative: number) => {
    updateParticipant({
      ...participant,
      initiative,
    });
  }, 1000);

  return (
    <label className={className}>
      <Input
        type="number"
        value={initiative}
        className="w-16"
        aria-label="Initiative"
        tabIndex={tabIndex}
        onChange={(e) => {
          setInitiative(!isNaN(parseInt(e.target.value)) ? e.target.value : "");
          debouncedUpdate(parseInt(e.target.value));
        }}
        placeholder="Initiative"
        {...inputProps}
      />
    </label>
  );
}
