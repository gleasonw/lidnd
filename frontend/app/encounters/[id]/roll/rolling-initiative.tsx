"use client";

import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import { useEncounterCreatures, useStartEncounter } from "@/app/encounters/api";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function RollingInitiative() {
  const { data: creatures } = useEncounterCreatures();
  const { mutate: startEncounter } = useStartEncounter();

  return (
    <div>
      {creatures?.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 items-center">
            <Image
              src={getGoogleDriveImageLink(creature.icon)}
              alt={creature.name}
              width={80}
              height={80}
            />
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
