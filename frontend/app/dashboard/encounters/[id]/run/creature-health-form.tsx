"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EncounterParticipant } from "@/server/api/router";
import { api } from "@/trpc/react";
import { useState } from "react";

export function ParticipantHealthForm({
  participant,
}: {
  participant: EncounterParticipant;
}) {
  const [hpDiff, setHpDiff] = useState<string | number>("");
  const { encounterById } = api.useUtils();
  const { mutate: edit, isLoading } =
    api.updateEncounterParticipant.useMutation({
      onSettled: async () => {
        return await encounterById.invalidate(participant.encounter_id);
      },
      onMutate: async (newParticipant) => {
        await encounterById.cancel(participant.encounter_id);
        const previousEncounter = encounterById.getData(
          participant.encounter_id
        );
        encounterById.setData(participant.encounter_id, (old) => {
          if (!old) return old;
          return {
            ...old,
            participants: old?.participants.map((p) =>
              p.id === newParticipant.participant_id
                ? { ...p, hp: newParticipant.hp }
                : p
            ),
          };
        });
        return { previousEncounter };
      },
    });

  function handleHPChange(hp: number) {
    edit({
      participant_id: participant.id,
      encounter_id: participant.encounter_id,
      initiative: participant.initiative,
      hp,
    });
  }

  return (
    <div className="flex gap-4">
      <Input
        placeholder="Modify HP"
        type="number"
        value={hpDiff}
        onChange={(e) => {
          if (!isNaN(parseInt(e.target.value))) {
            setHpDiff(parseInt(e.target.value));
          } else {
            setHpDiff("");
          }
        }}
      />
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
    </div>
  );
}
