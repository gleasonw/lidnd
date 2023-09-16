import CreatureAddForm from "@/app/encounters/[id]/CreatureAddForm";
import {
  addCreatureToEncounter,
  getEncounter,
  getEncounterCreatures,
} from "@/app/encounters/api";
import EncounterDetails from "@/app/encounters/components/encounter-details";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default async function Encounter({
  params,
}: {
  params: { id: string };
}) {
  const creatures = await getEncounterCreatures({
    encounter_id: parseInt(params.id),
  });
  const encounter = await getEncounter({ encounter_id: parseInt(params.id) });

  return (
    <>
      <EncounterDetails id={params.id} />
      {creatures?.map((creature) => (
        <div key={creature.id}>
          <div className="flex gap-5 flex-wrap items-center">
            <Image
              src={getGoogleDriveImageLink(creature.icon)}
              alt={creature.name}
              width={80}
              height={80}
            />
            {creature.name} {creature.max_hp}
          </div>
        </div>
      ))}
      <CreatureAddForm add={addCreatureToEncounter} />
      {encounter?.started_at ? (
        <Link href={`/encounters/${params.id}/run`}>
          <Button>Continue the battle!</Button>
        </Link>
      ) : (
        <Link href={`/encounters/${params.id}/roll`}>
          <Button>Roll initiative!</Button>
        </Link>
      )}
    </>
  );
}
