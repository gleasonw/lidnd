"use client";

import CreatureAddForm from "@/app/encounters/[id]/creature-add-form";
import { useEncounter, useEncounterCreatures } from "@/app/encounters/api";
import { useEncounterId } from "@/app/encounters/hooks";
import { getAWSimageURL } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function SingleEncounter() {
  const { data: creatures } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const id = useEncounterId();

  return (
    <>
      {creatures?.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 flex-wrap items-center">
            <Image
              src={getAWSimageURL(creature.id, "icon")}
              alt={creature.name}
              width={80}
              height={80}
            />
            {creature.name} {creature.max_hp}
          </div>
        </div>
      ))}
      <CreatureAddForm />
      {encounter?.started_at ? (
        <Link href={`/encounters/${id}/run`}>
          <Button>Continue the battle!</Button>
        </Link>
      ) : (
        <Link href={`/encounters/${id}/roll`}>
          <Button>Roll initiative!</Button>
        </Link>
      )}
    </>
  );
}
