"use client";

import {
  useUpdateEncounterMinionParticipant,
  useUpdateEncounterParticipant,
} from "@/app/encounters/[id]/hooks";
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

  if (isMinion(participant)) {
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

function isMinion(participant: EncounterParticipant): participant is Minion {
  if (participant.minion_count) {
    return true;
  }
  return false;
}

export type Minion = EncounterParticipant & { minion_count: number };

export interface MinionHealthFormProps {
  participant: Minion;
}

export function MinionHealthForm({ participant }: MinionHealthFormProps) {
  const [damage, setHpDiff] = useState<string | number>("");
  const { mutate: edit, isLoading } = useUpdateEncounterMinionParticipant();

  function handleHPChange(incomingDamage: number) {
    edit({
      ...participant,
      damage: incomingDamage,
      minions_in_overkill_range: 5,
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
            typeof damage === "number" ? damage : parseInt(damage)
          );
        }}
      >
        Damage
      </Button>
      <Input
        placeholder="HP"
        type="number"
        className="w-24"
        value={damage}
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
