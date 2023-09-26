"use client";

import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import { useEncounterCreatures, useStartEncounter } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";

export default function RollingInitiative() {
  const { data: encounterParticipants } = useEncounterCreatures();
  const { mutate: startEncounter } = useStartEncounter();

  return (
    <div>
      {encounterParticipants?.map((participant) => (
        <div key={participant.creature_id}>
          <div className="flex gap-5 items-center">
            <CharacterIcon
              id={participant.creature_id}
              name={participant.name}
            />
            <h2>{participant.name}</h2>
            <p>{participant.max_hp}</p>
            <InitiativeInput creature={participant} />
          </div>
        </div>
      ))}
      <Button
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          startEncounter();
        }}
      >
        Let us do battle!
      </Button>
    </div>
  );
}
