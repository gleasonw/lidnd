"use client";

import EncounterCreatureAddForm from "@/app/dashboard/encounters/[id]/creature-add-form";
import {
  useEncounter,
  useEncounterCreatures,
} from "@/app/dashboard/encounters/api";
import { useEncounterId } from "@/app/dashboard/encounters/hooks";
import { getAWSimageURL } from "@/app/dashboard/encounters/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function SingleEncounter() {
  const { data: creatures } = useEncounterCreatures();
  const { data: encounter } = useEncounter();
  const id = useEncounterId();

  return (
    <div className={"flex flex-col items-center gap-10"}>
      <div className={"flex gap-20 justify-center w-full flex-wrap max-h-full"}>
        <Card
          className={
            "flex flex-col gap-5 w-full h-full overflow-y-auto max-w-xl "
          }
        >
          <CardHeader className={"text-center"}>Creatures</CardHeader>
          {creatures?.map((encounterParticipant) => (
            <div key={encounterParticipant.creature_id}>
              <div className="flex gap-5 flex-wrap items-center">
                <Image
                  src={getAWSimageURL(encounterParticipant.creature_id, "icon")}
                  alt={encounterParticipant.name}
                  width={80}
                  height={80}
                />
                {encounterParticipant.name} {encounterParticipant.max_hp}
              </div>
            </div>
          ))}
        </Card>
        <EncounterCreatureAddForm className={"w-full max-w-xl"} />
      </div>
      {encounter?.started_at ? (
        <Link href={`/encounters/${id}/run`}>
          <Button>Continue the battle!</Button>
        </Link>
      ) : (
        <Link href={`/encounters/${id}/roll`}>
          <Button>Roll initiative!</Button>
        </Link>
      )}
    </div>
  );
}
