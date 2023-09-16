import CreatureAddForm from "@/app/encounters/[id]/CreatureAddForm";
import {
  addCreatureToEncounter,
  getEncounterCreatures,
} from "@/app/encounters/api";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
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

  return (
    <>
      {creatures.map((creature) => (
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
      <Link
        href={`/encounters/${params.id}/roll`}
        className="w-full h-24 bg-green-400 hover:bg-green-700 transition-all"
      >
        Roll initiative!
      </Link>
    </>
  );
}
