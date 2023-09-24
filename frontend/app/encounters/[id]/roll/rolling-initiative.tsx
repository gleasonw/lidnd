"use client";

import { CharacterIcon } from "@/app/encounters/[id]/character-icon";
import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import { useEncounterCreatures, useStartEncounter } from "@/app/encounters/api";
import { Button } from "@/components/ui/button";

export default function RollingInitiative() {
  const { data: creatures } = useEncounterCreatures();
  const { mutate: startEncounter } = useStartEncounter();

  return (
    <div>
      {creatures?.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 items-center">
            <CharacterIcon id={creature.id} name={creature.name} />
            <h2>{creature.name}</h2>
            <p>{creature.max_hp}</p>
            <InitiativeInput creature={creature} />
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
