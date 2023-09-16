import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import EncounterDetails from "@/app/encounters/components/encounter-details";
import { getEncounterCreatures, getEncounter } from "@/app/encounters/api";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default async function Page({ params }: { params: { id: string } }) {
  const creatures = await getEncounterCreatures({
    encounter_id: parseInt(params.id),
  });
  return (
    <div>
      <EncounterDetails id={params.id} />
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
      <Link href={`/encounters/${params.id}/run`}>
        <Button variant="default">Let us do battle!</Button>
      </Link>
    </div>
  );
}
