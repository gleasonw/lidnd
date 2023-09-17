import InitiativeInput from "@/app/encounters/[id]/roll/InitiativeInput";
import { getEncounterCreatures, startEncounter } from "@/app/encounters/api";
import { getGoogleDriveImageLink } from "@/app/encounters/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
  const creatures = await getEncounterCreatures({
    encounter_id: parseInt(params.id),
  });

  async function begin() {
    "use server";
    await startEncounter({ encounter_id: parseInt(params.id) });
    redirect(`/encounters/${params.id}/run`);
  }

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
      <form action={begin}>
        <Button variant="default" type="submit">
          Let us do battle!
        </Button>
      </form>
    </div>
  );
}
