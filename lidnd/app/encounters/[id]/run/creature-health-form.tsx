"use client";

import { useUpdateEncounterParticipant } from "@/app/encounters/[id]/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EncounterParticipant } from "@/server/api/router";
import { useState } from "react";

export function ParticipantHealthForm({
  participant,
}: {
  participant: EncounterParticipant;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { mutate: edit, isLoading } = useUpdateEncounterParticipant();

  if (participant.minion_count) {
    return <MinionHealthForm participant={participant} />;
  }

  function handleHPChange(hp: number) {
    edit({
      ...participant,
      hp,
    });
  }

  return (
    <div className="flex gap-4">
      <Button
        disabled={isLoading}
        variant="default"
        className={"bg-rose-800"}
        onClick={(e) => {
          e.stopPropagation();
          handleHPChange(
            typeof hpDiff === "number"
              ? participant.hp - hpDiff
              : participant.hp
          );
        }}
      >
        Damage
      </Button>

      <Button
        disabled={isLoading}
        variant="default"
        className={"bg-lime-800"}
        onClick={(e) => {
          e.stopPropagation();
          handleHPChange(
            typeof hpDiff === "number"
              ? participant.hp + hpDiff
              : participant.hp
          );
        }}
      >
        Heal
      </Button>
      <Input
        placeholder="HP"
        type="number"
        className="w-24"
        value={hpDiff}
        onChange={(e) => {
          if (!isNaN(parseInt(e.target.value))) {
            setHpDiff(parseInt(e.target.value));
          } else {
            setHpDiff("");
          }
        }}
      />
    </div>
  );
}

export interface MinionHealthFormProps {
  participant: EncounterParticipant;
}

export function MinionHealthForm({ participant }: MinionHealthFormProps) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { mutate: edit, isLoading } = useUpdateEncounterParticipant();

  function handleHPChange(hp: number) {
    edit({
      ...participant,
      hp,
    });
  }

  //TODO: overkill range, add minion overkill handling server-side

  return (
    <div className="flex gap-4">
      <Button
        disabled={isLoading}
        variant="default"
        className={"bg-rose-800"}
        onClick={(e) => {
          e.stopPropagation();
          handleHPChange(
            typeof hpDiff === "number"
              ? participant.hp - hpDiff
              : participant.hp
          );
        }}
      >
        Damage
      </Button>
      <Input
        placeholder="HP"
        type="number"
        className="w-24"
        value={hpDiff}
        onChange={(e) => {
          if (!isNaN(parseInt(e.target.value))) {
            setHpDiff(parseInt(e.target.value));
          } else {
            setHpDiff("");
          }
        }}
      />
    </div>
  );
}
